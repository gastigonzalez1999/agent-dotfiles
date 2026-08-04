---
name: nestjs-best-practices
description: >-
  NestJS best practices and architecture patterns (40 rules, 10 categories).
  Use when writing, reviewing, or refactoring NestJS code — modules, controllers, services, guards,
  pipes, interceptors, entities, or DTOs. Triggers on code generation, PR reviews, architecture
  decisions, and performance optimization.
license: MIT
metadata:
  author: Kadajett
  version: "1.1.0"
---

# NestJS Best Practices

Comprehensive best practices guide for NestJS applications. Contains 40 rules across 10 categories, prioritized by impact to guide automated refactoring and code generation.

Source: https://github.com/Kadajett/agent-nestjs-skills

## When to Apply

Reference these guidelines when:

- Writing new NestJS modules, controllers, or services
- Implementing authentication and authorization
- Reviewing code for architecture and security issues
- Refactoring existing NestJS codebases
- Optimizing performance or database queries
- Building microservices architectures

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Architecture | CRITICAL | `arch-` |
| 2 | Dependency Injection | CRITICAL | `di-` |
| 3 | Error Handling | HIGH | `error-` |
| 4 | Security | HIGH | `security-` |
| 5 | Performance | HIGH | `perf-` |
| 6 | Testing | MEDIUM-HIGH | `test-` |
| 7 | Database & ORM | MEDIUM-HIGH | `db-` |
| 8 | API Design | MEDIUM | `api-` |
| 9 | Microservices | MEDIUM | `micro-` |
| 10 | DevOps & Deployment | LOW-MEDIUM | `devops-` |

---

## 1. Architecture (CRITICAL)

### arch-avoid-circular-deps — Avoid circular module dependencies
The #1 cause of runtime crashes in NestJS. Circular dependencies between modules cause undefined providers at runtime.

**Wrong:**
```typescript
// user.module.ts
@Module({ imports: [OrderModule] }) // OrderModule also imports UserModule → circular!
export class UserModule {}
```

**Right:**
```typescript
// Extract shared logic to a third module, or use forwardRef() as last resort
@Module({
  imports: [forwardRef(() => OrderModule)], // Both sides must use forwardRef
})
export class UserModule {}
// Better: extract shared logic to SharedModule that both import
```

### arch-feature-modules — Organize by feature, not technical layer
Group code by business domain (user/, order/, product/) not by technical layer (controllers/, services/, repositories/). Enables 3-5x faster onboarding and development.

**Wrong:**
```
src/controllers/user.controller.ts
src/controllers/order.controller.ts
src/services/user.service.ts
src/services/order.service.ts
```

**Right:**
```
src/user/user.module.ts
src/user/user.controller.ts
src/user/user.service.ts
src/order/order.module.ts
src/order/order.controller.ts
src/order/order.service.ts
```

### arch-module-sharing — Proper module exports/imports
Export services (not modules) from the exports array. Import modules that provide needed services. Avoid duplicate providers across modules.

**Wrong:**
```typescript
@Module({
  exports: [UserModule], // Exporting the module instead of the service
})
export class UserModule {}
```

**Right:**
```typescript
@Module({
  providers: [UserService],
  exports: [UserService], // Export the service
})
export class UserModule {}
```

### arch-single-responsibility — Focused services over "god services"
Each service should have a single, well-defined responsibility. Break large services into smaller, focused ones.

### arch-use-repository-pattern — Abstract database logic for testability
Separate data access logic from business logic. Services depend on repository interfaces, not ORM-specific implementations.

```typescript
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}
}
```

### arch-use-events — Event-driven architecture for decoupling
Use NestJS EventEmitter for internal events. Prevents tight coupling between modules.

```typescript
// Emit event
this.eventEmitter.emit('user.created', new UserCreatedEvent(user));

// Listen in another module
@OnEvent('user.created')
handleUserCreated(event: UserCreatedEvent) { }
```

---

## 2. Dependency Injection (CRITICAL)

### di-prefer-constructor-injection — Constructor over property injection
Always use constructor injection. Property injection hides dependencies and breaks testability.

