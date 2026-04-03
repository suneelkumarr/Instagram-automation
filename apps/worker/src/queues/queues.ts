import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

export const QUEUE_NAMES = {
  DM_SENDER: 'dm-sender',
  AI_AGENT: 'ai-agent',
  WEBHOOK_PROCESS: 'webhook-process',
  FLOW_EXECUTION: 'flow-execution',
  BROADCAST: 'broadcast',
  ANALYTICS: 'analytics',
} as const;

export const getConnection = () => connection;

export const createQueue = (name: string) => new Queue(name, { connection });

// Pre-create all queues
export const dmSenderQueue = createQueue(QUEUE_NAMES.DM_SENDER);
export const aiAgentQueue = createQueue(QUEUE_NAMES.AI_AGENT);
export const webhookProcessQueue = createQueue(QUEUE_NAMES.WEBHOOK_PROCESS);
export const flowExecutionQueue = createQueue(QUEUE_NAMES.FLOW_EXECUTION);
export const broadcastQueue = createQueue(QUEUE_NAMES.BROADCAST);
export const analyticsQueue = createQueue(QUEUE_NAMES.ANALYTICS);
