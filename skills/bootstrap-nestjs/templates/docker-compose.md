# Docker Compose Template

Generate a `docker-compose.yml` at the project root. Include only the services selected in Phase 2.

---

```yaml
version: '3.8'

services:
  # ============================================
  # Application
  # ============================================
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    ports:
      - "${PORT:-3000}:3000"
    env_file:
      - .env
    environment:
      - NODE_ENV=production
    depends_on:
      # db:
      #   condition: service_healthy
      # redis:
      #   condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network

  # ============================================
  # PostgreSQL (if selected)
  # ============================================
  # db:
  #   image: postgres:16-alpine
  #   ports:
  #     - "${DB_PORT:-5432}:5432"
  #   environment:
  #     POSTGRES_DB: ${DB_NAME:-app}
  #     POSTGRES_USER: ${DB_USER:-postgres}
  #     POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres}
  #   volumes:
  #     - postgres_data:/var/lib/postgresql/data
  #   healthcheck:
  #     test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
  #     interval: 10s
  #     timeout: 5s
  #     retries: 5
  #   restart: unless-stopped
  #   networks:
  #     - app-network

  # ============================================
  # MySQL (if selected)
  # ============================================
  # db:
  #   image: mysql:8.0
  #   ports:
  #     - "${DB_PORT:-3306}:3306"
  #   environment:
  #     MYSQL_DATABASE: ${DB_NAME:-app}
  #     MYSQL_ROOT_PASSWORD: ${DB_PASSWORD:-root}
  #   volumes:
  #     - mysql_data:/var/lib/mysql
  #   healthcheck:
  #     test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
  #     interval: 10s
  #     timeout: 5s
  #     retries: 5
  #   restart: unless-stopped
  #   networks:
  #     - app-network

  # ============================================
  # MongoDB (if selected)
  # ============================================
  # db:
  #   image: mongo:7
  #   ports:
  #     - "${DB_PORT:-27017}:27017"
  #   environment:
  #     MONGO_INITDB_ROOT_USERNAME: ${DB_USER:-mongo}
  #     MONGO_INITDB_ROOT_PASSWORD: ${DB_PASSWORD:-mongo}
  #     MONGO_INITDB_DATABASE: ${DB_NAME:-app}
  #   volumes:
  #     - mongo_data:/data/db
  #   healthcheck:
  #     test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
  #     interval: 10s
  #     timeout: 5s
  #     retries: 5
  #   restart: unless-stopped
  #   networks:
  #     - app-network

  # ============================================
  # Redis (if caching or Bull selected)
  # ============================================
  # redis:
  #   image: redis:7-alpine
  #   ports:
  #     - "${REDIS_PORT:-6379}:6379"
  #   command: redis-server --requirepass ${REDIS_PASSWORD:-redis}
  #   volumes:
  #     - redis_data:/data
  #   healthcheck:
  #     test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-redis}", "ping"]
  #     interval: 10s
  #     timeout: 5s
  #     retries: 5
  #   restart: unless-stopped
  #   networks:
  #     - app-network

  # ============================================
  # RabbitMQ (if selected)
  # ============================================
  # rabbitmq:
  #   image: rabbitmq:3-management-alpine
  #   ports:
  #     - "${RABBITMQ_PORT:-5672}:5672"
  #     - "15672:15672"
  #   environment:
  #     RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER:-rabbit}
  #     RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:-rabbit}
  #   volumes:
  #     - rabbitmq_data:/var/lib/rabbitmq
  #   healthcheck:
  #     test: ["CMD", "rabbitmq-diagnostics", "check_running"]
  #     interval: 10s
  #     timeout: 5s
  #     retries: 5
  #   restart: unless-stopped
  #   networks:
  #     - app-network

networks:
  app-network:
    driver: bridge

volumes:
  # postgres_data:
  # mysql_data:
  # mongo_data:
  # redis_data:
  # rabbitmq_data:
```

---

## Adaptation Notes

When generating:
- **Uncomment only the services selected in Phase 2** — remove all commented-out blocks for unselected services
- **Update `depends_on`** in the app service to include only selected infrastructure
- **Update `volumes`** at the bottom to include only used volumes
- **Development override**: Optionally generate a `docker-compose.override.yml` for dev mode:
  ```yaml
  services:
    app:
      build:
        target: deps
      command: npm run start:dev
      volumes:
        - .:/app
        - /app/node_modules
  ```
