import supertest from 'supertest';
import { app } from '../src/application/app';
import { logger } from '../src/application/logging';
import { UserTest } from './test-util';
import bcrypt from 'bcrypt';

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

describe('GET /api/users/current', () => {
  beforeEach(async () => {
    await UserTest.create();
  });

  afterEach(async () => {
    await UserTest.delete();
  });

  it('should be able to get user', async () => {
    const response = await supertest(app)
      .get('/api/users/current')
      .set('X-API-TOKEN', 'test');

    logger.debug(response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('Test');
    expect(response.body.data.email).toBe('test@example.com');
    expect(response.body.data.role).toBe('CUSTOMER');
  });

  it('should reject get user if token is invalid', async () => {
    const response = await supertest(app)
      .get('/api/users/current')
      .set('X-API-TOKEN', 'incorrect_token');

    logger.debug(response.body);
    expect(response.status).toBe(401);
    expect(response.body.errors).toBeDefined();
  });
});

describe('PATCH /api/users/current', () => {
  beforeEach(async () => {
    await UserTest.create();
  });

  afterEach(async () => {
    await UserTest.delete();
  });

  it('should reject update user if request is invalid', async () => {
    const response = await supertest(app)
      .patch('/api/users/current')
      .set('X-API-TOKEN', 'test')
      .send({
        password: '',
        name: '',
      });

    logger.debug(response.body);
    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it('should reject update user if token is wrong', async () => {
    const response = await supertest(app)
      .patch('/api/users/current')
      .set('X-API-TOKEN', 'incorrect_token')
      .send({
        password: 'valid_password',
        name: 'valid_name',
      });

    logger.debug(response.body);
    expect(response.status).toBe(401);
    expect(response.body.errors).toBeDefined();
  });

  it('should be able to update user name', async () => {
    const response = await supertest(app)
      .patch('/api/users/current')
      .set('X-API-TOKEN', 'test')
      .send({
        name: 'new_name',
      });

    logger.debug(response.body);
    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe('new_name');
  });

  it('should be able to update user password', async () => {
    const response = await supertest(app)
      .patch('/api/users/current')
      .set('X-API-TOKEN', 'test')
      .send({
        password: 'new_password',
      });

    logger.debug(response.body);
    expect(response.status).toBe(200);
    const user = await UserTest.get();
    expect(await bcrypt.compare('new_password', user.password)).toBe(true);
  });
});
