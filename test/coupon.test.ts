import { prisma } from '../src/application/database';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { DiscountType } from '../src/generated/prisma/enums';
import supertest from 'supertest';
import { app } from '../src/application/app';

describe('Coupon Management API', () => {
  let organizerToken: string;
  let customerToken: string;
  let organizerId: string;
  let eventId: string;
  let couponId: string;

  beforeAll(async () => {
    // Create organizer
    const organizer = await prisma.user.create({
      data: {
        name: 'Coupon Organizer',
        email: 'coupon-organizer@test.com',
        password: await bcrypt.hash('password123', 10),
        role: 'ORGANIZER',
        referralCode: `REF-${uuidv4()}`,
        token: 'coupon-organizer-token',
      },
    });

    // Create customer
    const customer = await prisma.user.create({
      data: {
        name: 'Coupon Customer',
        email: 'coupon-customer@test.com',
        password: await bcrypt.hash('password123', 10),
        role: 'CUSTOMER',
        referralCode: `REF-${uuidv4()}`,
        token: 'coupon-customer-token',
      },
    });

    organizerToken = organizer.token!;
    customerToken = customer.token!;
    organizerId = organizer.id;

    // Create event
    const category = await prisma.category.create({
      data: {
        value: 'BUSINESS',
        label: 'Business',
        icon: 'business-icon',
      },
    });

    const location = await prisma.location.create({
      data: {
        name: 'Business Center',
      },
    });

    const event = await prisma.event.create({
      data: {
        title: 'Business Conference',
        description: 'Annual business conference',
        coverImage: 'https://example.com/cover.jpg',
        images: [],
        categoryId: category.id,
        locationId: location.id,
        venue: 'Business Center',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        organizerId,
      },
    });

    eventId = event.id;
  });

  afterAll(async () => {
    await prisma.coupon.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ['coupon-organizer@test.com', 'coupon-customer@test.com'],
        },
      },
    });
    await prisma.category.deleteMany({});
    await prisma.location.deleteMany({});
  });

  describe('POST /api/coupons', () => {
    it('should create event-specific coupon as organizer', async () => {
      const couponData = {
        code: 'DISCOUNT-20',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        usageLimit: 100,
        validFrom: new Date().toISOString(),
        validUntil: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        eventId,
      };

      const response = await supertest(app)
        .post('/api/coupons')
        .set('X-API-TOKEN', organizerToken)
        .send(couponData);

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.code).toBe('DISCOUNT-20');

      couponId = response.body.data.id;
    });

    it('should reject coupon creation for customer', async () => {
      const couponData = {
        code: 'FAIL-COUPON',
        discountType: DiscountType.FIXED,
        discountValue: 5000,
        usageLimit: 50,
        validFrom: new Date().toISOString(),
        validUntil: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        eventId,
      };

      const response = await supertest(app)
        .post('/api/coupons')
        .set('X-API-TOKEN', customerToken)
        .send(couponData);

      expect(response.status).toBe(403);
    });

    it('should reject duplicate coupon code', async () => {
      const couponData = {
        code: 'DISCOUNT-20',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        usageLimit: 100,
        validFrom: new Date().toISOString(),
        validUntil: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };

      const response = await supertest(app)
        .post('/api/coupons')
        .set('X-API-TOKEN', organizerToken)
        .send(couponData);

      expect(response.status).toBe(409);
    });

    it('should reject invalid code format', async () => {
      const couponData = {
        code: 'invalid-code!',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        usageLimit: 100,
        validFrom: new Date().toISOString(),
        validUntil: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };

      const response = await supertest(app)
        .post('/api/coupons')
        .set('X-API-TOKEN', organizerToken)
        .send(couponData);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/coupons/validate', () => {
    it('should validate coupon successfully', async () => {
      const validateData = {
        couponCode: 'DISCOUNT-20',
        eventId,
        amount: 100000,
      };

      const response = await supertest(app)
        .post('/api/coupons/validate')
        .set('X-API-TOKEN', customerToken)
        .send(validateData);

      expect(response.status).toBe(200);
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.discountAmount).toBeGreaterThan(0);
    });

    it('should reject non-existent coupon', async () => {
      const validateData = {
        couponCode: 'NONEXISTENT',
        eventId,
        amount: 100000,
      };

      const response = await supertest(app)
        .post('/api/coupons/validate')
        .set('X-API-TOKEN', customerToken)
        .send(validateData);

      expect(response.status).toBe(200);
      expect(response.body.data.isValid).toBe(false);
    });

    it('should validate event specific coupon', async () => {
      // Create another event
      const category = await prisma.category.findFirst();
      const location = await prisma.location.findFirst();

      const otherEvent = await prisma.event.create({
        data: {
          title: 'Other Event',
          description: 'Different event',
          coverImage: 'https://example.com/cover.jpg',
          images: [],
          categoryId: category!.id,
          locationId: location!.id,
          venue: 'Other Venue',
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          organizerId,
        },
      });

      // Try to use event-specific coupon on different event
      const validateData = {
        couponCode: 'DISCOUNT-20',
        eventId: otherEvent.id, // Different event
        amount: 100000,
      };

      const response = await supertest(app)
        .post('/api/coupons/validate')
        .set('X-API-TOKEN', customerToken)
        .send(validateData);

      expect(response.status).toBe(200);
      expect(response.body.data.isValid).toBe(false);

      await prisma.event.delete({ where: { id: otherEvent.id } });
    });
  });
});
