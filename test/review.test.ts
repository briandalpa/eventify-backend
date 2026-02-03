import { prisma } from '../src/application/database';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { TransactionStatus } from '../src/generated/prisma/enums';
import supertest from 'supertest';
import { app } from '../src/application/app';
import { logger } from '../src/application/logging';

describe('Review & Rating API', () => {
  let customerToken: string;
  let organizerToken: string;
  let eventId: string;
  let transactionId: string;
  let ticketTierId: string;
  let customerId: string;
  let organizerId: string;
  beforeAll(async () => {
    // Create customer
    const customer = await prisma.user.create({
      data: {
        name: 'Review Customer',
        email: 'review-customer@test.com',
        password: await bcrypt.hash('password123', 10),
        role: 'CUSTOMER',
        referralCode: `REF-${uuidv4()}`,
        token: 'review-customer-token',
      },
    });

    // Create organizer
    const organizer = await prisma.user.create({
      data: {
        name: 'Review Organizer',
        email: 'review-organizer@test.com',
        password: await bcrypt.hash('password123', 10),
        role: 'ORGANIZER',
        referralCode: `REF-${uuidv4()}`,
        token: 'review-organizer-token',
      },
    });

    customerToken = customer.token!;
    organizerToken = organizer.token!;
    customerId = customer.id;
    organizerId = organizer.id;

    // Create category, location, event, and ticket tier
    const category = await prisma.category.create({
      data: {
        value: 'MUSIC',
        label: 'Music',
        icon: 'music-icon',
      },
    });

    const location = await prisma.location.create({
      data: {
        name: 'Concert Hall',
      },
    });

    // Event that already happened
    const event = await prisma.event.create({
      data: {
        title: 'Past Concert',
        description: 'A concert that already happened',
        coverImage: 'https://example.com/cover.jpg',
        images: [],
        categoryId: category.id,
        locationId: location.id,
        venue: 'Concert Hall',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        organizerId,
      },
    });

    eventId = event.id;

    // Create ticket tier
    const ticketTier = await prisma.ticketTier.create({
      data: {
        eventId,
        name: 'General Admission',
        description: 'General admission tickets',
        price: 5000,
        quantity: 100,
        benefits: [],
      },
    });

    ticketTierId = ticketTier.id;

    // Create completed transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: customerId,
        eventId,
        ticketTierId,
        quantity: 2,
        totalAmount: 10000,
        status: TransactionStatus.DONE,
      },
    });

    transactionId = transaction.id;
  });

  afterAll(async () => {
    await prisma.review.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['review-customer@test.com', 'review-organizer@test.com'],
        },
      },
    });
    await prisma.category.deleteMany({});
    await prisma.location.deleteMany({});
  });

  describe('POST /api/reviews', () => {
    it('should create review for completed transaction', async () => {
      const reviewData = {
        transactionId,
        rating: 5,
        comment: 'Great concert!',
      };

      const response = await supertest(app)
        .post('/api/reviews')
        .set('X-API-TOKEN', customerToken)
        .send(reviewData);

      logger.debug(response.body);
      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.rating).toBe(5);
    });

    it('should reject review for pending transaction', async () => {
      // Create pending transaction
      const pendingTx = await prisma.transaction.create({
        data: {
          userId: customerId,
          eventId,
          ticketTierId,
          quantity: 1,
          totalAmount: 5000,
          status: TransactionStatus.WAITING_PAYMENT,
        },
      });

      const reviewData = {
        transactionId: pendingTx.id,
        rating: 4,
        comment: 'Cannot review pending transaction',
      };

      const response = await supertest(app)
        .post('/api/reviews')
        .set('X-API-TOKEN', customerToken)
        .send(reviewData);

      logger.debug(response.body);
      expect(response.status).toBe(400);

      await prisma.transaction.delete({ where: { id: pendingTx.id } });
    });

    it('should reject review before event date', async () => {
      // Create future event
      const futureEvent = await prisma.event.create({
        data: {
          title: 'Future Event',
          description: 'Event in the future',
          coverImage: 'https://example.com/cover.jpg',
          images: [],
          categoryId: (await prisma.category.findFirst())!.id,
          locationId: (await prisma.location.findFirst())!.id,
          venue: 'Future Venue',
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          organizerId,
        },
      });

      const futureTicketTier = await prisma.ticketTier.create({
        data: {
          eventId: futureEvent.id,
          name: 'Future Tickets',
          description: 'Tickets for future event',
          price: 5000,
          quantity: 100,
          benefits: [],
        },
      });

      const futureTx = await prisma.transaction.create({
        data: {
          userId: customerId,
          eventId: futureEvent.id,
          ticketTierId: futureTicketTier.id,
          quantity: 1,
          totalAmount: 5000,
          status: TransactionStatus.DONE,
        },
      });

      const reviewData = {
        transactionId: futureTx.id,
        rating: 5,
        comment: 'Event has not happened yet',
      };

      const response = await supertest(app)
        .post('/api/reviews')
        .set('X-API-TOKEN', customerToken)
        .send(reviewData);

      logger.debug(response.body);
      expect(response.status).toBe(400);

      await prisma.transaction.delete({ where: { id: futureTx.id } });
      await prisma.ticketTier.delete({ where: { id: futureTicketTier.id } });
      await prisma.event.delete({ where: { id: futureEvent.id } });
    });

    it('should reject invalid rating values', async () => {
      // Create another completed transaction
      const anotherTx = await prisma.transaction.create({
        data: {
          userId: customerId,
          eventId,
          ticketTierId,
          quantity: 1,
          totalAmount: 5000,
          status: TransactionStatus.DONE,
        },
      });

      const reviewData = {
        transactionId: anotherTx.id,
        rating: 10,
        comment: 'Invalid rating',
      };

      const response = await supertest(app)
        .post('/api/reviews')
        .set('X-API-TOKEN', customerToken)
        .send(reviewData);

      logger.debug(response.body);
      expect(response.status).toBe(400);

      await prisma.transaction.delete({ where: { id: anotherTx.id } });
    });
  });
});
