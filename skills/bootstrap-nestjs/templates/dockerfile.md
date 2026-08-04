# Dockerfile Template

Generate a multi-stage `Dockerfile` at the project root. Adapt based on the project's dependency choices.

---

```dockerfile
# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:24-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./
# If using Prisma, also copy prisma schema
# COPY prisma ./prisma/

# Install production dependencies only
RUN npm ci --only=production && cp -R node_modules /prod_node_modules

# Install all dependencies (including dev)
RUN npm ci

# ============================================
# Stage 2: Build
# ============================================
FROM node:24-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# If using Prisma, generate client
# RUN npx prisma generate

RUN npm run build

# ============================================
# Stage 3: Production
# ============================================
FROM node:24-alpine AS production

# Security: run as non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copy production dependencies and built app
COPY --from=deps /prod_node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

# If using Prisma, copy generated client
# COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
# COPY --from=build /app/prisma ./prisma

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start
CMD ["node", "dist/main.js"]
```

---

## Adaptation Notes

When generating, adapt:
- **Prisma**: Uncomment the Prisma-related COPY and RUN lines
- **Mongoose/TypeORM**: No extra steps needed (compiled into dist/)
- **Node version**: Match the version used in development (default: 24-alpine)
- **Port**: Match the PORT from .env.example (default: 3000)
- Add `.dockerignore` with:

```
node_modules
dist
.git
.env
*.md
test
coverage
.github
```
