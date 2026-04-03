"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueueStats = exports.checkRateLimit = exports.addBroadcastJob = exports.addAnalyticsJob = exports.addWebhookJob = exports.addFlowJob = exports.addAIJob = exports.addDMJob = exports.getQueue = exports.QUEUE_NAMES = void 0;
const bullmq_1 = require("bullmq");
const index_js_1 = require("../config/index.js");
// Queue names
exports.QUEUE_NAMES = {
    DM_SENDER: 'dm-sender',
    AI_AGENT: 'ai-agent',
    WEBHOOK_PROCESS: 'webhook-process',
    FLOW_EXECUTION: 'flow-execution',
    BROADCAST: 'broadcast',
    ANALYTICS: 'analytics',
};
// Connection config for queues
const connection = {
    host: index_js_1.config.queue.redis.host,
    port: index_js_1.config.queue.redis.port,
    password: index_js_1.config.queue.redis.password,
};
// Rate limiter per Instagram account
const accountRateLimits = new Map();
const RATE_LIMIT_TOKENS = 250;
const RATE_LIMIT_REFILL_MS = 60000; // 1 minute
const getQueue = (name) => {
    return new bullmq_1.Queue(name, {
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: { count: 1000 },
            removeOnFail: { count: 5000 },
        },
    });
};
exports.getQueue = getQueue;
const addDMJob = async (data, priority = 0) => {
    const queue = (0, exports.getQueue)(exports.QUEUE_NAMES.DM_SENDER);
    return queue.add('send-dm', data, {
        priority,
        jobId: `dm-${data.workspaceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
};
exports.addDMJob = addDMJob;
const addAIJob = async (data, priority = 0) => {
    const queue = (0, exports.getQueue)(exports.QUEUE_NAMES.AI_AGENT);
    return queue.add('generate-response', data, {
        priority,
        jobId: `ai-${data.workspaceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
};
exports.addAIJob = addAIJob;
const addFlowJob = async (data, priority = 0) => {
    const queue = (0, exports.getQueue)(exports.QUEUE_NAMES.FLOW_EXECUTION);
    return queue.add('execute-flow', data, {
        priority,
        jobId: `flow-${data.automationId}-${Date.now()}`,
    });
};
exports.addFlowJob = addFlowJob;
const addWebhookJob = async (data) => {
    const queue = (0, exports.getQueue)(exports.QUEUE_NAMES.WEBHOOK_PROCESS);
    return queue.add('process-webhook', data, {
        jobId: `wh-${data.instagramAccountId}-${Date.now()}`,
    });
};
exports.addWebhookJob = addWebhookJob;
const addAnalyticsJob = async (data) => {
    const queue = (0, exports.getQueue)(exports.QUEUE_NAMES.ANALYTICS);
    return queue.add('track-event', data);
};
exports.addAnalyticsJob = addAnalyticsJob;
const addBroadcastJob = async (data) => {
    const queue = (0, exports.getQueue)(exports.QUEUE_NAMES.BROADCAST);
    return queue.add('send-broadcast', data, {
        jobId: `bc-${data.automationId}-${data.batchIndex}`,
    });
};
exports.addBroadcastJob = addBroadcastJob;
// Rate limit helper
const checkRateLimit = (accountId) => {
    const now = Date.now();
    let accountLimit = accountRateLimits.get(accountId);
    if (!accountLimit || now - accountLimit.lastRefill >= RATE_LIMIT_REFILL_MS) {
        accountRateLimits.set(accountId, {
            tokens: RATE_LIMIT_TOKENS - 1,
            lastRefill: now,
        });
        return true;
    }
    if (accountLimit.tokens <= 0) {
        return false;
    }
    accountLimit.tokens -= 1;
    return true;
};
exports.checkRateLimit = checkRateLimit;
const getQueueStats = async (name) => {
    const queue = (0, exports.getQueue)(name);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
};
exports.getQueueStats = getQueueStats;
//# sourceMappingURL=queueService.js.map