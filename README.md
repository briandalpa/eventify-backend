# Eventify

RESTful API for event management platform built with Node.js, Express, TypeScript, and Prisma ORM. Handles event operations, transactions, user authentication, and automated workflows.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: Better Auth
- **Validation**: Zod
- **Email**: Nodemailer
- **Scheduling**: Node-cron
- **Testing**: Jest, Supertest

## Features

### Core Functionality

- User authentication with role-based access (Customer/Organizer)
- Event CRUD operations with categories and locations
- Multi-tier ticket pricing system
- Transaction processing with status workflow
- Point and coupon redemption system
- Referral system with rewards
- Event reviews and ratings
- Email notifications
- Dashboard analytics

### Automated Jobs

- Transaction expiration (2 hours after creation)
- Transaction auto-cancellation (3 days without organizer action)
- Point expiration (3 months)
- Coupon expiration (3 months)

### Business Rules

- 6 transaction statuses: `WAITING_PAYMENT`, `WAITING_CONFIRMATION`, `DONE`, `REJECTED`, `EXPIRED`, `CANCELED`
- Automatic rollback of points/vouchers on cancellation
- Seat restoration on failed transactions
- Payment proof upload within 2-hour window

## Project Structure

```
src/
├── application/      # App configuration and setup
├── controller/       # Request handlers
├── error/           # Custom error classes
├── generated/       # Prisma client
├── jobs/            # Scheduled cron jobs
├── middleware/      # Express middlewares
├── model/           # Domain models
├── route/           # API route definitions
├── service/         # Business logic layer
├── types/           # TypeScript types
├── utils/           # Helper functions
├── validations/     # Zod schemas
└── main.ts          # Application entry point
```

## Database Schema

Key entities:

- **User**: Authentication, roles, referral system
- **Event**: Event details, pricing, categories
- **TicketTier**: Multi-tier ticket pricing
- **Transaction**: Purchase workflow
- **TransactionItem**: Line items per transaction
- **Point**: Point balance and expiration
- **Coupon**: Discount coupons with expiration
- **Voucher**: Event-specific promotions
- **Review**: Post-event ratings

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd eventify-backend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

```env
PORT=2000
DATABASE_URL="postgresql://user:password@localhost:5432/eventify"
BETTER_AUTH_SECRET=your_auth_secret
BETTER_AUTH_URL=http://localhost:2000

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

4. Run Prisma migrations:

```bash
npx prisma migrate dev
```

5. Generate Prisma client:

```bash
npx prisma generate
```

6. (Optional) Seed database:

```bash
npx prisma db seed
```

## Development

Start development server with hot reload:

```bash
npm run dev
```

Server runs on `http://localhost:2000`

## Production

Build TypeScript:

```bash
npm run build
```

Start production server:

```bash
npm start
```

## Testing

Run all tests:

```bash
npm run test
```

Test coverage includes:

- User authentication and authorization
- Event CRUD operations
- Transaction workflow
- Coupon validation
- Dashboard analytics
- Review submission

## API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/sign-in/email` - User login
- `POST /api/auth/sign-out` - User logout

### Events

- `GET /api/events` - List events with filters
- `GET /api/events/:id` - Event details
- `POST /api/events` - Create event (Organizer)
- `PUT /api/events/:id` - Update event (Organizer)
- `DELETE /api/events/:id` - Delete event (Organizer)

### Transactions

- `POST /api/transactions` - Create transaction
- `GET /api/transactions` - List user transactions
- `PUT /api/transactions/:id/payment-proof` - Upload payment proof
- `PUT /api/transactions/:id/confirm` - Confirm transaction (Organizer)
- `PUT /api/transactions/:id/reject` - Reject transaction (Organizer)
- `PUT /api/transactions/:id/cancel` - Cancel transaction (Customer)

### Reviews

- `POST /api/reviews` - Submit review
- `GET /api/reviews/event/:eventId` - Event reviews

### Dashboard

- `GET /api/dashboard/stats` - Organizer statistics
- `GET /api/dashboard/transactions` - Transaction management
- `GET /api/dashboard/attendees/:eventId` - Attendee list

### Others

- `GET /api/categories` - Event categories
- `GET /api/locations` - Available locations
- `GET /api/user/profile` - User profile
- `PUT /api/user/profile` - Update profile

## Scheduled Jobs

Cron jobs run automatically:

1. **Transaction Expiration** (Every minute)
   - Expires transactions without payment proof after 2 hours
   - Restores seats and returns coupons/points

2. **Transaction Auto Cancel** (Every minute)
   - Cancels transactions pending organizer action after 3 days
   - Sends notification emails

3. **Point Expiration** (Daily at midnight)
   - Expires points after 3 months

4. **Coupon Expiration** (Daily at midnight)
   - Marks expired coupons as used

## Error Handling

Custom error classes:

- `ResponseError` - API errors with status codes
- `ValidationError` - Zod validation errors
- Global error middleware with proper logging

## Logging

Winston logger with:

- Console transport for development
- File transport for production
- Error and info level separation

## Database Transactions

Critical operations wrapped in Prisma transactions:

- Transaction creation with seat locking
- Payment confirmation with point/coupon updates
- Transaction cancellation with rollbacks

## Contributing

1. Follow TypeScript strict mode
2. Add unit tests for new features
3. Use Prisma migrations for schema changes
4. Validate inputs with Zod schemas
5. Handle errors appropriately

## License

MIT
