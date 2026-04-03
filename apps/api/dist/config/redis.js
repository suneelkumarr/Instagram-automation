"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisSub = exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
};
exports.redis = new ioredis_1.default(redisConfig);
exports.redisSub = new ioredis_1.default(redisConfig);
exports.redis.on('connect', () => console.log('Redis connected'));
exports.redis.on('error', (err) => console.error('Redis error:', err));
exports.default = exports.redis;
//# sourceMappingURL=redis.js.map