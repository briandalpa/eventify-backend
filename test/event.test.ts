import supertest from 'supertest';
import { app } from '../src/application/app';
import bcrypt from 'bcrypt';
import { prisma } from '../src/application/database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../src/application/logging';

describe('Event Management API', () => {
  let organizerToken: string;
  let customerToken: string;
  let categoryId: string;
  let locationId: string;
  let eventId: string;

  beforeAll(async () => {
    // Create organizer and customer users
    const organizer = await prisma.user.create({
      data: {
        name: 'Test Organizer',
        email: 'organizer@test.com',
        password: await bcrypt.hash('password123', 10),
        role: 'ORGANIZER',
        referralCode: `REF-${uuidv4()}`,
        token: 'organizer-token',
      },
    });

    const customer = await prisma.user.create({
      data: {
        name: 'Test Customer',
        email: 'customer@test.com',
        password: await bcrypt.hash('password123', 10),
        role: 'CUSTOMER',
        referralCode: `REF-${uuidv4()}`,
        token: 'customer-token',
      },
    });

    organizerToken = organizer.token!;
    customerToken = customer.token!;

    // Create category and location
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

    categoryId = category.id;
    locationId = location.id;
  });

  afterAll(async () => {
    await prisma.event.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: { in: ['organizer@test.com', 'customer@test.com'] },
      },
    });
    await prisma.category.deleteMany({});
    await prisma.location.deleteMany({});
  });

  describe('POST /api/events', () => {
    it('should create event successfully as organizer', async () => {
      const eventData = {
        title: 'Tech Conference 2026',
        description:
          'A Comprehensive technology conference covering latest trends',
        shortDescription: 'Latest tech trends',
        coverImage: 'https://example.com/cover.jpg',
        image: ['https://example.com/cover.jpg'],
        categoryId,
        locationId,
        venue: 'Convention Center',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isFree: false,
        ticketTiers: [
          {
            name: 'Early Bird',
            description: 'Early bird tickets',
            price: 5000,
            quantity: 100,
            benefits: ['Free merchandise'],
          },
        ],
      };

      const response = await supertest(app)
        .post('/api/events')
        .set('X-API-TOKEN', organizerToken)
        .send(eventData);

      logger.debug(response.body);
      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe('Tech Conference 2026');
      expect(response.body.data.ticketTiers).toHaveLength(1);

      eventId = response.body.data.id;
    });

    it('should reject event creation for customer role', async () => {
      const eventData = {
        title: 'Unauthorized Event',
        description: 'This should fail',
        shortDescription: 'Latest tech trends',
        coverImage: 'https://example.com/cover.jpg',
        image: ['https://example.com/cover.jpg'],
        categoryId,
        locationId,
        venue: 'Test Venue',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isFree: true,
        ticketTiers: [
          {
            name: 'Free Tier',
            description: 'Free tickets',
            price: 0,
            quantity: 100,
          },
        ],
      };

      const response = await supertest(app)
        .post('/api/events')
        .set('X-API-TOKEN', customerToken)
        .send(eventData);

      logger.debug(response.body);
      expect(response.status).toBe(403);
    });

    it('should reject creation with invalid date', async () => {
      const eventData = {
        title: 'Past Event',
        description: 'This event is in the past',
        categoryId,
        locationId,
        venue: 'Test Venue',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        isFree: true,
        ticketTiers: [
          {
            name: 'Free Tier',
            description: 'Free tickets',
            price: 0,
            quantity: 100,
          },
        ],
      };

      const response = await supertest(app)
        .post('/api/events')
        .set('X-API-TOKEN', organizerToken)
        .send(eventData);

      logger.debug(response.body);
      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/events/:id', () => {
    let otherOrganizerEmail = 'other-organizer@test.com';

    afterEach(async () => {
      // Clean up other organizer if exists
      await prisma.user.deleteMany({
        where: { email: otherOrganizerEmail },
      });
    });

    it('should update own event as organizer', async () => {
      const updateData = {
        title: 'Updated Tech Conference',
        description: 'Updated description for tech conference',
      };

      const response = await supertest(app)
        .patch(`/api/events/${eventId}`)
        .set('X-API-TOKEN', organizerToken)
        .send(updateData);

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Updated Tech Conference');
    });

    it('should reject update for other organizer event', async () => {
      // Create another organizer
      const otherOrganizer = await prisma.user.create({
        data: {
          name: 'Other Organizer',
          email: 'other-organizer@test.com',
          password: await bcrypt.hash('password123', 10),
          role: 'ORGANIZER',
          referralCode: `REF-${uuidv4()}`,
          token: 'other-organizer-token',
        },
      });

      const response = await supertest(app)
        .patch(`/api/events/${eventId}`)
        .set('X-API-TOKEN', otherOrganizer.token!)
        .send({ title: 'Hacked Title' });

      logger.debug(response.body);
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/events', () => {
    it('should list events with pagination', async () => {
      const response = await supertest(app).get('/api/events?page=1&limit=10');

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter events by category', async () => {
      const response = await supertest(app).get(
        `/api/events?category=${categoryId}`,
      );

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/events/search', () => {
    it('should search events', async () => {
      const response = await supertest(app).get('/api/events/search?q=Tech');

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should reject search without query', async () => {
      const response = await supertest(app).get('/api/events/search');

      logger.debug(response.body);
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/events/:id', () => {
    it('should delete own event as organizer', async () => {
      // Create a new event to delete
      const newEvent = await prisma.event.create({
        data: {
          title: 'Event to Delete',
          description: 'This event will be deleted',
          coverImage: 'https://example.com/cover.jpg',
          images: [],
          categoryId,
          locationId,
          venue: 'Test Venue',
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          organizerId: (await prisma.user.findUnique({
            where: { token: organizerToken! },
          }))!.id,
        },
      });

      const response = await supertest(app)
        .delete(`/api/events/${newEvent.id}`)
        .set('X-API-TOKEN', organizerToken);

      logger.debug(response.body);
      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/organizer/events', () => {
    it('should list organizer events', async () => {
      const response = await supertest(app)
        .get('/api/organizer/events')
        .set('X-API-TOKEN', organizerToken);

      logger.debug(response.body);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
