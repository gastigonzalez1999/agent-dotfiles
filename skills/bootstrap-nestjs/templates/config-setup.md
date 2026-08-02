# Configuration Setup Template

Split environment configuration into domain-specific classes validated with `class-validator` + `class-transformer` at app startup. If a required variable is missing or invalid, the app **fails fast** before listening.

---

## Step 1: Install config validation deps

These are likely already installed (class-validator + class-transformer are in the "Always install" list), but ensure they're present:

```bash
npm install @nestjs/config class-validator class-transformer
```

---

## Step 2: Create domain-specific config classes in `src/config/`

Each config class validates a group of related env vars. Use `class-validator` decorators for runtime validation and `class-transformer` for type coercion.

### `src/config/app.config.ts` — always generated

```typescript
import { IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class AppConfig {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  PORT: number = 3000;

  @IsString()
  API_PREFIX: string = 'api';

  @IsString()
  CORS_ORIGINS: string = 'http://localhost:3000';
}
```

### `src/config/database.config.ts` — if SQL database selected

```typescript
import { IsBoolean, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DatabaseConfig {
  @IsString()
  DB_HOST: string = 'localhost';

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  DB_PORT: number = 5432; // or 3306 for MySQL

  @IsString()
  DB_NAME: string;

  @IsString()
  DB_USER: string;

  @IsString()
  DB_PASSWORD: string;

  @Type(() => Boolean)
  @IsBoolean()
  DB_SSL: boolean = false;

  @Type(() => Boolean)
  @IsBoolean()
  DB_SYNCHRONIZE: boolean = false;
}
```

### `src/config/mongodb.config.ts` — if MongoDB selected

```typescript
import { IsString } from 'class-validator';

export class MongoDbConfig {
  @IsString()
  MONGODB_URI: string;
}
```

### `src/config/auth.config.ts` — if JWT auth selected

```typescript
import { IsString, MinLength } from 'class-validator';

export class AuthConfig {
  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRATION: string = '3600s';

  @IsString()
  JWT_REFRESH_EXPIRATION: string = '7d';
}
```

### `src/config/auth-oauth.config.ts` — if OAuth2 selected

```typescript
import { IsString, IsUrl } from 'class-validator';

export class AuthOAuthConfig {
  @IsString()
  OAUTH_CLIENT_ID: string;

  @IsString()
  OAUTH_CLIENT_SECRET: string;

  @IsUrl()
  OAUTH_CALLBACK_URL: string;
}
```

### `src/config/redis.config.ts` — if Redis selected

```typescript
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RedisConfig {
  @IsString()
  REDIS_HOST: string = 'localhost';

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  REDIS_TTL: number = 300;
}
```

### `src/config/queue.config.ts` — if RabbitMQ selected

```typescript
import { IsString } from 'class-validator';

export class QueueConfig {
  @IsString()
  RABBITMQ_URL: string = 'amqp://rabbit:rabbit@localhost:5672';
}
```

### `src/config/queue-kafka.config.ts` — if Kafka selected

```typescript
import { IsString } from 'class-validator';

export class QueueKafkaConfig {
  @IsString()
  KAFKA_BROKERS: string = 'localhost:9092';

  @IsString()
  KAFKA_GROUP_ID: string;
}
```

### `src/config/swagger.config.ts` — always generated

```typescript
import { IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class SwaggerConfig {
  @Type(() => Boolean)
  @IsBoolean()
  SWAGGER_ENABLED: boolean = true;

  @IsString()
  SWAGGER_PATH: string = 'api';
}
```

---

## Step 3: Create the validation function

### `src/config/env.validation.ts`

```typescript
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

/**
 * Validate environment variables against a DTO class at startup.
 * Throws with a clear error listing all violations if validation fails.
 */
export function validateConfig<T extends object>(
  config: Record<string, unknown>,
  ConfigClass: new () => T,
): T {
  const validated = plainToInstance(ConfigClass, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
  });
  if (errors.length > 0) {
    const messages = errors
      .map((err) => Object.values(err.constraints ?? {}).join(', '))
      .join('\n  - ');
    throw new Error(
      `\n\nConfiguration validation failed:\n  - ${messages}\n`,
    );
  }
  return validated;
}
```

