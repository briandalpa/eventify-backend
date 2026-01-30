const prisma = {
  user: {
    count: jest.fn().mockResolvedValue(0),
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: '1',
      name: 'Test',
      email: 'test@example.com',
      password: 'hashed_password',
      role: 'CUSTOMER',
      referralCode: 'ABC12345',
      referredBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      avatarUrl: null,
      phone: null,
      bio: null,
    }),
  },
  userPoint: {
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
  },
};

jest.mock('../src/application/database', () => ({
  prisma,
}));

module.exports = {};
