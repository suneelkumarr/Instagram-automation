# RsuShop.com — Instagram Auto DM SaaS Platform
## Complete Technical Specification & Build Roadmap

---

## 1. CONCEPT & VISION

**RsuShop** is a white-label Instagram DM automation platform for creators, agencies, and e-commerce brands. Think ManyChat meets ChatGPT — visual flow builder + AI-powered conversations that feel human. The platform lets users create automated DM workflows triggered by comments, keywords, new followers, or story replies, with an AI agent that understands intent and drives conversions.

The aesthetic: clean SaaS dashboard with dark sidebar, crisp white canvas for the flow builder, and vibrant accent colors (Instagram gradient tones — purple to orange). It should feel powerful yet approachable — a tool that a solo creator and a 10-person agency both love.

---

## 2. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
│   Web Dashboard (Next.js) │ Mobile (PWA) │ Instagram App (webhook)  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          EDGE LAYER                                 │
│   Vercel (Frontend CDN) │ Cloudflare │ API Gateway (nginx + TLS)   │
│   - Rate limiting       - DDoS protection  - Auth middleware        │
│   - SSL termination      - Cache static     - Request routing        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      LOAD BALANCER (nginx)                          │
│                  Round-robin across API instances                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │   API SERVER 1   │  │   API SERVER 2   │  │   API SERVER N   │
    │   (Node/Express) │  │   (Node/Express) │  │   (Node/Express) │
    │   Port: 3001     │  │   Port: 3001     │  │   Port: 3001     │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    │
    ┌──────────────────┬────────────┼────────────┬──────────────────┐
    ▼                  ▼            ▼            ▼                  ▼