---

## Step 4: Create the `AppConfigModule`

All config wiring lives in a single `AppConfigModule`. It validates every domain config at startup and re-exports `ConfigModule` globally so all other modules can inject `ConfigService` without importing anything extra.

### `src/config/app-config.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateConfig } from './env.validation';
import { AppConfig } from './app.config';
import { SwaggerConfig } from './swagger.config';
// Conditional — only import what's selected in Phase 2:
// import { DatabaseConfig } from './database.config';
// import { MongoDbConfig } from './mongodb.config';
// import { AuthConfig } from './auth.config';
// import { AuthOAuthConfig } from './auth-oauth.config';
// import { RedisConfig } from './redis.config';
// import { QueueConfig } from './queue.config';
// import { QueueKafkaConfig } from './queue-kafka.config';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        // Each call validates one domain — fails fast with clear errors
        const app = validateConfig(config, AppConfig);
        const swagger = validateConfig(config, SwaggerConfig);
        // Uncomment only the domains selected in Phase 2:
        // const db = validateConfig(config, DatabaseConfig);
        // const mongo = validateConfig(config, MongoDbConfig);
        // const auth = validateConfig(config, AuthConfig);
        // const oauth = validateConfig(config, AuthOAuthConfig);
        // const redis = validateConfig(config, RedisConfig);
        // const queue = validateConfig(config, QueueConfig);
        // const kafka = validateConfig(config, QueueKafkaConfig);
        return {
          ...app,
          ...swagger,
          // ...db, ...auth, ...redis, ...queue,
        };
      },
    }),
  ],
})
export class AppConfigModule {}
```

### `src/config/index.ts` — barrel export

```typescript
export { AppConfigModule } from './app-config.module';
export { AppConfig, Environment } from './app.config';
export { SwaggerConfig } from './swagger.config';
// Conditional — only export what's selected:
// export { DatabaseConfig } from './database.config';
// export { MongoDbConfig } from './mongodb.config';
// export { AuthConfig } from './auth.config';
// export { AuthOAuthConfig } from './auth-oauth.config';
// export { RedisConfig } from './redis.config';
// export { QueueConfig } from './queue.config';
// export { QueueKafkaConfig } from './queue-kafka.config';
export { validateConfig } from './env.validation';
```

---

## Step 5: Import `AppConfigModule` in `AppModule`

`AppModule` stays clean — just import `AppConfigModule` and all config is validated and globally available:

```typescript
import { Module } from '@nestjs/common';
import { AppConfigModule } from './config';
// Feature modules
import { HealthModule } from './health/health.module';
// import { UserModule } from './user/user.module';
// ...

@Module({
  imports: [
    AppConfigModule,  // All config validation + global ConfigService
    HealthModule,
    // ...feature modules
  ],
})
export class AppModule {}
```

---

## Step 6: Access typed config values in services

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SomeService {
  constructor(private readonly config: ConfigService) {}

  getPort(): number {
    // Typed — already validated at startup, safe to assert non-null
    return this.config.get<number>('PORT')!;
  }
}
```

No need to import `ConfigModule` in feature modules — `AppConfigModule` is `@Global()`.

---

## Adaptation Notes

When generating:
- **Only create config classes for domains selected in Phase 2.** Do not generate `database.config.ts` if no database was selected.
- **Remove all commented-out imports and lines** in `app-config.module.ts` for unselected domains. The generated file should only contain the domains that apply.
- **Update the barrel export** (`src/config/index.ts`) to match what was generated.
- Defaults in the config classes should match the `.env.example` dev defaults.
- The `JWT_SECRET` has `@MinLength(32)` — this prevents the common "CHANGE-ME" placeholder from passing validation.
- `DB_SYNCHRONIZE` defaults to `false` — safe for production. Dev can override via `.env`.
- The validation runs **before** the app bootstraps. If any env var is missing or invalid, NestJS will not start and the error message lists exactly what's wrong.