**Wrong:**
```typescript
@Injectable()
export class UserService {
  @Inject(ConfigService)
  private config: ConfigService; // Hidden dependency
}
```

**Right:**
```typescript
@Injectable()
export class UserService {
  constructor(private readonly config: ConfigService) {} // Explicit
}
```

### di-avoid-service-locator — Never use ModuleRef.get() for regular dependencies
Service locator hides dependencies and breaks testability. Use constructor injection instead.

**Wrong:**
```typescript
constructor(private moduleRef: ModuleRef) {}
onModuleInit() {
  this.userService = this.moduleRef.get(UserService); // Hidden dependency
}
```

### di-scope-awareness — Understand singleton/request/transient scopes
Default scope is SINGLETON. REQUEST scope creates new instance per request (use for user-specific data). TRANSIENT creates new instance per injection. Mixing scopes has performance implications.

### di-use-interfaces-tokens — Use injection tokens for interfaces
TypeScript interfaces are erased at runtime. Use abstract classes or Symbol tokens for DI.

```typescript
export const USER_REPO = Symbol('USER_REPO');

@Module({
  providers: [{ provide: USER_REPO, useClass: TypeOrmUserRepo }],
})
```

### di-interface-segregation — Interface Segregation Principle (ISP)
Don't force services to depend on interfaces they don't use. Split large interfaces into focused ones.

### di-liskov-substitution — Liskov Substitution Principle (LSP)
Subtypes must be substitutable for their base types without altering program correctness.

---

## 3. Error Handling (HIGH)

### error-throw-http-exceptions — Use NestJS HTTP exceptions
Throw `NotFoundException`, `BadRequestException`, etc. directly. NestJS handles serialization.

```typescript
if (!user) {
  throw new NotFoundException(`User #${id} not found`);
}
```

### error-use-exception-filters — Centralized exception handling
Create custom exception filters for consistent error responses across the application.

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    response.status(status).json({
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### error-handle-async-errors — Handle async errors properly
Never fire-and-forget async operations. Unhandled rejections crash the process.

**Wrong:**
```typescript
this.emailService.sendWelcome(user); // No await, no catch — crashes on failure
```

**Right:**
```typescript
await this.emailService.sendWelcome(user);
// Or if truly fire-and-forget:
this.emailService.sendWelcome(user).catch((err) => this.logger.error(err));
```

---

## 4. Security (HIGH)

### security-auth-jwt — Secure JWT authentication
Use short-lived access tokens (15min) with refresh tokens. Never store secrets in code.

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }
}
```

### security-validate-all-input — Validate with class-validator
Every endpoint must validate input via DTOs with class-validator decorators.

```typescript
export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

### security-use-guards — Authentication and authorization guards
Use `@UseGuards()` for access control, never manual checks in controllers.

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Get('admin/users')
getAdminUsers() { }
```

### security-sanitize-output — Prevent data leakage
Never return raw entities. Use response DTOs with `@Exclude()`/`@Expose()` to control exposed fields. Prevents leaking passwords, internal IDs, etc.

### security-rate-limiting — Implement rate limiting
Use `@nestjs/throttler` to prevent brute force and abuse.

```typescript
@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])],
})
```

---

## 5. Performance (HIGH)

### perf-use-caching — Implement caching strategies
Cache expensive operations. Use TTL-based invalidation. Don't cache everything.

```typescript
@Injectable()
export class UserService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async findById(id: string): Promise<User> {
    const cached = await this.cache.get<User>(`user:${id}`);
    if (cached) return cached;
    const user = await this.userRepo.findOne({ where: { id } });
    await this.cache.set(`user:${id}`, user, 300);
    return user;
  }
}
```

### perf-optimize-database — Optimize database queries
Select only needed columns. Use proper indexes. Avoid `SELECT *`.

```typescript
// Wrong
const users = await this.userRepo.find();

// Right — select only needed fields, use pagination
const users = await this.userRepo.find({
  select: ['id', 'name', 'email'],
  take: 20,
  skip: 0,
});
```

