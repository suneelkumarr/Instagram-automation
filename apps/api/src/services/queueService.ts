import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { config } from '../config/index.js';

// Queue names
export const QUEUE_NAMES = {
  DM_SENDER: 'dm-sender',
  AI_AGENT: 'ai-agent',
  WEBHOOK_PROCESS: 'webhook-process',
  FLOW_EXECUTION: 'flow-execution',
  BROADCAST: 'broadcast',
  ANALYTICS: 'analytics',
} as const;

export interface DMJobData {
  workspaceId: string;
  instagramAccountId: string;
  contactId: string;
  conversationId?: string;
  recipientId: string;
  message: {
    text?: string;
    mediaUrl?: string;
    quickReplies?: Array<{ title: string; payload: string }>;
  };
  automationId?: string;
  priority?: number;
}

export interface AIJobData {
  workspaceId: string;
  instagramAccountId: string;
  contactId: string;
  conversationId: string;
  message: string;
  brandName: string;
  niche: string;
  customPrompt?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  automationId?: string;
}

export interface FlowJobData {
  workspaceId: string;
  automationId: string;
  contactId: string;
  conversationId?: string;
  triggerType: string;
  triggerPayload: Record<string, unknown>;
  priority?: number;
}

export interface WebhookJobData {
  workspaceId: string;
  instagramAccountId: string;
  event: string;
  payload: Record<string, unknown>;
}

export interface AnalyticsJobData {
  workspaceId: string;
  instagramAccountId?: string;
  event: string;
  automationId?: string;
  contactId?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface BroadcastJobData {
  workspaceId: string;
  instagramAccountId: string;
  automationId: string;
  contactIds: string[];
  batchIndex: number;
  batchSize: number;
  message: {
    text?: string;
    mediaUrl?: string;
  };
}

// Connection config for queues
const connection = {
  host: config.queue.redis.host,
  port: config.queue.redis.port,
  password: config.queue.redis.password,
};

// Rate limiter per Instagram account
const accountRateLimits = new Map<string, { tokens: number; lastRefill: number }>();
const RATE_LIMIT_TOKENS = 250;
const RATE_LIMIT_REFILL_MS = 60000; // 1 minute

export const getQueue = (name: string): Queue => {
  return new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });
};

export const addDMJob = async (data: DMJobData, priority = 0): Promise<string> => {
  const queue = getQueue(QUEUE_NAMES.DM_SENDER);
  return queue.add('send-dm', data, {
    priority,
    jobId: `dm-${data.workspaceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  });
};

export const addAIJob = async (data: AIJobData, priority = 0): Promise<string> => {
  const queue = getQueue(QUEUE_NAMES.AI_AGENT);
  return queue.add('generate-response', data, {
    priority,
    jobId: `ai-${data.workspaceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  });
};

export const addFlowJob = async (data: FlowJobData, priority = 0): Promise<string> => {
  const queue = getQueue(QUEUE_NAMES.FLOW_EXECUTION);
  return queue.add('execute-flow', data, {
    priority,
    jobId: `flow-${data.automationId}-${Date.now()}`,
  });
};

export const addWebhookJob = async (data: WebhookJobData): Promise<string> => {
  const queue = getQueue(QUEUE_NAMES.WEBHOOK_PROCESS);
  return queue.add('process-webhook', data, {
    jobId: `wh-${data.instagramAccountId}-${Date.now()}`,
  });
};

export const addAnalyticsJob = async (data: AnalyticsJobData): Promise<string> => {
  const queue = getQueue(QUEUE_NAMES.ANALYTICS);
  return queue.add('track-event', data);
};

export const addBroadcastJob = async (data: BroadcastJobData): Promise<string> => {
  const queue = getQueue(QUEUE_NAMES.BROADCAST);
  return queue.add('send-broadcast', data, {
    jobId: `bc-${data.automationId}-${data.batchIndex}`,
  });
};

// Rate limit helper
export const checkRateLimit = (accountId: string): boolean => {
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

export const getQueueStats = async (name: string) => {
  const queue = getQueue(name);
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  return { waiting, active, completed, failed, delayed };
};