┌────────┐      ┌────────┐    ┌──────────┐  ┌──────────┐    ┌────────┐
│MongoDB│      │ Redis  │    │ Instagram│  │  Stripe  │    │ OpenAI │
│Cluster│      │ Cluster│    │ Graph API│  │   API    │    │  API   │
│(Primary│      │(Cache  │    └──────────┘  └──────────┘    └────────┘
│+ 2 Read│      │+ Queue)│
│Replicas│      └────────┘
└────────┘
                                    │
                         ┌──────────┴──────────┐
                         │    BullMQ Workers   │
                         │  (Message Processor) │
                         │  - DM Sender Worker │
                         │  - Webhook Worker   │
                         │  - AI Agent Worker  │
                         │  - Analytics Worker │
                         └─────────────────────┘
```

### Architecture Decisions

| Component | Choice | Why |
|-----------|--------|-----|
| Frontend | Next.js 14 (App Router) | SSR, API routes, React Flow for builder |
| Backend | Node.js + Express | Ecosystem, non-blocking I/O for high concurrency |
| Database | MongoDB (Atlas M10) | Flexible schema for flows (JSON), rapid iteration |
| Queue | BullMQ + Redis | Reliable job queues, retries, priority queues |
| Cache | Redis Cluster | Session store, rate limiting, pub/sub |
| Auth | JWT + Refresh tokens | Stateless auth, workspace-scoped |
| ORM | Mongoose | Schema validation, middleware, population |
| AI | OpenAI GPT-4o-mini | Cost-effective, fast, excellent at conversation |
| Payments | Stripe | Recurring billing, usage-based limits |
| Hosting | Railway / AWS | Easy horizontal scaling |
| Container | Docker + Docker Compose | Reproducible dev/prod parity |
| CDN | Vercel (frontend) + Cloudflare | Global edge, SSL, DDoS protection |

---

## 3. DATABASE DESIGN (MongoDB)

### Collections

```javascript
// ============================================
// COLLECTION: users
// ============================================
{
  _id: ObjectId,
  email: String (unique, indexed),
  passwordHash: String,
  firstName: String,
  lastName: String,
  avatar: String (URL),
  emailVerified: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date,
  settings: {
    timezone: String (default: "UTC"),
    language: String (default: "en"),
    notifications: {
      email: Boolean,
      slack: Boolean,
      browser: Boolean
    }
  },
  referrerId: ObjectId (ref: users, nullable),
  affiliateCode: String (unique, indexed),
  affiliateEarnings: Number (default: 0)
}

// ============================================
// COLLECTION: workspaces
// ============================================
{
  _id: ObjectId,
  name: String,
  slug: String (unique, indexed),
  ownerId: ObjectId (ref: users, indexed),
  memberIds: [ObjectId] (ref: users),
  plan: String (enum: ["free", "starter", "pro", "agency"]),
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  billingCycle: String (enum: ["monthly", "annual"]),
  limits: {
    instagramAccounts: Number,
    contacts: Number,
    automations: Number,
    monthlyMessages: Number,
    aiCredits: Number
  },
  usage: {
    instagramAccounts: Number,
    contacts: Number,
    automations: Number,
    monthlyMessages: Number,
    aiCredits: Number,
    resetAt: Date  // Monthly reset
  },
  features: {
    aiAgent: Boolean,
    visualFlowBuilder: Boolean,
    analytics: Boolean,
    teamMembers: Number,
    apiAccess: Boolean,
    whiteLabel: Boolean
  },
  createdAt: Date,
  updatedAt: Date
}

// ============================================
// COLLECTION: instagram_accounts
// ============================================
{
  _id: ObjectId,
  workspaceId: ObjectId (ref: workspaces, indexed),
  instagramId: String (unique, indexed),  // IG Business Account ID
  username: String,
  displayName: String,
  profilePicture: String,
  followersCount: Number,
  bio: String,
  website: String,
  accessToken: String (encrypted),
  accessTokenExpiresAt: Date,
  permissions: [String],
  pageId: String,          // Facebook Page ID linked
  appId: String,           // Meta App ID
  status: String (enum: ["active", "expired", "pending", "disconnected"]),
  lastSyncedAt: Date,
  webhookVerifyToken: String,
  createdAt: Date,
  updatedAt: Date
}

// ============================================
// COLLECTION: automations (Flows)
// ============================================
{
  _id: ObjectId,
  workspaceId: ObjectId (ref: workspaces, indexed),
  instagramAccountId: ObjectId (ref: instagram_accounts, indexed),
  name: String,
  description: String,
  status: String (enum: ["draft", "active", "paused", "archived"]),
  trigger: {
    type: String (enum: [
      "comment",
      "keyword",
      "new_follower",
      "story_mention",
      "story_reply",
      "post_like",
      "direct_message",
      "scheduled"
    ]),
    config: {
      // Comment trigger
      targetPostId: String,
      commentContains: [String],
      excludeWords: [String],
      // Keyword trigger
      keywords: [String],
      caseSensitive: Boolean,
      // Follower trigger
      filterNewOnly: Boolean,
      // Story trigger
      storyId: String,
      // Scheduled
      cronExpression: String,
      timezone: String
    }
  },
  flowData: {
    nodes: [
      {
        id: String (uuid),
        type: String (enum: [
          "trigger", "message", "ai_agent", "condition",
          "delay", "http_request", "update_contact",
          "add_to_list", "remove_from_list", "webhook",
          "split", "randomizer", "end"
        ]),
        position: { x: Number, y: Number },
        data: {
          // Node-specific data
          label: String,
          content: String,        // For message nodes
          prompt: String,          // For AI agent nodes
          niche: String,           // For AI agent nodes
          conditions: Object,      // For condition nodes
          delayMs: Number,         // For delay nodes
          url: String,             // For HTTP request nodes
          field: String,          // For update contact nodes
          listId: String,          // For add/remove from list
          // ... node-specific
        },
        config: Object  // Additional node configuration
      }
    ],
    edges: [
      {
        id: String (uuid),
        source: String (node id),
        target: String (node id),
        sourceHandle: String,  // For conditional branches
        label: String
      }
    ]
  },
  stats: {
    triggered: Number (default: 0),
    completed: Number (default: 0),
    failed: Number (default: 0),
    lastTriggeredAt: Date
  },
  version: Number (default: 1),
  publishedAt: Date,
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId (ref: users)
}

// ============================================
// COLLECTION: contacts
// ============================================
{
  _id: ObjectId,
  workspaceId: ObjectId (ref: workspaces, indexed),
  instagramAccountId: ObjectId (ref: instagram_accounts, indexed),
  igUserId: String (indexed),          // Instagram User ID
  username: String,
  displayName: String,
  profilePicture: String,
  biography: String,
  followersCount: Number,
  followingCount: Number,
  mediaCount: Number,
  website: String,
  isBusiness: Boolean,
  source: String (enum: ["follower", "dm", "comment", "imported"]),
  tags: [String],
  lists: [String],                      // Custom list names
  customFields: Object,                // Arbitrary key-value pairs
  leadScore: Number (default: 0),
  followStatus: String (enum: ["following", "not_following", "requested", "unknown"], default: "unknown"),
  lastInteractionAt: Date,
  firstSeenAt: Date,
  createdAt: Date,
  updatedAt: Date,
  // Unique compound index
  uniqueKey: { instagramAccountId: 1, igUserId: 1 }
}

// ============================================
// COLLECTION: conversations
// ============================================
{
  _id: ObjectId,
  workspaceId: ObjectId (ref: workspaces, indexed),
  instagramAccountId: ObjectId (ref: instagram_accounts, indexed),
  contactId: ObjectId (ref: contacts, indexed),
  igThreadId: String (indexed),
  status: String (enum: ["open", "closed", "pending", "bot", "human"]),
  lastMessageAt: Date,
  lastMessageFrom: String (enum: ["contact", "bot", "agent"]),
  messageCount: Number (default: 0),
  tags: [String],
  assignedTo: ObjectId (ref: users, nullable),
  priority: String (enum: ["low", "normal", "high"]),
  sentiment: String (enum: ["positive", "neutral", "negative"]),
  createdAt: Date,
  updatedAt: Date
}

// ============================================
// COLLECTION: messages
// ============================================
{
  _id: ObjectId,
  workspaceId: ObjectId (ref: workspaces, indexed),
  instagramAccountId: ObjectId (ref: instagram_accounts, indexed),
  conversationId: ObjectId (ref: conversations, indexed),
  contactId: ObjectId (ref: contacts, indexed),
  automationId: ObjectId (ref: automations, nullable, indexed),
  igMessageId: String (indexed),
  igSenderId: String,
  igRecipientId: String,
  direction: String (enum: ["inbound", "outbound"]),
  type: String (enum: [
    "text", "image", "video", "audio", "story_link",
    "link", "location", "file", "reaction", "unsupported"
  ]),
  content: String,
  mediaUrl: String,
  mediaType: String,
  quickReply: String,
  status: String (enum: ["sent", "delivered", "read", "failed"]),
  sentVia: String (enum: ["api", "webhook", "manual", "ai"]),
  aiTriggered: Boolean (default: false),
  aiConfidence: Number,
  processingTime: Number (ms),
  createdAt: Date (indexed, TTL: 90 days for free tier)
}

// ============================================
// COLLECTION: flow_executions
// ============================================
{
  _id: ObjectId,
  workspaceId: ObjectId (ref: workspaces, indexed),
  automationId: ObjectId (ref: automations, indexed),
  contactId: ObjectId (ref: contacts, indexed),
  conversationId: ObjectId (ref: conversations, indexed),
  triggerType: String,
  triggerPayload: Object,
  currentNodeId: String,
  executionPath: [String],          // Node IDs visited
  context: Object,                    // Flow variables
  status: String (enum: ["running", "completed", "failed", "paused"]),
  startedAt: Date,
  completedAt: Date,
  error: String,
  duration: Number (ms)
}

// ============================================
// COLLECTION: analytics_events
// ============================================
{
  _id: ObjectId,
  workspaceId: ObjectId (ref: workspaces, indexed),
  instagramAccountId: ObjectId (ref: instagram_accounts, indexed),
  event: String (enum: [
    "automation_triggered", "automation_completed", "automation_failed",
    "message_sent", "message_delivered", "message_read",
    "contact_added", "conversation_started", "ai_response_sent",
    "lead_captured", "conversion", "unsubscribe"
  ]),
  automationId: ObjectId (ref: automations, nullable),
  contactId: ObjectId (ref: contacts, nullable),
  conversationId: ObjectId (ref: conversations, nullable),
  metadata: Object,
  timestamp: Date (indexed, TTL: 365 days)
}

// ============================================
// COLLECTION: subscriptions
// ============================================
{
  _id: ObjectId,
  workspaceId: ObjectId (ref: workspaces, indexed),
  userId: ObjectId (ref: users),
  stripeCustomerId: String (indexed),
  stripeSubscriptionId: String (indexed),
  stripePriceId: String,
  plan: String,
  status: String (enum: ["active", "past_due", "canceled", "trialing"]),
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: Boolean,
  trialEndsAt: Date,
  cancelledAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// ============================================
// COLLECTION: affiliates
// ============================================
{
  _id: ObjectId,
  userId: ObjectId (ref: users, indexed),
  code: String (unique, indexed),
  commission: Number (default: 0.3),  // 30% recurring
  referredCount: Number (default: 0),
  totalEarnings: Number (default: 0),
  paidOut: Number (default: 0),
  pendingPayout: Number (default: 0),
  stripePayoutId: String,
  createdAt: Date,
  updatedAt: Date
}

// ============================================
// COLLECTION: webhooks_log
// ============================================
{
  _id: ObjectId,
  workspaceId: ObjectId (ref: workspaces, indexed),
  instagramAccountId: ObjectId (ref: instagram_accounts),
  event: String,
  payload: Object,
  processed: Boolean (default: false),
  processingTime: Number,
  error: String,
  createdAt: Date (TTL: 30 days)
}

// ============================================
// COLLECTION: api_keys
// ============================================
{
  _id: ObjectId,
  workspaceId: ObjectId (ref: workspaces, indexed),
  name: String,
  keyHash: String (hashed, indexed),
  keyPrefix: String,     // First 8 chars shown to user
  scopes: [String],
  lastUsedAt: Date,
  expiresAt: Date,
  createdBy: ObjectId (ref: users),
  createdAt: Date
}
```

### Indexes

```javascript
// High-frequency query indexes
{ workspaceId: 1, createdAt: -1 }           // Dashboard queries
{ workspaceId: 1, instagramAccountId: 1, igUserId: 1 }  // Contact lookup
{ instagramAccountId: 1, status: 1 }        // Active automations
{ workspaceId: 1, "trigger.type": 1 }      // Trigger-based filtering
{ igMessageId: 1 }                           // Deduplication
{ automationId: 1, status: 1, startedAt: -1 } // Execution queries
```

---

## 4. API STRUCTURE

### Base URL: `https://api.rsushop.com/v1`

### Authentication
```
Authorization: Bearer <jwt_access_token>
X-Workspace-Id: <workspace_id>
```

### Endpoints

```
# ==================== AUTH ====================
POST   /auth/register           # Create account
POST   /auth/login              # Login, returns JWT
POST   /auth/logout             # Invalidate refresh token
POST   /auth/refresh            # Refresh access token
POST   /auth/forgot-password    # Send reset email
POST   /auth/reset-password      # Reset with token
GET    /auth/me                 # Current user profile
PATCH  /auth/me                 # Update profile

# ==================== WORKSPACES ====================
GET    /workspaces              # List user's workspaces
POST   /workspaces              # Create workspace
GET    /workspaces/:id          # Get workspace details
PATCH  /workspaces/:id          # Update workspace
DELETE /workspaces/:id          # Delete workspace
POST   /workspaces/:id/members # Invite member
DELETE /workspaces/:id/members/:userId # Remove member

# ==================== INSTAGRAM ACCOUNTS ====================
GET    /instagram-accounts      # List connected accounts
POST   /instagram-accounts/connect # Initiate Meta OAuth
GET    /instagram-accounts/:id   # Get account details
DELETE /instagram-accounts/:id  # Disconnect account
POST   /instagram-accounts/:id/refresh-token # Refresh access token
GET    /instagram-accounts/:id/sync   # Sync profile data
POST   /instagram-accounts/:id/webhook-register # Re-register webhook with Meta
POST   /instagram-accounts/:id/webhook-test      # Queue a test webhook event

# ==================== INSTAGRAM WEBHOOK (Public — Meta calls these) ====================
GET    /webhooks/instagram/:accountId  # Meta webhook verification
POST   /webhooks/instagram/:accountId   # Meta webhook event receiver

# ==================== AUTOMATIONS (FLOWS) ====================
GET    /automations             # List automations (with filters)
POST   /automations             # Create automation
GET    /automations/:id         # Get automation details
PATCH  /automations/:id         # Update automation
DELETE /automations/:id         # Delete automation
POST   /automations/:id/activate # Activate automation
POST   /automations/:id/pause   # Pause automation
POST   /automations/:id/duplicate # Duplicate automation
POST   /automations/:id/test    # Test run with mock trigger
GET    /automations/:id/stats   # Get automation analytics

# ==================== CONTACTS ====================
GET    /contacts                # List contacts (paginated, filterable)
POST   /contacts/import         # Bulk import contacts
GET    /contacts/:id            # Get contact details
PATCH  /contacts/:id            # Update contact
DELETE /contacts/:id            # Delete contact
POST   /contacts/:id/tag       # Add tag
DELETE /contacts/:id/tag/:tag   # Remove tag
POST   /contacts/:id/lists/:listName # Add to list
DELETE /contacts/:id/lists/:listName # Remove from list
GET    /contacts/export         # Export contacts (CSV/JSON)

# ==================== CONVERSATIONS ====================
GET    /conversations           # List conversations
GET    /conversations/:id       # Get conversation with messages
PATCH  /conversations/:id       # Update (assign, tag, status)
POST   /conversations/:id/close # Close conversation
POST   /conversations/:id/reopen # Reopen conversation
POST   /conversations/:id/messages # Send manual message

# ==================== MESSAGES ====================
GET    /messages                # List messages (filterable)
POST   /messages/send           # Send DM via API
GET    /messages/:id            # Get message details

# ==================== BROADCASTS ====================
GET    /broadcasts              # List broadcast campaigns
POST   /broadcasts              # Create broadcast
GET    /broadcasts/:id          # Get broadcast details
POST   /broadcasts/:id/send    # Execute broadcast
POST   /broadcasts/:id/cancel   # Cancel pending broadcast
GET    /broadcasts/:id/stats    # Get broadcast stats

# ==================== AI AGENT ====================
POST   /ai/generate-reply       # Generate AI reply (preview)
POST   /ai/train                # Fine-tune prompts for niche
GET    /ai/templates            # List prompt templates
GET    /ai/conversation-preview  # Preview AI conversation
POST   /ai/test-prompt          # Test prompt with sample input

# ==================== ANALYTICS ====================
GET    /analytics/overview       # Dashboard overview stats
GET    /analytics/messages       # Message metrics
GET    /analytics/automations    # Automation performance
GET    /analytics/contacts       # Contact growth
GET    /analytics/conversions    # Conversion tracking
GET    /analytics/export         # Export analytics data

# ==================== SUBSCRIPTION / BILLING ====================
GET    /billing/plans           # List available plans
GET    /billing/current          # Current plan details
POST   /billing/subscribe        # Create subscription
POST   /billing/upgrade          # Upgrade plan
POST   /billing/downgrade        # Downgrade plan
POST   /billing/cancel           # Cancel subscription
POST   /billing/update-payment   # Update payment method
GET    /billing/invoices         # List invoices
GET    /billing/usage            # Current usage stats

# ==================== WEBHOOKS (OUTBOUND) ====================
GET    /webhooks                 # List outbound webhooks
POST   /webhooks                 # Create outbound webhook
DELETE /webhooks/:id             # Delete webhook
POST   /webhooks/:id/test        # Test webhook delivery

# ==================== API KEYS ====================
GET    /api-keys                 # List API keys
POST   /api-keys                 # Create API key
DELETE /api-keys/:id             # Revoke API key

# ==================== AFFILIATES ====================
GET    /affiliates/dashboard     # Affiliate stats
GET    /affiliates/referrals     # List referred users
POST   /affiliates/payout        # Request payout
GET    /affiliates/affiliate-link # Get shareable link

# ==================== WEBHOOK (Instagram Inbound) ====================
POST   /webhooks/instagram/:accountId  # Meta webhook receiver
GET    /webhooks/instagram/:accountId  # Webhook verification (GET)
```

---

## 5. FLOW BUILDER — NODE-BASED SYSTEM

### Node Types

| Node | Icon | Description | Config Fields |
|------|------|-------------|---------------|
| **Trigger** | ⚡ | Flow entry point | Trigger type, config |
| **Message** | 💬 | Send text/media DM | Content, media, delay |
| **AI Agent** | 🤖 | AI-powered response | System prompt, niche, temperature |
| **Condition** | 🔀 | Branch logic | Field, operator, value |
| **Delay** | ⏱️ | Wait before next step | Duration (ms/minutes/hours) |
| **HTTP Request** | 🌐 | External API call | URL, method, headers, body |
| **Update Contact** | 📝 | Save data to contact | Field, value/expression |
| **Add to List** | ➕ | Add contact to list | List name |
| **Remove from List** | ➖ | Remove from list | List name |
| **Check Follow Status** | 👤 | Verify if user follows your IG account | followMessage, videoMessage, videoLink |
| **Random Split** | 🎲 | A/B分流 | Percentages per branch |
| **Webhook** | 🔗 | Trigger external URL | URL, payload template |
| **End** | 🛑 | Flow termination | End status |

### Flow JSON Schema

```json
{
  "id": "flow_uuid",
  "version": 1,
  "nodes": [
    {
      "id": "node_uuid",
      "type": "trigger",
      "position": { "x": 250, "y": 50 },
      "data": {
        "triggerType": "comment",
        "label": "New Comment Trigger",
        "config": {
          "postId": "IG_POST_ID",
          "commentContains": ["info", "dm", "details"],
          "excludeWords": ["no", "stop", "unfollow"]
        }
      }
    },
    {
      "id": "node_uuid_2",
      "type": "condition",
      "position": { "x": 250, "y": 200 },
      "data": {
        "label": "Check Keywords",
        "conditions": [
          {
            "field": "message",
            "operator": "contains",
            "value": "fitness"
          }
        ],
        "logic": "any"  // any | all
      }
    },
    {
      "id": "node_uuid_3",
      "type": "ai_agent",
      "position": { "x": 100, "y": 380 },
      "data": {
        "label": "AI Fitness Coach",
        "niche": "fitness",
        "systemPrompt": "You are a friendly fitness coach...",
        "temperature": 0.7,
        "maxTokens": 150,
        "captureFields": ["name", "email", "goal"],
        "suggestProducts": true
      }
    },
    {
      "id": "node_uuid_4",
      "type": "message",
      "position": { "x": 400, "y": 380 },
      "data": {
        "label": "Welcome Message",
        "content": "Thanks for reaching out! Let me connect you with our team.",
        "delayMs": 0
      }
    },
    {
      "id": "node_uuid_5",
      "type": "end",
      "position": { "x": 250, "y": 560 },
      "data": {
        "label": "End",
        "status": "completed"
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "node_uuid", "target": "node_uuid_2" },
    { "id": "e2", "source": "node_uuid_2", "target": "node_uuid_3", "sourceHandle": "true" },
    { "id": "e3", "source": "node_uuid_2", "target": "node_uuid_4", "sourceHandle": "false" },
    { "id": "e4", "source": "node_uuid_3", "target": "node_uuid_5" },
    { "id": "e5", "source": "node_uuid_4", "target": "node_uuid_5" }
  ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 }
}
```

### Flow Execution Engine

```
┌─────────────────────────────────────────────────────────┐
│                    FLOW EXECUTOR                          │
│                                                          │
│  1. Receive trigger event (webhook / API / cron)         │
│  2. Load automation + flowData from DB                   │
│  3. Create FlowExecution record                          │
│  4. Initialize context: { contact, message, vars }       │
│  5. Set currentNodeId = trigger node ID                  │
│                                                          │
│  LOOP:                                                    │
│  ┌──────────────────────────────────────────────────┐    │
│  │  WHILE currentNode.type != "end" AND !error      │    │
│  │                                                   │    │
│  │  a. Get node from flowData.nodes by id           │    │
│  │  b. Process node:                                 │    │
│  │     - trigger: validate trigger match            │    │
│  │     - message: enqueue DM job → BullMQ           │    │
│  │     - ai_agent: enqueue AI job → BullMQ          │    │
│  │     - condition: evaluate → get next node handle  │    │
│  │     - delay: enqueue delayed job                  │    │
│  │     - http_request: execute HTTP call              │    │
│  │     - update_contact: update contact fields       │    │
│  │     - add_to_list: add contact to list            │    │
│  │     - webhook: fire outbound webhook              │    │
│  │     - randomizer: pick branch by %                │    │
│  │     - end: mark execution complete                │    │
│  │                                                   │    │
│  │  c. Update context with node output                │    │
│  │  d. Push node.id to executionPath[]                │    │
│  │  e. Determine next node from edges[]               │    │
│  │  f. Handle branch selection (condition handles)      │    │
│  │  g. Increment step counter (anti-infinite-loop)    │    │
│  │     → FAIL if steps > maxSteps (default: 50)       │    │
│  │                                                   │    │
│  │  END WHILE                                         │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  6. Update FlowExecution: status, completedAt, duration   │
│  7. Update Automation.stats                               │
└─────────────────────────────────────────────────────────┘
```

---

## 6. INSTAGRAM API INTEGRATION

### Step-by-Step Meta App Setup

```
STEP 1: Create Meta App
├── Go to https://developers.facebook.com
├── Click "My Apps" → "Create App"
├── Select "Business" type
├── App Name: "RsuShop Platform"
├── App Contact Email: support@rsushop.com
└── Complete app creation

STEP 2: Add Products
├── Go to App Dashboard
├── Add Product: "Instagram Graph API"
├── Add Product: "Webhooks"
└── Configure product settings

STEP 3: Configure Instagram Basic Display (for personal accounts)
├── Go to "Add Products" → "Instagram Basic Display"
├── Add "Instagram Test Users" (up to 30 for dev)
└── Set up OAuth redirect URL

STEP 4: Configure Instagram Graph API (for Business/Creator)
├── Go to "Add Products" → "Instagram Graph API"
├── Add Platforms: Web
├── Set OAuth Redirect: https://api.rsushop.com/auth/instagram/callback
└── Set Deauthorize Callback URL
└── Set Data Deletion Request URL

STEP 5: Permissions Request
Required permissions:
├── instagram_basic (read profile data)
├── instagram_manage_comments (moderate comments)
├── instagram_manage_insights (read insights)
├── instagram_content_publish (publish content)
├── instagram_manage_messages (send/receive DMs)  ← CRITICAL
├── pages_read_engagement (link Facebook Page)
├── pages_show_list (manage pages)
└── business_management (manage business accounts)

STEP 6: App Review
├── Submit for review with use case documentation
├── Provide video demo of functionality
├── Write privacy policy and terms of service
└── Submit for approval (2-7 business days)
```

### Webhook Subscription Setup

```javascript
// POST /api/v1/webhooks/instagram/:accountId
// GET /api/v1/webhooks/instagram/:accountId  (verification)

// VERIFICATION FLOW:
// Meta sends GET with ?hub.mode=subscribe&hub.verify_token=TOKEN&hub.challenge=CHALLENGE
// We look up the account by MongoDB _id and verify the token matches account.webhookVerifyToken

// EVENT FLOW (Instagram Graph API Webhook):
// Meta sends POST with { object: "instagram", entry: [...] }
// Each entry contains:
//   - messaging[]: incoming DMs, reads, reactions
//   - changes[]: comments, mentions, story mentions, follows
//   - standby[]: messages in shared/secondary flows

// Supported webhook events:
//   - incoming_message  → trigger 'direct_message' automations
//   - comment_received  → trigger 'comment' automations
//   - new_follower     → trigger 'new_follower' automations
//   - story_mention    → trigger 'story_mention' automations
//   - message_read     → update message status to 'read'
//   - message_reaction → handle reactions

// Security:
//   - HMAC-SHA256 signature verification in production
//   - Per-account verify tokens (not a global env var)
//   - Route accountId cross-checked against entry.id

// Architecture:
//   1. API receives webhook → immediately responds 200 to Meta (within 20s SLA)
//   2. API validates signature + account → queues job to Redis
//   3. Worker picks up job → creates/updates Contact + Conversation
//   4. Worker triggers matching automations → flow execution begins
```

### Message Sending API

```javascript
// POST https://graph.facebook.com/v18.0/me/messages
// Rate limits: 250 msg/min per account (scales with permissions)

async function sendInstagramDM(accessToken, igUserId, recipientId, message) {
  const url = `https://graph.facebook.com/v18.0/${igUserId}/messages`;

  const payload = {
    recipient: { id: recipientId },
    message: {
      text: message.text,
      ...(message.mediaUrl && {
        attachment: {
          type: "image",
          payload: { url: message.mediaUrl, is_reusable: true }
        }
      }),
      ...(message.quickReplies && {
        quick_replies: message.quickReplies.map(qr => ({
          content_type: "text",
          title: qr.title.substring(0, 20),
          payload: qr.payload
        }))
      })
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    // Handle rate limit
    if (data.error?.type === 'OAuthException' &&
        data.error?.code === 4) {
      throw new RateLimitError(data);
    }
    throw new InstagramAPIError(data);
  }

  return data;
}
```

### Rate Limit Strategy

```
Global Limits:
├── Messaging: 250 msg/min per IG account (250 unique recipients/min)
├── API Calls: 4800/hour per app (scales with app tier)
├── Webhooks: 1000 events/min per account
└── Comments: 50/min per account

Implementation:
├── BullMQ with rate-limited queues per IG account
├── Token bucket algorithm: 250 tokens, refill 250/min
├── Exponential backoff: 1s → 2s → 4s → 8s → 16s (max 5 attempts)
├── Circuit breaker: Open after 5 consecutive failures
├── Priority queues: Urgent (1-10) > Normal (11-100) > Bulk (101+)
└── Monthly usage tracking against plan limits
```

---

## 7. AI AGENT SYSTEM

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    AI AGENT PIPELINE                      │
│                                                          │
│  User Message → Context Builder → Prompt Composer        │
│      → OpenAI GPT-4o-mini → Response Parser → Action    │
│                                                          │
│  CONTEXT BUILDER:                                        │
│  ├── Contact profile (name, tags, previous messages)     │
│  ├── Conversation history (last 5 messages)            │
│  ├── Active flow variables                              │
│  ├── Products/services catalog                          │
│  ├── Niche-specific knowledge base                      │
│  ├── Conversation stage (aware, interested, ready)      │
│  └── Recent interaction timestamp                       │
│                                                          │
│  PROMPT COMPOSER:                                       │
│  ├── System prompt (niche-specific)                      │
│  ├── Conversation context                               │
│  ├── Instructions (capture lead, suggest product)       │
│  ├── Guardrails (no sensitive topics, stay on brand)    │
│  └── User message                                        │
│                                                          │
│  RESPONSE PARSER:                                        │
│  ├── Extract captured fields (email, phone, name)       │
│  ├── Detect intent (buy, question, complaint)          │
│  ├── Detect sentiment (positive, neutral, negative)     │
│  ├── Detect escalation needed                           │
│  └── Route to next flow step                            │
└──────────────────────────────────────────────────────────┘
```

### System Prompt Templates

#### Fitness Niche
```
You are a friendly, knowledgeable fitness coach assistant for [BRAND_NAME].
You help potential clients get started on their fitness journey.

PERSONALITY:
- Energetic but professional
- Ask one question at a time
- Be conversational, not robotic
- Celebrate small wins
- Never give specific medical advice (always say "consult a doctor")

CONVERSATION FLOW:
1. Greet warmly, reference what triggered the DM
2. Ask about their fitness goals (weight loss, muscle, endurance)
3. Ask about their experience level (beginner, intermediate, advanced)
4. Ask about any limitations or injuries
5. Mention relevant programs/products naturally
6. Capture: name, email, goal

NEVER DO:
- Promise specific results ("lose 10lbs in 2 weeks")
- Diagnose medical conditions
- Send multiple messages in rapid succession
- Be pushy or salesy
- Respond to topics outside fitness

CAPTURE FIELDS: name, email, phone (optional), fitness_goal
SUGGESTED PRODUCTS: 1-on-1 coaching, workout programs, meal plans, supplements
```

#### Coaching / Consulting Niche
```
You are a professional coaching assistant for [BRAND_NAME].
You help potential clients understand the value of coaching.

PERSONALITY:
- Empathetic and understanding
- Focus on transformation, not features
- Ask deep discovery questions
- Build trust through listening
- Professional but warm

CONVERSATION FLOW:
1. Warm greeting acknowledging their interest
2. Ask what brought them here / what challenge they're facing
3. Ask what they've tried before
4. Ask about their timeline and commitment level
5. Share a brief transformation story (generic)
6. Suggest booking a strategy call
7. Capture: name, email, best time to call, biggest challenge

NEVER DO:
- Dismiss their concerns
- Rush to the sales pitch
- Make promises about outcomes
- Discuss pricing without qualification
- Pressure them into immediate commitment

CAPTURE FIELDS: name, email, biggest_challenge, timeline, budget_range
SUGGESTED ACTIONS: Schedule call, download free guide, join waitlist
```

#### E-Commerce Niche
```
You are a helpful shopping assistant for [BRAND_NAME].
You help customers find the right products and answer questions.

PERSONALITY:
- Friendly and helpful
- Product knowledgeable
- Suggest complementary items
- Handle objections gracefully
- Promote offers naturally

CONVERSATION FLOW:
1. Greet and ask how you can help
2. If product question → provide details + suggest alternatives
3. If sizing question → provide size guide
4. If price question → mention current offers + bundles
5. If checkout help → guide through process
6. Capture: email (for order updates), preferences

OBJECTION HANDLING:
- "Too expensive" → Highlight value, mention EMI/offers
- "Need to think" → Offer to hold item, send reminder
- "Where's my order" → Provide tracking info
- "Wrong size" → Initiate exchange process

CAPTURE FIELDS: email, product_interest, size_preference
SUGGESTED ACTIONS: Add to cart, upsell, cross-sell, offer discount
```

### Lead Capture Schema

```javascript
// The AI parses responses and updates contact fields
const CAPTURE_PATTERNS = {
  email: /[\w.-]+@[\w.-]+\.\w+/gi,
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  name: /(?:i'm|i am|my name is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  goal: /(?:i want to|i need to|looking to|my goal is)\s+(.+)/i,
  budget: /(?:budget|price|afford|cost)\s+(?:is|of|around)?\s*\$?(\d+)/i
};

const parseAndExtract = (message, contact) => {
  const extracted = {};
  for (const [field, pattern] of Object.entries(CAPTURE_PATTERNS)) {
    const match = message.match(pattern);
    if (match) {
      extracted[field] = field === 'email'
        ? match[0].toLowerCase()
        : match[1] || match[0];
    }
  }
  return extracted;
};
```

---

## 8. MONETIZATION & PRICING

### Pricing Tiers

| Feature | Free | Starter ($29/mo) | Pro ($79/mo) | Agency ($199/mo) |
|---------|------|------------------|--------------|------------------|
| Instagram Accounts | 1 | 3 | 10 | Unlimited |
| Contacts | 100 | 5,000 | 50,000 | 500,000 |
| Automations | 3 | 20 | 100 | Unlimited |
| Monthly Messages | 500 | 10,000 | 100,000 | 1M |
| AI Credits | 50 | 500 | 5,000 | 50,000 |
| Team Members | 1 | 3 | 10 | 50 |
| Visual Flow Builder | ✓ | ✓ | ✓ | ✓ |
| AI Agent | — | ✓ | ✓ | ✓ |
| Analytics | Basic | Advanced | Advanced | Advanced |
| API Access | — | — | ✓ | ✓ |
| White Label | — | — | — | ✓ |
| Priority Support | — | — | ✓ | ✓ |
| Custom Domain | — | — | — | ✓ |
| Affiliate Commission | 20% | 25% | 30% | 30% |

### Usage-Based Overage

| Metric | Overage Price |
|--------|--------------|
| Extra Messages | $0.01 per message |
| Extra AI Credits | $0.002 per credit |
| Extra Contacts | $0.001 per contact |

### Stripe Integration

```javascript
// Create subscription
const createSubscription = async (workspaceId, priceId, paymentMethodId) => {
  const workspace = await Workspace.findById(workspaceId);

  // Create or get Stripe customer
  let customer = await stripe.customers.create({
    email: workspace.owner.email,
    metadata: { workspaceId: workspace._id.toString() },
    ...(paymentMethodId && {
      invoice_settings: { default_payment_method: paymentMethodId }
    })
  });

  // Create subscription with usage-based billing
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
    billing_cycle_anchor: Math.floor(Date.now() / 1000),
    metadata: { workspaceId: workspace._id.toString() }
  });

  // Handle payment intent for immediate payment
  if (subscription.latest_invoice?.payment_intent) {
    return { subscription, clientSecret: subscription.latest_invoice.payment_intent.client_secret };
  }

  return { subscription };
};

// Usage metering (Metered Billing)
const reportUsage = async (stripeSubscriptionItemId, quantity) => {
  await stripe.subscriptionItems.createUsageRecord(
    stripeSubscriptionItemId,
    { quantity, timestamp: Math.floor(Date.now() / 1000) }
  );
};
```

---

## 9. SCALABILITY ARCHITECTURE

### Target: 100K+ Users

```
SINGLE-ACCOUNT SCALING:
┌─────────────────────────────────────────────────────────┐
│ 1 User Account = 1 Automation Flow = N Messages        │
│                                                          │
│ Calculation:                                             │
│ - 100K users × avg 10 automations                       │
│ - Each automation triggers avg 50 times/month           │
│ - = 50M automation executions/month                      │
│ - Avg 5 messages per execution = 250M messages/month  │
│ - = ~100 msg/sec average, ~500 msg/sec peak             │
└─────────────────────────────────────────────────────────┘

HORIZONTAL SCALING STRATEGY:
├── Stateless API Servers (auto-scale based on CPU > 70%)
│   └── 3-20 instances behind load balancer
├── Dedicated Worker Pools (per job type)
│   ├── dm-sender-workers: 5-50 instances
│   ├── ai-agent-workers: 3-30 instances
│   ├── webhook-workers: 2-10 instances
│   └── analytics-workers: 2-5 instances
├── Redis Cluster (3 shards minimum)
│   ├── Shard 1: BullMQ queues + job data
│   ├── Shard 2: Session cache + rate limit counters
│   └── Shard 3: Pub/sub + real-time data
├── MongoDB Atlas
│   ├── Primary write node
│   ├── 2 read replicas (for analytics queries)
│   ├── Sharding by workspaceId (for contacts/messages)
│   └── M30 cluster (handles ~50K concurrent connections)
└── CDN (Vercel + Cloudflare)
    └── Static assets, webhook endpoints

AUTO-SCALING RULES:
├── API Server: CPU > 70% for 3 min → Scale +2 instances (max 20)
├── DM Workers: Queue depth > 1000 → Scale +5 workers
├── AI Workers: Queue depth > 500 → Scale +3 workers
├── Auto-scale down: CPU < 20% for 10 min → Scale -1 instance
└── Always maintain minimum: 2 API + 3 workers per type
```

### Database Sharding Strategy

```javascript
// Shard key: workspaceId
// Ensures all data for one workspace is co-located
// Great for multi-tenant isolation + performance

// Shard collections:
shardCollection("contacts", { workspaceId: "hashed" })
shardCollection("messages", { workspaceId: "hashed" })
shardCollection("automations", { workspaceId: "hashed" })
shardCollection("analytics_events", { timestamp: "hashed" })

// Non-sharded collections (small, cross-workspace):
// users, workspaces, subscriptions, affiliates
```

### Message Queue Architecture

```
BULLMQ QUEUE STRUCTURE:
┌─────────────────────────────────────────────────────────┐
│ QUEUE: dm-sender                                         │
│ ├── URGENT priority (0-10)   → Concurrency: 50           │
│ ├── NORMAL priority (11-100) → Concurrency: 25          │
│ └── BULK priority (101+)    → Concurrency: 10           │
│ Rate limit: 250 msg/min per IG account                  │
├─────────────────────────────────────────────────────────┤
│ QUEUE: ai-agent                                         │
│ ├── URGENT (1-5)           → Concurrency: 20            │
│ └── NORMAL (6+)            → Concurrency: 10            │
│ Rate limit: 500 req/min per workspace                   │
├─────────────────────────────────────────────────────────┤
│ QUEUE: webhook-process                                  │
│ └── Concurrency: 10, limiter: 100/min global          │
│ Retry: 3 attempts, exponential backoff                 │
│ Handles: DMs, comments, follows, story mentions       │
├─────────────────────────────────────────────────────────┤
│ QUEUE: flow-execution                                   │
│ └── Concurrency: 20 per workspace                       │
│ Max attempts: 1 (fail fast, retry via separate job)    │
├─────────────────────────────────────────────────────────┤
│ QUEUE: analytics                                        │
│ └── Concurrency: 5                                      │
│ Batch size: 100 events, flush every 5 sec              │
├─────────────────────────────────────────────────────────┤
│ QUEUE: broadcast                                        │
│ ├── BATCH size: 50 contacts                             │
│ ├── Rate: 1 batch per 10 sec per IG account             │
│ └── Progress tracking per broadcast                     │
└─────────────────────────────────────────────────────────┘
```

---

## 10. COMPLIANCE & SAFETY

### Instagram Platform Policy Compliance

```
ALLOWED:
✓ Automated responses to users who message first
✓ Comment-to-DM (user voluntarily triggers)
✓ Keyword-triggered responses to incoming DMs
✓ New follower welcome sequences
✓ Broadcast to existing subscribers (opt-in)
✓ AI-assisted responses within allowed limits

STRICTLY PROHIBITED:
✗ Sending unsolicited DMs (spam)
✗ Auto-follow/unfollow campaigns
✗ Mass commenting on posts
✗ Replying to story mentions with DMs (unless user message)
✗ Sending promotional content to non-subscribers
✗ Impersonating other accounts
✗ Collecting data through deceptive means

IMPLEMENTATION:
├── Consent tracking: Record when user opts in
├── Unsubscribe flow: "Reply STOP to opt out"
├── Message frequency caps: Max 3 msgs/person/24h
├── Block detection: Don't send to blocked users
├── Spam scoring: Flag suspicious activity patterns
├── Age verification: Minimum 13 (Instagram ToS)
└── Data retention: Auto-delete messages > 90 days (free tier)
```

### Anti-Spam Logic

```javascript
const spamRules = {
  // Per-contact limits
  maxMessagesPerDay: 10,
  maxMessagesPerWeek: 30,
  maxUniqueContactsPerDay: 50,

  // Per-account limits
  maxMessagesPerDay: 250,
  maxNewContactsPerDay: 100,

  // Spam indicators
  spamKeywords: ['free followers', 'get rich quick', 'click here now'],
  rapidFireThreshold: 3, // messages within 10 seconds
  sameMessageThreshold: 5, // identical messages to different contacts

  // Auto-pause triggers
  pauseOnFailureRate: 0.1, // > 10% failure rate → pause
  pauseOnSpamReports: 2,   // 2 spam reports → pause
};

// Spam scoring
const calculateSpamScore = async (workspaceId) => {
  const [recentMessages, failedMessages, reports] = await Promise.all([
    getRecentMessageCount(workspaceId, '24h'),
    getFailedMessageCount(workspaceId, '24h'),
    getSpamReportCount(workspaceId, '24h')
  ]);

  let score = 0;
  if (recentMessages > spamRules.maxMessagesPerDay) score += 30;
  if (failedMessages / recentMessages > spamRules.pauseOnFailureRate) score += 40;
  if (reports > 0) score += 30;
  if (score >= 70) pauseWorkspaceAutomations(workspaceId);

  return score;
};
```

---

## 11. GROWTH STRATEGY

### Viral Loops

```
1. "DM ME 'INFO' FOR..." Comment Triggers
   ├── User posts: "DM me 'info' for a free guide!"
   ├── ManyChat-style: Comment → Bot replies → User DMs bot
   ├── Our version: Comment → Webhook → Trigger DM sequence
   └── K-factor: Each viral post = organic discovery

2. Share-to-Unlock
   ├── User completes onboarding → "Share to unlock Pro"
   ├── Generates unique referral link
   ├── 3 shares = 1 month free
   └── Each share = reach to 100-500 new users

3. Comment-to-Lead Magnet
   ├── Auto-reply to comments: "DM me your email for free X"
   ├── Collect emails + grow DM list
   ├── Cross-post to other accounts (agency upsell)

4. User-Generated Content Loop
   ├── Users share screenshots of conversations
   ├── Tagged with #BuiltWithRsuShop
   ├── Featured in marketing → More signups
```

### Affiliate System

```javascript
// Affiliate workflow
const AFFILIATE_TIERS = {
  0:   { commission: 0.20, minReferrals: 0  },
  10:  { commission: 0.25, minReferrals: 10 },
  50:  { commission: 0.30, minReferrals: 50 },
  100: { commission: 0.35, minReferrals: 100 }
};

// Payout structure
// - 30% recurring commission (forever, not just first payment)
// - $50 bonus per 10 paid referrals
// - Minimum payout: $50
// - Payout methods: PayPal, Stripe, Bank Transfer

// Referral tracking
// 1. User registers with ?ref=CODE
// 2. Cookie-based tracking (90 days)
// 3. First-touch + last-touch attribution
// 4. Automatic commission calculation
// 5. Real-time affiliate dashboard
```

### Creator Onboarding Funnel

```
FUNNEL STAGES:
                                 ┌─────────────┐
                                 │  TikTok/YT  │
                                 │   Content   │
                                 └──────┬──────┘
                                        ▼
                                 ┌─────────────┐
                                 │   Free IG   │
                                 │  Automation │
                                 │   Template  │
                                 └──────┬──────┘
                                        ▼
                                 ┌─────────────┐
                                 │  Lead Magnet │
                                 │  "DM Guide" │
                                 └──────┬──────┘
                                        ▼
                                 ┌─────────────┐
                                 │  Waitlist / │
                                 │  Early Bird │
                                 └──────┬──────┘
                                        ▼
                                 ┌─────────────┐
                                 │  14-Day     │
                                 │  Free Trial │
                                 └──────┬──────┘
                                        ▼
                                 ┌─────────────┐
                                 │  $29/mo     │
                                 │  Starter    │
                                 └─────────────┘
```

---

## 12. 10 BONUS UNIQUE FEATURES

### Features NOT in ManyChat or LinkDM

```
1. 🤖 MULTI-LANGUAGE AI AGENT
   Real-time language detection + native-language responses.
   A fitness coach in Brazil gets Portuguese responses.
   Supports 30+ languages with dialect awareness.
   (Competitors: Only English or basic translation)

2. 🎯 CONVERSATION STAGE TRACKING
   Automatically tracks where each contact is in the
   buyer's journey: Awareness → Interest → Decision → Action.
   Visual funnel per contact, automated stage transitions.
   (Competitors: No buyer journey tracking)

3. 🧬 BEHAVIORAL LEAD SCORING
   AI-powered lead score based on:
   - Response speed to bot messages
   - Questions asked (high-intent keywords)
   - Engagement depth (DMs vs just likes)
   - Time of interaction
   - Profile completeness
   Score: 0-100, sortable, filterable.
   (Competitors: Basic tag only)

4. 📊 SENTIMENT-FLOW ADAPTATION
   Real-time sentiment analysis. If contact shows frustration
   (negative sentiment), flow automatically routes to human
   handoff + apology sequence. Positive sentiment → upsell path.
   (Competitors: Static flows, no sentiment adaptation)

5. 🎭 PERSONA-BASED ROUTING
   Same trigger, different response based on contact persona:
   - Follower tier (just follows, low intent)
   - Engaged follower (comments, high intent)
   - Past customer (VIP treatment)
   - Competitor follower (persuasion angle)
   (Competitors: One-size-fits-all automation)

6. 🔮 PREDICTIVE RE-ENGAGEMENT
   ML model predicts which contacts will go inactive.
   Automatically sends win-back sequence BEFORE they unfollow.
   "We miss you" sequence triggered at predicted churn risk.
   (Competitors: Manual re-engagement, reactive only)

7. 🌐 CROSS-PLATFORM DM ORCHESTRATION
   Connect Instagram + Facebook Messenger + WhatsApp.
   Single inbox, unified flow builder.
   Contact moves from IG DM → WhatsApp seamlessly.
   (Competitors: Single-platform only)

8. 📸 INSTAGRAM STORY POLL AUTOMATION
   Results of story polls/quiz + slider → Trigger flows.
   "90% of you want fitness tips → Launch course campaign"
   Automated launch sequence based on story engagement data.
   (Competitors: No story data integration)

9. 🧪 A/B TEST AUTOMATION FLOWS
   Built-in A/B testing for flows:
   - Random split (50/50 or custom %)
   - Winner selection (open rate, reply rate, conversion)
   - Automatic winner promotion
   - Statistical significance calculation
   (Competitors: Manual A/B setup or no testing)

10. 🎨 BRAND VOICE TRAINING
    Upload 10 sample conversations from your brand voice.
    AI learns your brand's tone, phrases, and style.
    Generated responses match your brand personality, not
    generic chatbot tone.
    (Competitors: Generic AI, no brand voice customization)
```

---

## 13. BUILD ROADMAP

```
PHASE 1: FOUNDATION (Week 1-4)
├── Project scaffolding (monorepo, Docker, environments)
├── Database schemas + Mongoose models
├── Auth system (JWT, workspace multi-tenancy)
├── Basic API structure
├── Instagram OAuth flow
├── Webhook receiver (verification + events)
├── BullMQ queue setup
└── Basic frontend (landing page, auth, dashboard shell)

PHASE 2: CORE ENGINE (Week 5-8)
├── Flow builder UI (React Flow)
├── Flow execution engine
├── Message sending via Instagram API
├── Rate limiting + retry logic
├── Basic automation triggers (comment, keyword, new follower)
├── Contact management
└── Conversation inbox

PHASE 3: AI LAYER (Week 9-12)
├── OpenAI integration
├── AI agent pipeline (context → prompt → parse)
├── Niche-specific prompt templates
├── Lead capture extraction
├── AI conversation preview tool
└── Sentiment analysis

PHASE 4: GROWTH LAYER (Week 13-16)
├── Broadcast messaging
├── Analytics dashboard
├── Stripe subscription integration
├── Usage tracking + overage billing
├── Affiliate system
├── Email sequences
└── Onboarding wizard

PHASE 5: SCALE & POLISH (Week 17-20)
├── Story automation
├── Multi-account management
├── Team collaboration
├── API access for developers
├── White labeling
├── Mobile PWA
├── Performance optimization
├── Load testing (k6)
└── Security audit

PHASE 6: LAUNCH (Week 21-24)
├── Beta program (100 users)
├── Documentation + video tutorials
├── Marketing site redesign
├── SEO optimization
├── Social proof collection
├── PR outreach
└── Public launch
```

---

## 14. SYSTEM ARCHITECTURE DIAGRAM (ASCII)

```
                            ╔══════════════════════════╗
                            ║     INTERNET / USERS      ║
                            ╚══════════════════════════╝
                                         │
                          ┌──────────────┼──────────────┐
                          │              │              │
                     ┌────▼────┐   ┌─────▼─────┐  ┌─────▼─────┐
                     │ Web App │   │ Mobile    │  │ Instagram │
                     │(Next.js)│   │ (PWA)     │  │  Webhooks │
                     └────┬────┘   └─────┬─────┘  └─────┬─────┘
                          │              │              │
                          └──────────────┼──────────────┘
                                         │
                         ┌───────────────▼───────────────┐
                         │         CLOUDFLARE / VERCEL    │
                         │  (CDN + SSL + DDoS Protection) │
                         └───────────────┬───────────────┘
                                         │
                         ┌───────────────▼───────────────┐
                         │      NGINX LOAD BALANCER       │
                         │   (SSL Termination + Routing)   │
                         └───────────────┬───────────────┘
                                         │
               ┌─────────────────────────┼─────────────────────────┐
               │                         │                         │
         ┌─────▼──────┐            ┌─────▼──────┐            ┌─────▼──────┐
         │ API SERVER │            │ API SERVER │            │ API SERVER │
         │   (Node)   │            │   (Node)   │            │   (Node)   │
         └┬─────────┬─┘            └┬─────────┬─┘            └┬─────────┬─┘
          │         │              │         │              │         │
          └────┬────┘              └────┬────┘              └────┬────┘
               │                         │                         │
    ┌──────────┼─────────────────────────┼─────────────────────────┼──────────┐
    │          │                         │                         │          │
    │    ┌─────▼─────┐              ┌─────▼─────┐            ┌─────▼─────┐  │
    │    │  REDIS    │              │  REDIS    │            │  REDIS    │  │
    │    │ (Queue +  │              │ (Cache +  │            │ (Pub/Sub) │  │
    │    │  Cache)   │              │ RateLimit)│            │           │  │
    │    └─────┬─────┘              └─────┬─────┘            └─────┬─────┘  │
    │          │                         │                         │          │
    │   ┌──────▼──────┐            ┌──────▼──────┐            ┌──────▼──────┐ │
    │   │ BullMQ      │            │ BullMQ      │            │ BullMQ      │ │
    │   │ Workers     │            │ Workers     │            │ Workers     │ │
    │   │ (DM Send)   │            │ (AI Agent)  │            │ (Webhook)   │ │
    │   └──────┬──────┘            └──────┬──────┘            └──────┬──────┘ │
    │          │                         │                         │          │
    │          │    ┌───────────────────┼───────────────────┐    │          │
    │          │    │                   │                   │    │          │
    │    ┌─────▼────▼─────┐      ┌─────▼─────▼─────┐ ┌─────▼─────▼─────┐  │
    │    │  MONGODB       │      │  OPENAI API     │ │  STRIPE API     │  │
    │    │  ATLAS         │      │  (GPT-4o-mini)   │ │  (Payments)     │  │
    │    │  CLUSTER       │      │                 │ │                 │  │
    │    └────────────────┘      └─────────────────┘ └─────────────────┘  │
    │                                                               │
    │                   ┌──────────────────────────────────┐         │
    └──────────────────►│     INSTAGRAM GRAPH API         │◄────────┘
                        │  (Meta for Developers)          │
                        └──────────────────────────────────┘
```

---

## 15. TECH STACK SUMMARY

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, React Flow |
| Backend | Node.js 20, Express 5, TypeScript |
| Database | MongoDB 7, Mongoose 8 |
| Queue | BullMQ 5, Redis 7 |
| Auth | JWT (access + refresh), bcrypt, node-crypto |
| AI | OpenAI SDK, GPT-4o-mini |
| Payments | Stripe SDK (Checkout, Subscriptions, Usage Records) |
| Email | Resend / SendGrid |
| Hosting | Railway / AWS EC2 |
| Container | Docker Compose |
| CI/CD | GitHub Actions |
| Monitoring | Sentry, PM2 |
| CDN | Vercel (frontend), Cloudflare (edge) |

---

*Specification version 1.0 — RsuShop.com Instagram Auto DM SaaS Platform*
