# RsuShop — Instagram Auto DM SaaS Platform

A production-ready Instagram DM automation platform similar to ManyChat and LinkDM, built with modern technologies.

## Features

- **Visual Flow Builder** — Drag-and-drop automation workflows
- **AI Agent** — GPT-4 powered responses that understand intent
- **Multi-Account Support** — Manage multiple Instagram accounts
- **Lead Capture** — Automatic extraction of emails, names, and custom fields
- **Real-time Inbox** — Unified conversation management
- **Analytics Dashboard** — Track performance metrics
- **Stripe Billing** — Subscription and usage-based billing
- **Affiliate System** — 30% recurring commission for referrals

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, React Flow |
| Backend | Node.js 20, Express, TypeScript |
| Database | MongoDB 7, Mongoose 8 |
| Queue | BullMQ 5, Redis 7 |
| AI | OpenAI GPT-4o-mini |
| Payments | Stripe |
| Container | Docker Compose |

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- MongoDB (or use MongoDB Atlas)
- Redis (or use Redis Cloud)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/rsushop.git
cd rsushop
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Start Development

```bash
# Start infrastructure (MongoDB, Redis)
docker-compose up -d mongodb redis

# Start API server
npm run dev:api

# Start worker (in another terminal)
npm run dev:worker

# Start frontend
npm run dev:web
```

### 4. Production Deployment

```bash
# Configure environment
cp .env.example .env
# Fill in all production values

# Deploy with Docker
chmod +x docker/deploy.sh
./docker/deploy.sh
```

## Project Structure

```
rsushop/
├── apps/
│   ├── api/          # Express API server
│   │   ├── src/
│   │   │   ├── config/     # DB, Redis, App config
│   │   │   ├── controllers/ # Route handlers
│   │   │   ├── middleware/  # Auth, validation, errors
│   │   │   ├── models/      # Mongoose models
│   │   │   ├── routes/      # Express routes
│   │   │   ├── services/    # Business logic
│   │   │   └── utils/       # Helpers
│   │   └── Dockerfile
│   │
│   ├── worker/       # BullMQ background workers
│   │   ├── src/
│   │   │   ├── processors/  # Job processors
│   │   │   └── queues/      # Queue configuration
│   │   └── Dockerfile
│   │
│   └── web/          # Next.js frontend
│       ├── app/      # App Router pages
│       ├── components/ # React components
│       └── lib/     # Auth context, utilities
│
├── packages/
│   └── shared/       # Shared types and utils
│
├── docker/           # Docker & nginx config
└── SPEC.md          # Full technical specification
```

## API Documentation

Base URL: `http://localhost:3001/api/v1`

### Authentication

```bash
# Register
POST /auth/register
{ "email", "password", "firstName", "lastName" }

# Login
POST /auth/login
{ "email", "password" }

# Response
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { ... },
  "workspace": { ... }
}
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /automations | List automations |
| POST | /automations | Create automation |
| POST | /automations/:id/activate | Activate flow |
| GET | /contacts | List contacts |
| GET | /conversations | List conversations |
| POST | /ai/generate-reply | Generate AI response |
| POST | /billing/subscribe | Start subscription |

## Instagram Setup

### 1. Create Meta App

1. Go to [Meta Developers](https://developers.facebook.com)
2. Create App → Business → RsuShop Platform
3. Add Products: Instagram Graph API, Webhooks

### 2. Configure Permissions

Required permissions:
- `instagram_basic`
- `instagram_manage_messages`
- `instagram_manage_comments`
- `pages_read_engagement`

### 3. Set Up OAuth

Redirect URL: `https://your-domain.com/auth/instagram/callback`

### 4. Get API Credentials

Add to `.env`:
```
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
```

## Stripe Setup

### 1. Create Products

Create 3 products in Stripe Dashboard:
- Starter: $29/mo
- Pro: $79/mo
- Agency: $199/mo

### 2. Configure Webhooks

Webhook URL: `https://your-domain.com/api/v1/webhooks/stripe`

Events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### 3. Get API Keys

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Architecture

### Flow Execution Engine

```
Trigger Event → Load Flow → Execute Nodes → Queue Actions → Complete
     ↓
  Validate
     ↓
  Run Message Node → Queue DM Job → BullMQ → Instagram API
     ↓
  Run AI Node → Queue AI Job → BullMQ → OpenAI → Queue DM Job
     ↓
  Condition Node → Evaluate → Route to branch
```

### Rate Limiting

- 250 messages/min per Instagram account
- Exponential backoff on failures
- Priority queues for urgent messages
- Usage tracking per workspace

## Development

### Run Tests

```bash
npm test
```

### Type Checking

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
```

## License

MIT License — see LICENSE file for details.

---

Built with passion by the RsuShop team. For questions, contact support@rsushop.com