### perf-async-hooks — Proper async lifecycle hooks
Use `onModuleInit`, `onModuleDestroy` correctly. Always await async operations in lifecycle hooks.

### perf-lazy-loading — Lazy load modules for faster startup
Use `LazyModuleLoader` for rarely-used modules to improve cold start times.

---

## 6. Testing (MEDIUM-HIGH)

### test-use-testing-module — Use NestJS testing utilities
Always use `Test.createTestingModule()` for isolated unit tests with proper mocking.

```typescript
beforeEach(async () => {
  const module = await Test.createTestingModule({
    providers: [
      UserService,
      { provide: getRepositoryToken(User), useValue: mockRepo },
    ],
  }).compile();
  service = module.get(UserService);
});
```

### test-e2e-supertest — E2E testing with Supertest
Test full HTTP request/response cycle including validation, guards, and serialization.

```typescript
it('should create user', () => {
  return request(app.getHttpServer())
    .post('/users')
    .send({ name: 'Test', email: 'test@test.com', password: 'password123' })
    .expect(201)
    .expect((res) => {
      expect(res.body).toHaveProperty('id');
      expect(res.body).not.toHaveProperty('password'); // Excluded by response DTO
    });
});
```

### test-mock-external-services — Mock external dependencies
Never call real external services in tests. Mock HTTP clients, message queues, etc.

---

## 7. Database & ORM (MEDIUM-HIGH)

### db-use-transactions — Transaction management
Wrap multi-step database operations in transactions to maintain data consistency.

```typescript
await this.dataSource.transaction(async (manager) => {
  const user = manager.create(User, dto);
  await manager.save(user);
  await manager.save(Profile, { userId: user.id });
});
```

### db-avoid-n-plus-one — Avoid N+1 query problems
Use eager loading, joins, or DataLoader pattern to prevent N+1 queries.

```typescript
// Wrong — N+1: 1 query for orders + N queries for users
const orders = await this.orderRepo.find();
for (const order of orders) {
  order.user = await this.userRepo.findOne({ where: { id: order.userId } });
}

// Right — single query with join
const orders = await this.orderRepo.find({ relations: ['user'] });
```

### db-use-migrations — Use migrations for schema changes
Never use `synchronize: true` in production. Always use migrations.

```bash
npm run typeorm migration:generate -- -n AddUserEmail
npm run typeorm migration:run
```

---

## 8. API Design (MEDIUM)

### api-use-dto-serialization — DTO and response serialization
Use separate DTOs for input validation and response serialization. Never expose raw entities.

### api-use-interceptors — Cross-cutting concerns
Use interceptors for logging, transformation, caching, and response mapping.

```typescript
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(map((data) => ({ data, statusCode: 200 })));
  }
}
```

### api-versioning — API versioning strategies
Use URI versioning (`/v1/users`) or header versioning for breaking changes.

### api-use-pipes — Input transformation with pipes
Use built-in and custom pipes for input transformation and validation.

---

## 9. Microservices (MEDIUM)

### micro-use-patterns — Message and event patterns
Use `@MessagePattern()` for request-response and `@EventPattern()` for fire-and-forget.

### micro-use-health-checks — Health checks for orchestration
Implement health checks for load balancers and container orchestrators.

```typescript
@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService, private db: TypeOrmHealthIndicator) {}

  @Get()
  check() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
```

### micro-use-queues — Background job processing
Use Bull/BullMQ for background jobs. Don't process heavy tasks in request handlers.

---

## 10. DevOps & Deployment (LOW-MEDIUM)

### devops-use-config-module — Environment configuration
Use `@nestjs/config` with validation. Never hardcode configuration values.

### devops-use-logging — Structured logging
Use NestJS Logger or a structured logging library. Never use `console.log` in production.

```typescript
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async create(dto: CreateUserDto) {
    this.logger.log(`Creating user: ${dto.email}`);
    // ...
  }
}
```

### devops-graceful-shutdown — Zero-downtime deployments
Handle SIGTERM for graceful shutdown. Close database connections and finish in-flight requests.

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(3000);
}
```
