import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../src/application/database';
import { TransactionStatus } from '../src/generated/prisma/enums';
import supertest from 'supertest';
import { app } from '../src/application/app';
import { logger } from '../src/application/logging';

describe('Dashboard API', () => {
  let organizerToken: string;
  let customerToken: string;
  let organizerId: string;
  let eventId: string;

  beforeAll(async () => {
    // Create organizer
    const organizer = await prisma.user.create({
      data: {
        name: 'Dashboard Organizer',
        email: 'dashboard-organizer@test.com',
        password: await bcrypt.hash('password123', 10),
        role: 'ORGANIZER',
        referralCode: `REF-${uuidv4()}`,
        token: 'dashboard-organizer-token',
      },
    });

    // Create customer
    const customer = await prisma.user.create({
      data: {
        name: 'Dashboard Customer',
        email: 'dashboard-customer@test.com',
        password: await bcrypt.hash('password123', 10),
        role: 'CUSTOMER',
        referralCode: `REF-${uuidv4()}`,
        token: 'dashboard-customer-token',
      },
    });

    organizerToken = organizer.token!;
    customerToken = customer.token!;
    organizerId = organizer.id;

    // Create category, location, and event
    const category = await prisma.category.create({
      data: {
        value: 'EDUCATION',
        label: 'Education',
        icon: 'education-icon',
      },
    });

    const location = await prisma.location.create({
      data: {
        name: 'University Hall',
      },
    });

    const event = await prisma.event.create({
      data: {
        title: 'Workshop 2024',
        description: 'Educational workshop',
        coverImage: 'https://example.com/cover.jpg',
        images: [],
        categoryId: category.id,
        locationId: location.id,
        venue: 'University Hall',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        organizerId,
      },
    });

    eventId = event.id;

    // Create ticket tier
    const ticketTier = await prisma.ticketTier.create({
      data: {
        eventId,
        name: 'Standard Pass',
        description: 'Standard workshop pass',
        price: 50000,
        quantity: 100,
        benefits: [],
      },
    });

    // Create completed transactions
    for (let i = 0; i < 5; i++) {
      await prisma.transaction.create({
        data: {
          userId: customer.id,
          eventId,
          ticketTierId: ticketTier.id,
          quantity: 2,
          totalAmount: 100000,
          status: TransactionStatus.DONE,
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['dashboard-organizer@test.com', 'dashboard-customer@test.com'],
        },
      },
    });
    await prisma.category.deleteMany({});
    await prisma.location.deleteMany({});
  });

  describe('GET /api/dashboard/stats', () => {
    it('should return overall statistics for organizer', async () => {
      const response = await supertest(app)
        .get('/api/dashboard/stats')
        .set('X-API-TOKEN', organizerToken);

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalEvents).toBeGreaterThan(0);
      expect(response.body.data.totalRevenue).toBeGreaterThan(0);
      expect(response.body.data.totalTicketsSold).toBeGreaterThan(0);
    });

    it('should reject dashboard access for customer', async () => {
      const response = await supertest(app)
        .get('/api/dashboard/stats')
        .set('X-API-TOKEN', customerToken);

      logger.debug(response.body);
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/dashboard/revenue', () => {
    it('should return monthly revenue', async () => {
      const response = await supertest(app)
        .get('/api/dashboard/revenue?period=month')
        .set('X-API-TOKEN', organizerToken);

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.periods).toBeDefined();
      expect(Array.isArray(response.body.data.periods)).toBe(true);
    });

    it('should return daily revenue', async () => {
      const response = await supertest(app)
        .get('/api/dashboard/revenue?period=day')
        .set('X-API-TOKEN', organizerToken);

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.periods).toBeDefined();
    });

    it('should return yearly revenue', async () => {
      const response = await supertest(app)
        .get('/api/dashboard/revenue?period=year')
        .set('X-API-TOKEN', organizerToken);

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.periods).toBeDefined();
    });

    it('should reject for non-organizer', async () => {
      const response = await supertest(app)
        .get('/api/dashboard/revenue?period=month')
        .set('X-API-TOKEN', customerToken);

      logger.debug(response.body);
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/dashboard/events', () => {
    it('should return event performance metrics', async () => {
      const response = await supertest(app)
        .get('/api/dashboard/events')
        .set('X-API-TOKEN', organizerToken);

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.events).toBeDefined();
      expect(Array.isArray(response.body.data.events)).toBe(true);
    });

    it('should include attendance rate and ratings', async () => {
      const response = await supertest(app)
        .get('/api/dashboard/events')
        .set('X-API-TOKEN', organizerToken);

      logger.debug(response.body);
      expect(response.status).toBe(200);
      if (response.body.data.events.length > 0) {
        const event = response.body.data.events[0];

        logger.debug(response.body);
        expect(event.eventId).toBeDefined();
        expect(event.totalRevenue).toBeDefined();
        expect(event.attendanceRate).toBeDefined();
        expect(event.averageRating).toBeDefined();
      }
    });

    it('should reject for non-organizer', async () => {
      const response = await supertest(app)
        .get('/api/dashboard/events')
        .set('X-API-TOKEN', customerToken);

      logger.debug(response.body);
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/dashboard/attendees/:eventId', () => {
    it('should return event attendee list', async () => {
      const response = await supertest(app)
        .get(`/api/dashboard/attendees/${eventId}`)
        .set('X-API-TOKEN', organizerToken);

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.eventId).toBe(eventId);
      expect(response.body.data.attendees).toBeDefined();
      expect(Array.isArray(response.body.data.attendees)).toBe(true);
      expect(response.body.data.totalAttendees).toBeGreaterThan(0);
    });

    it('should include attendee details', async () => {
      const response = await supertest(app)
        .get(`/api/dashboard/attendees/${eventId}`)
        .set('X-API-TOKEN', organizerToken);

      logger.debug(response.body);
      expect(response.status).toBe(200);
      if (response.body.data.attendees.length > 0) {
        const attendee = response.body.data.attendees[0];

        logger.debug(response.body);
        expect(attendee.userName).toBeDefined();
        expect(attendee.userEmail).toBeDefined();
        expect(attendee.ticketTierName).toBeDefined();
        expect(attendee.quantity).toBeDefined();
        expect(attendee.totalPaid).toBeDefined();
        expect(attendee.transactionDate).toBeDefined();
      }
    });

    it('should reject access for non-organizer', async () => {
      const response = await supertest(app)
        .get(`/api/dashboard/attendees/${eventId}`)
        .set('X-API-TOKEN', customerToken);

      logger.debug(response.body);
      expect(response.status).toBe(403);
    });

    it('should reject access for other organizer', async () => {
      // Create another organizer
      const otherOrganizer = await prisma.user.create({
        data: {
          name: 'Other Organizer',
          email: 'other-dashboard@test.com',
          password: await bcrypt.hash('password123', 10),
          role: 'ORGANIZER',
          referralCode: `REF-${uuidv4()}`,
          token: 'other-dashboard-token',
        },
      });

      const response = await supertest(app)
        .get(`/api/dashboard/attendees/${eventId}`)
        .set('X-API-TOKEN', otherOrganizer.token!);

      logger.debug(response.body);
      expect(response.status).toBe(403);

      await prisma.user.delete({
        where: { email: 'other-dashboard@test.com' },
      });
    });

    it('should handle non-existent event', async () => {
      const fakeId = 'nonexistent-id';

      const response = await supertest(app)
        .get(`/api/dashboard/attendees/${fakeId}`)
        .set('X-API-TOKEN', organizerToken);

      logger.debug(response.body);
      expect(response.status).toBe(404);
    });
  });
});
