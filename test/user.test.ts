import supertest from 'supertest';
import { app } from '../src/application/app';
import { logger } from '../src/application/logging';

describe('POST /api/users', () => {
  it('should reject register new user if request is invalid', async () => {
    const response = await supertest(app).post('/api/users').send({
      name: '',
      email: '',
      password: '',
      role: '',
    });

    logger.debug(response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });
});
