import { Worker } from 'bullmq';
interface WebhookJobData {
    workspaceId: string;
    instagramAccountId: string;
    event: string;
    payload: Record<string, unknown>;
}
export declare const createWebhookWorker: () => Worker<WebhookJobData, any, string>;
export {};
