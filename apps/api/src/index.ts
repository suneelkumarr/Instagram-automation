import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import connectDB from './config/database.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?._id || req.ip || 'anonymous';
  },
  skip: (req) => req.path === '/health',
});

app.use('/api', limiter);

// Instagram webhook with raw body for HMAC verification
// Must be registered BEFORE json() parses the body
app.post(
  '/api/v1/webhooks/instagram/:accountId',
  express.raw({ type: 'application/json', limit: '10mb' }),
  async (req: express.Request, res: express.Response) => {
    const { handleWebhookEvent } = await import('./controllers/instagramController.js');
    await handleWebhookEvent(req, res);
  }
);

// Body parsing (skips webhook routes since they're handled above)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.env !== 'test') {
  app.use(morgan('combined'));
}

// Routes (includes GET webhook verification, and all protected routes)
app.use('/api/v1', routes);

// Stripe webhook (needs raw body)
app.post('/api/v1/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const { stripeService } = await import('./services/stripeService.js');
    const sig = req.headers['stripe-signature'] as string;

    try {
      const result = await stripeService.handleWebhookEvent(
        req.body.toString(),
        sig
      );
      res.json({ received: true, type: result.type });
    } catch (error) {
      console.error('Stripe webhook error:', error);
      res.status(400).json({ error: 'Webhook error' });
    }
  }
);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();

  app.listen(config.port, () => {
    console.log(`API server running on port ${config.port}`);
    console.log(`Environment: ${config.env}`);
  });
};

startServer();

export default app;
