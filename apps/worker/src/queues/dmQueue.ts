import { Queue } from 'bullmq';
import { getConnection } from './queues.js';

interface DMJobData {
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
}

interface FlowJobData {
  workspaceId: string;
  automationId: string;
  contactId: string;
  conversationId?: string;
  triggerType: string;
  triggerPayload: Record<string, unknown>;
}

const dmQueue = new Queue('dm-sender', { connection: getConnection() });
const flowQueue = new Queue('flow-execution', { connection: getConnection() });

export const addDMJob = async (data: DMJobData, priority = 0): Promise<string> => {
  return dmQueue.add('send-dm', data, {
    priority,
    jobId: `dm-${data.workspaceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
};

export const addFlowJob = async (data: FlowJobData, priority = 0): Promise<string> => {
  return flowQueue.add('execute-flow', data, {
    priority,
    jobId: `flow-${data.automationId}-${Date.now()}`,
    attempts: 1,
  });
};

export const addAIJob = async (data: any, priority = 0): Promise<string> => {
  const aiQueue = new Queue('ai-agent', { connection: getConnection() });
  return aiQueue.add('generate-response', data, {
    priority,
    jobId: `ai-${data.workspaceId}-${Date.now()}`,
    attempts: 2,
    backoff: { type: 'exponential', delay: 2000 },
  });
};
