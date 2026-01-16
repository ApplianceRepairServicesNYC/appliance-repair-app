# Appliance Repair Operations - Backend

NestJS backend API for the Appliance Repair Technician Operations system.

## Tech Stack

- NestJS 10
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Class Validator

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+

### Installation

```bash
npm install
```

### Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Open Prisma Studio
npx prisma studio
```

### Running

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Documentation

Swagger documentation available at `/docs` when running.

## Project Structure

```
src/
├── auth/           # Authentication module
├── users/          # User management
├── technicians/    # Technician management
├── calls/          # Call records
├── schedules/      # Scheduling system
├── service-records/# Service record tracking
├── webhooks/       # RingCentral webhooks
├── admin/          # Admin dashboard
└── common/         # Shared utilities
```

## Environment Variables

See `.env.example` in the root directory.
