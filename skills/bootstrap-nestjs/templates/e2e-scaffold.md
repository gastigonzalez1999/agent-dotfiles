# E2E Test Scaffold Template

Generate e2e test files in the `test/` directory. Each core entity gets its own test file. Tests validate product requirements from Phase 1.

---

## Entity E2E Test Pattern

Generate `test/{{entity}}.e2e-spec.ts` for each entity:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('{{Entity}}Controller (e2e)', () => {
  let app: INestApplication;
  let createdId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    // Must match main.ts — enables @Exclude()/@Expose() on response DTOs
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ==========================================
  // CREATE
  // ==========================================

  // Generate a valid payload from the entity model's field table.
  // Include all required, non-auto-generated fields with realistic values.
  // Example for User entity model: { email: 'test@example.com', password: 'secureP@ss1', name: 'Test User' }
  const validPayload = {
    // Fill from Phase 1 entity model — every required, user-provided field
  };

  describe('POST /{{entity}}', () => {
    it('should create a new {{entity}}', () => {
      return request(app.getHttpServer())
        .post('/{{entity}}')
        .send(validPayload)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          createdId = res.body.id;
          // Assert response matches expected shape — check each @Expose() field from the response DTO
        });
    });

    it('should return 400 for invalid data', () => {
      return request(app.getHttpServer())
        .post('/{{entity}}')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(Array.isArray(res.body.message)).toBe(true);
        });
    });

    it('should return 400 for unknown properties', () => {
      return request(app.getHttpServer())
        .post('/{{entity}}')
        .send({
          unknownField: 'should be rejected',
        })
        .expect(400);
    });
  });

  // ==========================================
  // READ
  // ==========================================
  describe('GET /{{entity}}', () => {
    it('should return a list of {{entity}}s', () => {
      return request(app.getHttpServer())
        .get('/{{entity}}')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('GET /{{entity}}/:id', () => {
    it('should return a single {{entity}}', () => {
      return request(app.getHttpServer())
        .get(`/{{entity}}/${createdId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', createdId);
        });
    });

    it('should return 404 for non-existent {{entity}}', () => {
      return request(app.getHttpServer())
        .get('/{{entity}}/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  // ==========================================
  // UPDATE
  // ==========================================
  describe('PATCH /{{entity}}/:id', () => {
    it('should update the {{entity}}', () => {
      return request(app.getHttpServer())
        .patch(`/{{entity}}/${createdId}`)
        .send({
          // Partial update fields
          // name: 'Updated {{Entity}}',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', createdId);
          // expect(res.body.name).toBe('Updated {{Entity}}');
        });
    });

    it('should return 404 when updating non-existent {{entity}}', () => {
      return request(app.getHttpServer())
        .patch('/{{entity}}/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Does not matter' })
        .expect(404);
    });
  });

  // ==========================================
  // SENSITIVE FIELD EXCLUSION
  // ==========================================
  // Generate these tests for entities that have fields marked sensitive: yes in the entity model.
  // List every sensitive field and assert it is absent from the response.
  // Place BEFORE delete tests so the entity still exists.
  describe('Sensitive field exclusion', () => {
    it('should not expose sensitive fields in response', async () => {
      const res = await request(app.getHttpServer()).get(`/{{entity}}/${createdId}`).expect(200);

      // Assert EVERY field marked sensitive in the entity model is absent.
      // Example for User: passwordHash is sensitive → must not appear.
      // expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('should not expose sensitive fields in list response', async () => {
      const res = await request(app.getHttpServer()).get('/{{entity}}').expect(200);

      for (const item of res.body) {
        // Same sensitive field assertions as above
        // expect(item).not.toHaveProperty('passwordHash');
      }
    });
  });

  // ==========================================
  // RELATIONSHIP INTEGRITY (if entity has relationships in the entity model)
  // ==========================================
  // Generate these tests for entities that have relationships defined in the entity model.
  // Place BEFORE delete tests so the entity still exists.
  // describe('Relationships', () => {
  //   it('should include related entity when relationship exists', async () => {
  //     // First create the parent entity, then create the child with the parent's ID
  //     const res = await request(app.getHttpServer())
  //       .get(`/{{entity}}/${createdId}`)
  //       .expect(200);
  //     // Assert eager-loaded relationship appears in response
  //     // expect(res.body).toHaveProperty('relatedEntities');
  //     // expect(Array.isArray(res.body.relatedEntities)).toBe(true);
  //   });
  //
  //   it('should return 400/404 when creating child with invalid parent ID', () => {
  //     return request(app.getHttpServer())
  //       .post('/{{childEntity}}')
  //       .send({
  //         // Valid child fields + invalid parent ID
  //         // {{entity}}Id: '00000000-0000-0000-0000-000000000000',
  //       })
  //       .expect(400); // or 404 depending on validation strategy
  //   });
  // });

  // ==========================================
  // DELETE
  // ==========================================
  describe('DELETE /{{entity}}/:id', () => {
    it('should delete the {{entity}}', () => {
      return request(app.getHttpServer()).delete(`/{{entity}}/${createdId}`).expect(204);
    });

    it('should return 404 when deleting non-existent {{entity}}', () => {
      return request(app.getHttpServer())
        .delete('/{{entity}}/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });

    it('should return 404 when getting deleted {{entity}}', () => {
      return request(app.getHttpServer()).get(`/{{entity}}/${createdId}`).expect(404);
    });
  });

  // ==========================================
  // AUTH (if authentication is enabled)
  // ==========================================
  // describe('Authentication', () => {
  //   it('should return 401 without auth token', () => {
  //     return request(app.getHttpServer())
  //       .get('/{{entity}}')
  //       .expect(401);
  //   });
  //
  //   it('should return 401 with invalid token', () => {
  //     return request(app.getHttpServer())
  //       .get('/{{entity}}')
  //       .set('Authorization', 'Bearer invalid-token')
  //       .expect(401);
  //   });
  // });
});
```

---

## Health Check E2E Test

Generate `test/health.e2e-spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health should return status ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('info');
      });
  });
});
```

---

## Adaptation Notes

When generating:

- Replace `{{entity}}` / `{{Entity}}` with actual entity names (lowercase/PascalCase)
- **Fill `validPayload`** with real data matching the entity model's field table — every required, user-provided field gets a realistic value matching its type (strings, emails, enums, numbers, UUIDs)
- **Sensitive field exclusion tests**: Uncomment and list every field marked `sensitive: yes` in the entity model. Assert `not.toHaveProperty()` for each
- **Relationship tests**: Uncomment for entities that have relationships in the entity model. Test that eager-loaded relations appear in GET responses and that creating children with invalid parent IDs fails
- Uncomment the auth tests section if authentication was selected in Phase 2
- Add auth headers to all requests if auth is enabled:

  ```typescript
  // Get a token first in beforeAll()
  const loginRes = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: 'test@test.com', password: 'password' });
  const token = loginRes.body.access_token;

  // Use in requests
  .set('Authorization', `Bearer ${token}`)
  ```

- If using a database, consider test setup/teardown:
  - Option A: Use a test database (separate DB_NAME in test .env)
  - Option B: Use transactions that roll back after each test
  - Option C: Truncate tables in beforeEach
- Add entity-specific validation tests based on actual DTO constraints from the entity model
- Add tests for custom endpoints defined in the entity model (e.g., `POST /users/:id/deactivate`)
