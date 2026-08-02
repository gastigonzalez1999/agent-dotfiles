# Swagger Setup Template

Modify the project's `src/main.ts` to include Swagger/OpenAPI configuration. Also ensure all controllers have proper Swagger decorators.

---

## main.ts Swagger Bootstrap

Add this to `src/main.ts` after creating the NestJS app and before `app.listen()`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger configuration
  if (process.env.SWAGGER_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('{{SERVICE_NAME}}')
      .setDescription('{{SERVICE_DESCRIPTION}}')
      .setVersion('1.0.0')
      // Add tags for each feature module — use entity descriptions from Phase 1, not generic "X management":
      // .addTag('{{entity1}}', '{{Entity1 description from Phase 1 product context}}')
      // .addTag('{{entity2}}', '{{Entity2 description from Phase 1 product context}}')
      // Example: .addTag('users', 'User accounts, authentication, and profile management')
      // Example: .addTag('orders', 'Customer order lifecycle — creation, payment, fulfillment, returns')
      .addTag('health', 'Health checks and readiness probes')
      // If JWT auth:
      // .addBearerAuth()
      // If API key auth:
      // .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
      .build();

    // Register all response DTOs so they appear in the Swagger schema section
    // even if only used in @ApiResponse() decorators:
    // const document = SwaggerModule.createDocument(app, config, {
    //   extraModels: [UserResponseDto, OrderResponseDto, /* all response DTOs */],
    // });
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(process.env.SWAGGER_PATH || 'api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/${process.env.SWAGGER_PATH || 'api'}`);
}
bootstrap();
```

---

## Controller Swagger Decorators Reference

Every controller should use these decorators:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('{{entity}}')
// @ApiBearerAuth()  // If JWT auth is enabled
@Controller('{{entity}}')
export class EntityController {
  @Get()
  @ApiOperation({ summary: 'List all {{entity}}s' })
  @ApiResponse({ status: 200, description: 'List of {{entity}}s' })
  findAll() {}

  @Get(':id')
  @ApiOperation({ summary: 'Get {{entity}} by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'The {{entity}}' })
  @ApiResponse({ status: 404, description: '{{Entity}} not found' })
  findOne(@Param('id') id: string) {}

  @Post()
  @ApiOperation({ summary: 'Create {{entity}}' })
  @ApiBody({ type: CreateEntityDto })
  @ApiResponse({ status: 201, description: '{{Entity}} created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateEntityDto) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update {{entity}}' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateEntityDto })
  @ApiResponse({ status: 200, description: '{{Entity}} updated' })
  @ApiResponse({ status: 404, description: '{{Entity}} not found' })
  update(@Param('id') id: string, @Body() dto: UpdateEntityDto) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete {{entity}}' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: '{{Entity}} deleted' })
  @ApiResponse({ status: 404, description: '{{Entity}} not found' })
  remove(@Param('id') id: string) {}
}
```

---

## DTO Swagger Decorators Reference

Use the **entity model from Phase 1** to generate meaningful `description` and `example` values. Every `@ApiProperty()` should describe what the field represents in the domain, not use generic placeholders.

```typescript
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsNumber } from 'class-validator';

export class CreateEntityDto {
  // Derive description and example from the entity model field context:
  // Field "email" on User entity → description explains it's for login, example is realistic
  @ApiProperty({ description: 'User email address used for login', example: 'jane@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Display name shown in the UI', example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Optional bio for the user profile' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateEntityDto extends PartialType(CreateEntityDto) {}
```

### Response DTO Swagger Decorators

Response DTOs should also include `@ApiProperty()` with `description` and `example` on every `@Expose()` field:

```typescript
@Exclude()
export class EntityResponseDto {
  @Expose()
  @ApiProperty({
    description: 'Unique identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @Expose()
  @ApiProperty({ description: 'User email address', example: 'jane@example.com' })
  email: string;

  // Sensitive fields are excluded by default — no @Expose(), no @ApiProperty()
}
```

---

## Adaptation Notes

When generating:

- Replace all `{{SERVICE_NAME}}`, `{{SERVICE_DESCRIPTION}}`, `{{entity}}` with actual values
- Add `.addTag()` for each core entity from Phase 1, using the entity's description from the product context (not generic "X management")
- Use `extraModels` in `SwaggerModule.createDocument()` to register all response DTOs so they appear in the schema section
- Use `@ApiProperty({ description, example })` with domain-meaningful values derived from the entity model — every field should have a description that explains its role and a realistic example
- Add `.addBearerAuth()` only if JWT auth was selected
- Add `.addApiKey()` only if API key auth was selected
- Uncomment `@ApiBearerAuth()` on controllers only if JWT auth was selected
