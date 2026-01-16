# Appliance Repair Technician Operations App

Internal operations management system for appliance repair businesses. Handles technician scheduling, call routing via RingCentral, quota enforcement, and service record management.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control (Admin/Technician)
- **RingCentral Integration**: Inbound call webhook handling with intelligent routing
- **Quota Management**: Weekly completion quotas with automatic lockout enforcement
- **Scheduling System**: Technician availability and shift management
- **Service Records**: Complete service history with notes and status tracking
- **Admin Dashboard**: Full oversight with override capabilities
- **Audit Logging**: Complete audit trail for all system actions

## Tech Stack

- **Backend**: Node.js, NestJS, Prisma ORM
- **Database**: PostgreSQL
- **Frontend**: React (Vite), TailwindCSS
- **Infrastructure**: Docker, NGINX

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- RingCentral Developer Account

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/your-org/appliance-repair-ops.git
cd appliance-repair-ops
```

2. Copy environment file and configure:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start all services:
```bash
docker-compose up --build
```

4. Run database migrations:
```bash
docker-compose exec backend npx prisma migrate deploy
```

5. Seed initial admin user:
```bash
docker-compose exec backend npx prisma db seed
```

6. Access the application:
- Frontend: http://localhost
- API: http://localhost/api
- API Docs: http://localhost/api/docs

### Default Credentials

After seeding:
- **Admin**: admin@company.com / admin123
- **Demo Technician**: tech@company.com / tech123

## Environment Variables

See `.env.example` for all configuration options.

### Required Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `RINGCENTRAL_CLIENT_ID` | RingCentral app client ID |
| `RINGCENTRAL_CLIENT_SECRET` | RingCentral app client secret |
| `RINGCENTRAL_SERVER_URL` | RingCentral API server URL |
| `RINGCENTRAL_WEBHOOK_VERIFICATION_TOKEN` | Webhook verification token |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   NGINX     │────▶│   React     │     │ RingCentral │
│   :80/:443  │     │   Frontend  │     │   Webhooks  │
└──────┬──────┘     └─────────────┘     └──────┬──────┘
       │                                        │
       ▼                                        ▼
┌─────────────┐                         ┌─────────────┐
│   NestJS    │◀────────────────────────│  Webhook    │
│   Backend   │                         │  Handler    │
└──────┬──────┘                         └─────────────┘
       │
       ▼
┌─────────────┐
│ PostgreSQL  │
│   Database  │
└─────────────┘
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Current user info

### Technicians
- `GET /api/technicians` - List all technicians
- `GET /api/technicians/:id` - Get technician details
- `POST /api/technicians` - Create technician (Admin)
- `PATCH /api/technicians/:id` - Update technician
- `PATCH /api/technicians/:id/lock` - Lock/unlock technician (Admin)

### Schedules
- `GET /api/schedules` - List schedules
- `POST /api/schedules` - Create schedule entry
- `PATCH /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

### Service Records
- `GET /api/service-records` - List service records
- `POST /api/service-records` - Create service record
- `PATCH /api/service-records/:id` - Update service record
- `PATCH /api/service-records/:id/complete` - Mark as complete

### Calls
- `GET /api/calls` - List calls
- `GET /api/calls/:id` - Get call details

### Webhooks
- `POST /api/webhooks/ringcentral/incoming-call` - RingCentral webhook

### Admin
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/audit-logs` - Audit log history
- `POST /api/admin/quota/reset` - Manual quota reset

## RingCentral Setup

1. Create a RingCentral Developer account
2. Create a new application with "Server/Web" platform type
3. Enable the following permissions:
   - Read Accounts
   - Read Call Log
   - Webhook Subscriptions
4. Configure webhook URL: `https://your-domain.com/api/webhooks/ringcentral/incoming-call`
5. Set verification token in environment variables

## Quota System

- Default weekly quota: 25 completed service records
- Quota resets every Monday at midnight (configurable)
- Technicians below quota are automatically locked
- Locked technicians are excluded from call routing
- Admins can manually unlock technicians

## Production Deployment

### Ubuntu VPS

1. Install Docker and Docker Compose:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

2. Clone and configure:
```bash
git clone https://github.com/your-org/appliance-repair-ops.git
cd appliance-repair-ops
cp .env.example .env
nano .env  # Configure production values
```

3. Start services:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

4. Set up SSL with Certbot:
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

5. Update NGINX configuration with SSL certificates

### Database Backups

```bash
# Create backup
docker-compose exec db pg_dump -U postgres appliance_repair > backup.sql

# Restore backup
docker-compose exec -T db psql -U postgres appliance_repair < backup.sql
```

## Development

### Backend

```bash
cd backend
npm install
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Database

```bash
cd backend
npx prisma migrate dev
npx prisma studio  # Visual database browser
```

## Testing

```bash
# Backend tests
cd backend
npm run test
npm run test:e2e

# Frontend tests
cd frontend
npm run test
```

## License

MIT License - See LICENSE.md
