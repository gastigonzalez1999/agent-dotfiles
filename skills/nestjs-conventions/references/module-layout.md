# Module layout and recipes

## Directory shape

Mirror this when adding a module under `src/modules/<name>/`:

```
domain/
  entities/              pure domain classes (order.entity.ts)
  repositories/          repository interfaces (order.repository.ts)
  services/              domain services
  types/
use-cases/
  create-order.use-case.ts
  get-order-by-id.use-case.ts
  list-orders.use-case.ts
infrastructure/
  entities/              persistence classes, suffixed *.orm-entity.ts
  mappers/               domain <-> persistence conversion
  repositories/typeorm/  port implementations
controllers/
  dto/
<name>.module.ts
```

Prisma projects collapse `infrastructure/entities` — the schema is the
persistence model — but keep the mapper: a Prisma model is still not a domain
object.

## Use case

```ts
@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject('OrderRepository') private readonly orders: OrderRepository,
  ) {}

  async execute(dto: CreateOrderDto): Promise<Order> {
    const order = Order.create({
      customerName: dto.customerName,
      items: dto.items,
    });
    await this.orders.save(order);
    return order;
  }
}
```

```ts
@Injectable()
export class GetOrderByIdUseCase {
  constructor(
    @Inject('OrderRepository') private readonly orders: OrderRepository,
  ) {}

  async execute(id: string): Promise<Order> {
    const order = await this.orders.findById(id);
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }
}
```

## Controller

```ts
@Controller('orders')
@ApiTags('Orders')
export class OrdersController {
  constructor(
    private readonly createOrder: CreateOrderUseCase,
    private readonly getOrderById: GetOrderByIdUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an order' })
  create(@Body() dto: CreateOrderDto) {
    return this.createOrder.execute(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.getOrderById.execute(id);
  }
}
```

Note what is absent: no `try/catch` translating errors (a global exception filter
does that), no mapping, no branching.

## Port and adapter for an external provider

```ts
// domain/ports/payment-processor.ts
export interface PaymentProcessor {
  charge(params: ChargeParams): Promise<PaymentResult>;
  refund(paymentId: string, amount: Money): Promise<RefundResult>;
}

// infrastructure/adapters/mercadopago.adapter.ts
@Injectable()
export class MercadoPagoAdapter implements PaymentProcessor { /* ... */ }
```

## Migration recipe (TypeORM)

```bash
npm run migration:generate -- src/db/postgres/migrations/<PascalCaseName>
npm run migration:run
npm run migration:show      # confirm it applied
npm run migration:revert    # only for a migration not yet deployed
```

Filenames are `<timestamp>-<PascalCaseDescription>.ts`. Read the generated SQL
before committing — a generated migration will happily drop a column when an
entity field was renamed.

Production runs `migration:run` from the container entrypoint before starting
the app.

## Migration recipe (Prisma)

See the `setup-prisma-migration` skill — the nullable-compound-unique and
shadow-database pitfalls are covered there.

## Testing

- Unit-test use cases against an in-memory fake of the repository port. No
  database, no NestJS TestingModule.
- Unit-test domain rules directly — they are pure functions.
- Integration-test the wiring at the boundaries that matter: create, state
  transitions, anything touching money.
- e2e-test the critical user paths only.

Cover what touches money, state transitions and business rules well. Do not
chase a coverage percentage.

### Overriding config in e2e

`ConfigModule.validate` runs at module init, so setting `process.env` in a test
file is unreliable — the value is often read before the test assigns it. Use
`overrideProvider` on the config service instead:

```ts
const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(AppConfigService)
  .useValue({ ...defaults, corsOrigin: 'http://localhost:3002' })
  .compile();
```

Combine with temp-directory fixtures for anything touching the filesystem, so
tests do not share mutable state.
