# RsuShop — Render Deployment Guide

## Prerequisites

1. **Render Account** — Sign up at [render.com](https://render.com)
2. **MongoDB Atlas** — You'll need a MongoDB cluster (free tier M0 works for development)
3. **Redis** — Render has managed Redis, or use [Upstash](https://upstash.com) (free tier)
4. **Meta Developer App** — For Instagram API access
5. **OpenAI API Key** — For AI-powered responses

---

## Step 1: Create MongoDB Atlas Cluster

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free cluster (M0 Sandbox)
3. Navigate to **Security → Network Access** → Allow all IPs (`0.0.0.0/0`)
4. Navigate to **Security → Database Access** → Create a user with read/write access
5. Navigate to **Deployment → Database** → Click **Connect** → **Connect your application**
6. Copy the connection string:

```
mongodb+srv://<username>:<password>@cluster.mongodb.net/rsushop?retryWrites=true&w=majority
```

---

## Step 2: Create Redis (Option A: Render Managed)

1. In Render Dashboard → **New → Redis**
2. Select **Starter** plan (free)
3. Note the **Host**, **Port**, and **Password** from the connection details

**Option B: Upstash Redis (Recommended for free tier)**

1. Sign up at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy the **Connection URL** (format: `redis://default:xxx@xxx.upstash.io:6379`)

---

## Step 3: Deploy API Service

### Option A: Deploy via Render Blueprint

1. Push your code to GitHub/GitLab
2. In Render Dashboard → **New → Blueprint**
3. Connect your repository
4. Select the `render.yaml` file
5. Fill in the required environment variables
6. Click **Apply**

### Option B: Deploy Manually

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repository
3. Configure the service:

   | Setting | Value |
   |---------|-------|
   | Name | `rsushop-api` |
   | Region | Oregon |
   | Branch | `main` |
   | Runtime | Docker |
   | Root Directory | `apps/api` |
   | Dockerfile Path | `./Dockerfile` |
   | Health Check | `/api/v1/health` |

4. Add environment variables (see below)

5. Click **Create Web Service**

---

## Step 4: Deploy Worker Service

1. In Render Dashboard → **New → Background Worker**
2. Connect the same repository

   | Setting | Value |
   |---------|-------|
   | Name | `rsushop-worker` |
   | Region | Oregon |
   | Runtime | Docker |
   | Root Directory | `apps/worker` |
   | Dockerfile Path | `./Dockerfile` |

3. Add the same environment variables (minus `PORT`, `CORS_ORIGIN`, etc.)

4. Click **Create Worker**

---

## Step 5: Configure Environment Variables

### API Service Variables

```bash
# App
NODE_ENV=production
PORT=3001

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/rsushop?retryWrites=true&w=majority

# Redis (Render or Upstash)
REDIS_HOST=<your-redis-host>
REDIS_PORT=6379
REDIS_PASSWORD=<your-redis-password>
# OR for Upstash:
# REDIS_URL=redis://default:xxx@xxx.upstash.io:6379

# Auth Secrets (Generate secure values)
JWT_SECRET=<generate-64-char-random-string>
JWT_REFRESH_SECRET=<generate-64-char-random-string>
ENCRYPTION_SECRET=<generate-32-char-random-string>

# Meta / Instagram
META_APP_ID=<your-meta-app-id>
META_APP_SECRET=<your-meta-app-secret>
WEBHOOK_BASE_URL=https://rsushop-api.onrender.com

# OpenAI
OPENAI_API_KEY=sk-<your-api-key>

# Stripe
STRIPE_SECRET_KEY=sk_live_<your-key>
STRIPE_WEBHOOK_SECRET=whsec_<your-secret>
STRIPE_PRICE_STARTER=price_<your-price-id>
STRIPE_PRICE_PRO=price_<your-price-id>
STRIPE_PRICE_AGENCY=price_<your-price-id>

# CORS
CORS_ORIGIN=https://your-frontend-url.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

### Worker Service Variables

```bash
NODE_ENV=production
MONGODB_URI=<same-as-above>
REDIS_HOST=<same-as-above>
REDIS_PORT=6379
REDIS_PASSWORD=<same-as-above>
META_APP_ID=<same-as-above>
META_APP_SECRET=<same-as-above>
OPENAI_API_KEY=<same-as-above>
```

---

## Step 6: Set Up Meta Webhook

After deploying, you need to configure Meta to send webhook events:

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Select your app → **Webhooks** → **Instagram**
3. Set the callback URL:

```
https://rsushop-api.onrender.com/api/v1/webhooks/instagram/<MONGODB_OBJECT_ID>
```

4. For each Instagram account connected in RsuShop:
   - Copy the `_id` from MongoDB (it's a 24-character ObjectId)
   - Use it in the webhook URL above

5. Meta will send a verification request to confirm the webhook works

---

## Step 7: Connect Your Domain (Optional)

1. In Render Dashboard → Your API service → **Settings**
2. Scroll to **Custom Domains**
3. Add your domain (e.g., `api.rsushop.com`)
4. Update DNS records as shown
5. Update `WEBHOOK_BASE_URL` with your custom domain

---

## Architecture Overview

```
                                    ┌─────────────────┐
                                    │   Meta/Instagram │
                                    │   API Webhooks    │
                                    └────────┬────────┘
                                             │
                                             ▼
                              ┌──────────────────────────────┐
                              │   Render Web Service (API)    │
                              │   rsushop-api.onrender.com    │
                              │   Port 3001                   │
                              └──────────────┬───────────────┘
                                             │
                           ┌─────────────────┼─────────────────┐
                           │                 │                 │
                           ▼                 ▼                 ▼
                    ┌──────────┐    ┌──────────────┐   ┌──────────┐
                    │  Redis   │    │  MongoDB    │   │  OpenAI  │
                    │ (Queues) │    │   Atlas      │   │   API    │
                    └────┬─────┘    └──────────────┘   └──────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │  Render Worker (BG Jobs) │
              │  DM sending, AI, Flows   │
              └──────────────────────────┘
```

---

## Troubleshooting

### Common Issues

**1. Webhook not receiving events**
- Check Render logs: `Render Dashboard → API Service → Logs`
- Verify `WEBHOOK_BASE_URL` is set correctly
- Ensure Meta has verified the webhook callback URL
- Check Instagram account is in `active` status in MongoDB

**2. Worker not processing jobs**
- Check Worker logs: `Render Dashboard → Worker → Logs`
- Verify Redis connection details are correct
- Ensure MongoDB Atlas IP whitelist includes Render's IPs

**3. CORS errors in frontend**
- Set `CORS_ORIGIN` to your frontend URL
- Format: `https://your-app.vercel.app` (no trailing slash)

**4. Instagram API errors**
- Ensure your Meta app has required permissions:
  - `instagram_basic`
  - `instagram_manage_messages`
  - `instagram_manage_comments`
  - `pages_read_engagement`
- If permissions not approved, use a test user

### View Logs

```bash
# API logs
Render Dashboard → rsushop-api → Logs

# Worker logs
Render Dashboard → rsushop-worker → Logs
```

### Free Tier Limits

| Resource | Free Limit |
|----------|-----------|
| Web Service | 750 hours/month |
| Worker | 0 (paid only) |
| Redis | 30MB, no persistence |
| PostgreSQL | 1GB (if using Render DB) |

> **Note**: Background workers require a paid plan on Render. Consider using a free alternative like [Railway](https://railway.app) or [Koyeb](https://www.koyeb.com) for the worker if budget is a concern.

---

## Next Steps After Deployment

1. **Connect Instagram Account**
   - Go to your deployed frontend
   - Navigate to Settings → Instagram Accounts
   - Click "Connect Instagram"
   - Complete Meta OAuth flow

2. **Create Your First Automation**
   - Go to Automations → Create New
   - Add a Trigger (e.g., "User sends DM")
   - Add a "Check Follow Status" node
   - Connect message nodes for following/not-following paths

3. **Test the Webhook**
   - Use the "Test Webhook" button in the dashboard
   - Or send a DM to your connected Instagram account

4. **Set Up Stripe Webhooks**
   - In Stripe Dashboard → Webhooks
   - Add endpoint: `https://rsushop-api.onrender.com/api/v1/webhooks/stripe`
   - Listen for: `customer.subscription.created`, `customer.subscription.deleted`, `invoice.payment_succeeded`
