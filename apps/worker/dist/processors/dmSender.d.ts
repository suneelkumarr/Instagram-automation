import { Worker } from 'bullmq';
interface DMJobData {
    workspaceId: string;
    instagramAccountId: string;
    contactId: string;
    conversationId?: string;
    recipientId: string;
    message: {
        text?: string;
        mediaUrl?: string;
        quickReplies?: Array<{
            title: string;
            payload: string;
        }>;
    };
    automationId?: string;
}
export declare const createDMSenderWorker: () => Worker<DMJobData, any, string>;
export {};
