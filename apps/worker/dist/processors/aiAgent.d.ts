import { Worker } from 'bullmq';
interface AIJobData {
    workspaceId: string;
    instagramAccountId: string;
    contactId: string;
    conversationId: string;
    message: string;
    brandName: string;
    niche: string;
    customPrompt?: string;
    conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    automationId?: string;
}
export declare const createAIWorker: () => Worker<AIJobData, any, string>;
export {};
