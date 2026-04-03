"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001'),
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
        accessExpiresIn: '15m',
        refreshExpiresIn: '7d',
    },
    instagram: {
        appId: process.env.META_APP_ID || '',
        appSecret: process.env.META_APP_SECRET || '',
        apiVersion: 'v18.0',
        graphApiBase: 'https://graph.facebook.com',
        webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || 'rsushop-webhook-token',
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        model: 'stepfun-ai/step-3.5-flash',
        fallbackApiKey: process.env.OPENAI_FALLBACK_API_KEY || '',
        fallbackModel: 'z-ai/glm4.7',
        maxTokens: 500,
        temperature: 0.7,
    },
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    },
    rateLimit: {
        windowMs: 60 * 1000, // 1 minute
        max: 100, // requests per window
        authMax: 10, // auth endpoints
    },
    queue: {
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
        },
    },
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    },
};
//# sourceMappingURL=index.js.map