# Appliance Repair Operations - Frontend

React frontend for the Appliance Repair Technician Operations system.

## Tech Stack

- React 18
- Vite
- TailwindCSS
- React Router
- Recharts (for charts)
- Axios

## Setup

### Prerequisites

- Node.js 20+

### Installation

```bash
npm install
```

### Running

```bash
# Development
npm run dev

# Production build
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── admin/      # Admin-specific components
│   ├── technician/ # Technician-specific components
│   ├── shared/     # Shared components
│   └── auth/       # Authentication components
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── services/       # API services
├── context/        # React context providers
└── types/          # TypeScript types
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |
