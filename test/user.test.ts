import supertest from 'supertest';
import { app } from '../src/application/app';
import { logger } from '../src/application/logging';
import { UserTest } from './test-util';

describe('POST /api/users', () => {
  afterEach(async () => {
    await UserTest.delete();
  });

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

  it('should register new user', async () => {
    const response = await supertest(app).post('/api/users').send({
      name: 'Test',
      email: 'test@example.com',
      password: 'secret123',
      role: 'CUSTOMER',
    });

    logger.debug(response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Test');
    expect(response.body.data.email).toBe('test@example.com');
  });
});

describe('POST /api/users/login', () => {
  beforeEach(async () => {
    await UserTest.create();
  });

  afterEach(async () => {
    await UserTest.delete();
  });

  it('should be able to login', async () => {
    const response = await supertest(app)
      .post('/api/users/login')
      .send({ email: 'test@example.com', password: 'hashed_password' });

    logger.debug(response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Test');
    expect(response.body.data.email).toBe('test@example.com');
    expect(response.body.data.role).toBe('CUSTOMER');
    expect(response.body.data.token).toBeDefined();
  });

  it('should reject login user if email is wrong', async () => {
    const response = await supertest(app)
      .post('/api/users/login')
      .send({ email: 'incorrect@email.com', password: 'hashed_password' });

    logger.debug(response.body);
    expect(response.status).toBe(401);
    expect(response.body.errors).toBeDefined();
  });

  it('should reject login user if password is wrong', async () => {
    const response = await supertest(app)
      .post('/api/users/login')
      .send({ email: 'test@example.com', password: 'incorrect_password' });

    logger.debug(response.body);
    expect(response.status).toBe(401);
    expect(response.body.errors).toBeDefined();
  });
});
