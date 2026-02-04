import { prisma } from '../src/application/database';
import bcrypt from 'bcrypt';
import supertest from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { app } from '../src/application/app';
import { TransactionStatus } from '../src/generated/prisma/enums';

describe('Transaction Management API', () => {
  let customerToken: string;
  let organizerToken: string;
  let eventId: string;
  let ticketTierId: string;
  let transactionId: string;
  let customerId: string;
  let organizerId: string;

  beforeAll(async () => {
    // Create customer
    const customer = await prisma.user.create({
      data: {
        name: 'Test Customer',
        email: 'transaction-customer@test.com',
        password: await bcrypt.hash('password123', 10),
        role: 'CUSTOMER',
        referralCode: `REF-${uuidv4()}`,
        token: 'customer-token',
        points: 50000,
      },
    });

    // Create organizer
    const organizer = await prisma.user.create({
      data: {
        name: 'Test Organizer',
        email: 'transaction-organizer@test.com',
        password: await bcrypt.hash('password123', 10),
        role: 'ORGANIZER',
        referralCode: `REF-${uuidv4()}`,
        token: 'organizer-token',
      },
    });

    customerToken = customer.token!;
    organizerToken = organizer.token!;
    customerId = customer.id;
    organizerId = organizer.id;

    // Create category, location, and event
    const category = await prisma.category.create({
      data: {
        value: 'TECHNOLOGY',
        label: 'Technology',
        icon: 'tech-icon',
      },
    });

    const location = await prisma.location.create({
      data: {
        name: 'Test Venue',
      },
    });

    const event = await prisma.event.create({
      data: {
        title: 'Transaction Test Event',
        description: 'Test event for transaction',
        coverImage: 'https://example.com/cover.jpg',
        images: [],
        categoryId: category.id,
        locationId: location.id,
        venue: 'Test Venue',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        organizerId,
      },
    });

    eventId = event.id;

    // Create ticket tier
    const ticketTier = await prisma.ticketTier.create({
      data: {
        eventId,
        name: 'Standard Ticket',
        description: 'Standard admission',
        price: 10000,
        quantity: 100,
        benefits: [],
      },
    });

    ticketTierId = ticketTier.id;
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            'transaction-customer@test.com',
            'transaction-organizer@test.com',
          ],
        },
      },
    });
    await prisma.category.deleteMany({});
    await prisma.location.deleteMany({});
  });

  describe('POST /api/transactions', () => {
    it('should create transaction successfully', async () => {
      const transactionData = {
        eventId,
        ticketTierId,
        quantity: 2,
      };

      const response = await supertest(app)
        .post('/api/transactions')
        .set('X-API-TOKEN', customerToken)
        .send(transactionData);

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.quantity).toBe(2);
      expect(response.body.data.status).toBe(TransactionStatus.WAITING_PAYMENT);

      transactionId = response.body.data.id;
    });

    it('should reject transaction with insufficient seats', async () => {
      const transactionData = {
        eventId,
        ticketTierId,
        quantity: 150, // More than available
      };

      const response = await supertest(app)
        .post('/api/transactions')
        .set('X-API-TOKEN', customerToken)
        .send(transactionData);

      expect(response.status).toBe(409);
    });

    it('should reject transaction with insufficient points', async () => {
      // Create customer with no points
      const poorCustomer = await prisma.user.create({
        data: {
          name: 'Poor Customer',
          email: 'poor-customer@test.com',
          password: await bcrypt.hash('password123', 10),
          role: 'CUSTOMER',
          referralCode: `REF-${uuidv4()}`,
          token: 'poor-token',
          points: 0,
        },
      });

      const transactionData = {
        eventId,
        ticketTierId,
        quantity: 1,
        pointsUsed: 10000,
      };

      const response = await supertest(app)
        .post('/api/transactions')
        .set('X-API-TOKEN', poorCustomer.token!)
        .send(transactionData);

      expect(response.status).toBe(400);

      await prisma.user.delete({
        where: { email: 'poor-customer@test.com' },
      });
    });
  });

  describe('POST /api/transactions/:id/upload-proof', () => {
    it('should upload payment proof', async () => {
      const response = await supertest(app)
        .post(`/api/transactions/${transactionId}/upload-proof`)
        .set('X-API-TOKEN', customerToken)
        .send({
          proofUrl: 'https://example.com/proof.jpg',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(
        TransactionStatus.WAITING_CONFIRMATION,
      );
    });
  });

  describe('PATCH /api/transactions/:id/accept', () => {
    it('should accept transaction as organizer', async () => {
      const response = await supertest(app)
        .patch(`/api/transactions/${transactionId}/accept`)
        .set('X-API-TOKEN', organizerToken);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(TransactionStatus.DONE);
    });

    it('should reject acceptance by non-organizer', async () => {
      // Create another transaction first
      const tx = await prisma.transaction.create({
        data: {
          userId: customerId,
          eventId,
          ticketTierId,
          quantity: 1,
          totalAmount: 10000,
          status: TransactionStatus.WAITING_CONFIRMATION,
        },
      });

      const response = await supertest(app)
        .patch(`/api/transactions/${tx.id}/accept`)
        .set('X-API-TOKEN', customerToken);

      expect(response.status).toBe(403);

      await prisma.transaction.delete({ where: { id: tx.id } });
    });
  });

  describe('PATCH /api/transactions/:id/reject', () => {
    it('should reject transaction as organizer', async () => {
      // Create a transaction to reject
      const tx = await prisma.transaction.create({
        data: {
          userId: customerId,
          eventId,
          ticketTierId,
          quantity: 1,
          totalAmount: 10000,
          status: TransactionStatus.WAITING_CONFIRMATION,
        },
      });

      // Increment sold count first
      await prisma.ticketTier.update({
        where: { id: ticketTierId },
        data: { sold: { increment: 1 } },
      });

      const response = await supertest(app)
        .patch(`/api/transactions/${tx.id}/reject`)
        .set('X-API-TOKEN', organizerToken);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(TransactionStatus.REJECTED);
    });
  });

  describe('PATCH /api/transactions/:id/cancel', () => {
    it('should cancel transaction as customer', async () => {
      // Create a transaction to cancel
      const tx = await prisma.transaction.create({
        data: {
          userId: customerId,
          eventId,
          ticketTierId,
          quantity: 1,
          totalAmount: 10000,
          status: TransactionStatus.WAITING_PAYMENT,
        },
      });

      // Increment sold count
      await prisma.ticketTier.update({
        where: { id: ticketTierId },
        data: { sold: { increment: 1 } },
      });

      const response = await supertest(app)
        .patch(`/api/transactions/${tx.id}/cancel`)
        .set('X-API-TOKEN', customerToken);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(TransactionStatus.CANCELED);
    });
  });

  describe('GET /api/transactions', () => {
    it('should list user transactions', async () => {
      const response = await supertest(app)
        .get('/api/transactions')
        .set('X-API-TOKEN', customerToken);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
