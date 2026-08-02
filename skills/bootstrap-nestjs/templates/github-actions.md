# GitHub Actions CI/CD Template

Generate `.github/workflows/ci.yml` at the project root. Adapt based on Phase 2 infrastructure decisions.

---

## CI Pipeline (without Docker push)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '24'

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check

  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  test-e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    # services:
    #   # PostgreSQL (if selected)
    #   postgres:
    #     image: postgres:16-alpine
    #     env:
    #       POSTGRES_DB: test_db
    #       POSTGRES_USER: postgres
    #       POSTGRES_PASSWORD: postgres
    #     ports:
    #       - 5432:5432
    #     options: >-
    #       --health-cmd pg_isready
    #       --health-interval 10s
    #       --health-timeout 5s
    #       --health-retries 5
    #
    #   # Redis (if selected)
    #   redis:
    #     image: redis:7-alpine
    #     ports:
    #       - 6379:6379
    #     options: >-
    #       --health-cmd "redis-cli ping"
    #       --health-interval 10s
    #       --health-timeout 5s
    #       --health-retries 5
    # env:
    #   DB_HOST: localhost
    #   DB_PORT: 5432
    #   DB_NAME: test_db
    #   DB_USER: postgres
    #   DB_PASSWORD: postgres
    #   REDIS_HOST: localhost
    #   REDIS_PORT: 6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run test:e2e

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test, test-e2e]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

---

## Docker Push Stage (if selected)

Append this job to the CI pipeline when Docker push is requested:

```yaml
  docker:
    name: Build & Push Docker Image
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha,prefix=
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Adaptation Notes

When generating:
- **Uncomment only the service containers needed** (PostgreSQL, Redis, etc.) in the e2e job
- **Remove all commented blocks** for unselected services
- **Add environment variables** in the e2e job matching the test .env
- **Docker push**: Only include the docker job if the user selected it in Phase 2
- **Registry**: Default is GitHub Container Registry (ghcr.io). Can be changed to Docker Hub, AWS ECR, etc.
- If using **MySQL**, replace the postgres service container with:
  ```yaml
  mysql:
    image: mysql:8.0
    env:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: test_db
    ports:
      - 3306:3306
    options: >-
      --health-cmd "mysqladmin ping"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
  ```
- If using **MongoDB**, add:
  ```yaml
  mongodb:
    image: mongo:7
    ports:
      - 27017:27017
  ```
