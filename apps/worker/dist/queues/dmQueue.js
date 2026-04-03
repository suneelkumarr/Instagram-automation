"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAIJob = exports.addFlowJob = exports.addDMJob = void 0;
const bullmq_1 = require("bullmq");
const queues_js_1 = require("./queues.js");
const dmQueue = new bullmq_1.Queue('dm-sender', { connection: (0, queues_js_1.getConnection)() });
const flowQueue = new bullmq_1.Queue('flow-execution', { connection: (0, queues_js_1.getConnection)() });
const addDMJob = async (data, priority = 0) => {
    const job = await dmQueue.add('send-dm', data, {
        priority,
        jobId: `dm-${data.workspaceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
    });
    return job.id;
};
exports.addDMJob = addDMJob;
const addFlowJob = async (data, priority = 0) => {
    const job = await flowQueue.add('execute-flow', data, {
        priority,
        jobId: `flow-${data.automationId}-${Date.now()}`,
        attempts: 1,
    });
    return job.id;
};
exports.addFlowJob = addFlowJob;
const addAIJob = async (data, priority = 0) => {
    const aiQueue = new bullmq_1.Queue('ai-agent', { connection: (0, queues_js_1.getConnection)() });
    const job = await aiQueue.add('generate-response', data, {
        priority,
        jobId: `ai-${data.workspaceId}-${Date.now()}`,
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
    });
    return job.id;
};
exports.addAIJob = addAIJob;
//# sourceMappingURL=dmQueue.js.map