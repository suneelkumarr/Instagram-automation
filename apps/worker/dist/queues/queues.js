"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsQueue = exports.broadcastQueue = exports.flowExecutionQueue = exports.webhookProcessQueue = exports.aiAgentQueue = exports.dmSenderQueue = exports.createQueue = exports.getConnection = exports.QUEUE_NAMES = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const connection = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
});
exports.QUEUE_NAMES = {
    DM_SENDER: 'dm-sender',
    AI_AGENT: 'ai-agent',
    WEBHOOK_PROCESS: 'webhook-process',
    FLOW_EXECUTION: 'flow-execution',
    BROADCAST: 'broadcast',
    ANALYTICS: 'analytics',
};
const getConnection = () => connection;
exports.getConnection = getConnection;
const createQueue = (name) => new bullmq_1.Queue(name, { connection });
exports.createQueue = createQueue;
// Pre-create all queues
exports.dmSenderQueue = (0, exports.createQueue)(exports.QUEUE_NAMES.DM_SENDER);
exports.aiAgentQueue = (0, exports.createQueue)(exports.QUEUE_NAMES.AI_AGENT);
exports.webhookProcessQueue = (0, exports.createQueue)(exports.QUEUE_NAMES.WEBHOOK_PROCESS);
exports.flowExecutionQueue = (0, exports.createQueue)(exports.QUEUE_NAMES.FLOW_EXECUTION);
exports.broadcastQueue = (0, exports.createQueue)(exports.QUEUE_NAMES.BROADCAST);
exports.analyticsQueue = (0, exports.createQueue)(exports.QUEUE_NAMES.ANALYTICS);
//# sourceMappingURL=queues.js.map