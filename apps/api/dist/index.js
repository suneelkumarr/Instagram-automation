"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const index_js_1 = require("./config/index.js");
const database_js_1 = __importDefault(require("./config/database.js"));
const index_js_2 = __importDefault(require("./routes/index.js"));
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const app = (0, express_1.default)();
// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
// CORS
app.use((0, cors_1.default)({
    origin: index_js_1.config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id'],
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: index_js_1.config.rateLimit.windowMs,
    max: index_js_1.config.rateLimit.max,
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
app.post('/api/v1/webhooks/instagram/:accountId', express_1.default.raw({ type: 'application/json', limit: '10mb' }), async (req, res) => {
    const { handleWebhookEvent } = await import('./controllers/instagramController.js');
    await handleWebhookEvent(req, res);
});
// Body parsing (skips webhook routes since they're handled above)
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Logging
if (index_js_1.config.env !== 'test') {
    app.use((0, morgan_1.default)('combined'));
}
// Routes (includes GET webhook verification, and all protected routes)
app.use('/api/v1', index_js_2.default);
// Stripe webhook (needs raw body)
app.post('/api/v1/webhooks/stripe', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
    const { stripeService } = await import('./services/stripeService.js');
    const sig = req.headers['stripe-signature'];
    try {
        const result = await stripeService.handleWebhookEvent(req.body.toString(), sig);
        res.json({ received: true, type: result.type });
    }
    catch (error) {
        console.error('Stripe webhook error:', error);
        res.status(400).json({ error: 'Webhook error' });
    }
});
// Error handling
app.use(errorHandler_js_1.notFound);
app.use(errorHandler_js_1.errorHandler);
// Start server
const startServer = async () => {
    await (0, database_js_1.default)();
    app.listen(index_js_1.config.port, () => {
        console.log(`API server running on port ${index_js_1.config.port}`);
        console.log(`Environment: ${index_js_1.config.env}`);
    });
};
startServer();
exports.default = app;
//# sourceMappingURL=index.js.map