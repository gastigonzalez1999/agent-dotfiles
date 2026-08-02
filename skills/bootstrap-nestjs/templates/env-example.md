# .env.example Template

Generate both `.env.example` (committed to git) and `.env` (gitignored, with dev defaults).

---

```env
# ============================================
# Application
# ============================================
NODE_ENV=development
PORT=3000
API_PREFIX=api
CORS_ORIGINS=http://localhost:3000,http://localhost:4200

# ============================================
# Database — PostgreSQL (if selected)
# ============================================
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=app_dev
# DB_USER=postgres
# DB_PASSWORD=postgres
# DB_SSL=false
# DB_SYNCHRONIZE=false

# ============================================
# Database — MySQL (if selected)
# ============================================
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=app_dev
# DB_USER=root
# DB_PASSWORD=root

# ============================================
# Database — MongoDB (if selected)
# ============================================
# MONGODB_URI=mongodb://mongo:mongo@localhost:27017/app_dev?authSource=admin

# ============================================
# Authentication — JWT (if selected)
# ============================================
# JWT_SECRET=CHANGE-ME-IN-PRODUCTION-use-openssl-rand-hex-64
# JWT_EXPIRATION=3600s
# JWT_REFRESH_EXPIRATION=7d

# ============================================
# Authentication — OAuth2 (if selected)
# ============================================
# OAUTH_CLIENT_ID=
# OAUTH_CLIENT_SECRET=
# OAUTH_CALLBACK_URL=http://localhost:3000/auth/callback

# ============================================
# Authentication — API Keys (if selected)
# ============================================
# API_KEY_HEADER=x-api-key

# ============================================
# Redis (if caching or Bull selected)
# ============================================
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=redis
# REDIS_TTL=300

# ============================================
# Message Queue — RabbitMQ (if selected)
# ============================================
# RABBITMQ_URL=amqp://rabbit:rabbit@localhost:5672

# ============================================
# Message Queue — Kafka (if selected)
# ============================================
# KAFKA_BROKERS=localhost:9092
# KAFKA_GROUP_ID=app-group

# ============================================
# Swagger
# ============================================
SWAGGER_ENABLED=true
SWAGGER_PATH=api

# ============================================
# Logging
# ============================================
LOG_LEVEL=debug
```

---

## Adaptation Notes

When generating:
- **Uncomment only the sections that match Phase 2 selections**
- **Remove all commented-out blocks for unselected features**
- For `.env` (dev copy): use the dev defaults shown above
- For `.env.example`: use placeholder values (empty strings or descriptive text) for secrets
- Add `.env` to `.gitignore` (NestJS CLI usually includes this already)
- The `DB_SYNCHRONIZE=false` is intentional — never true in production; migrations only
