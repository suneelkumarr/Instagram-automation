import { Queue } from 'bullmq';
export declare const QUEUE_NAMES: {
    readonly DM_SENDER: "dm-sender";
    readonly AI_AGENT: "ai-agent";
    readonly WEBHOOK_PROCESS: "webhook-process";
    readonly FLOW_EXECUTION: "flow-execution";
    readonly BROADCAST: "broadcast";
    readonly ANALYTICS: "analytics";
};
export interface DMJobData {
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
    conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
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
export declare const getQueue: (name: string) => Queue;
export declare const addDMJob: (data: DMJobData, priority?: number) => Promise<string>;
export declare const addAIJob: (data: AIJobData, priority?: number) => Promise<string>;
export declare const addFlowJob: (data: FlowJobData, priority?: number) => Promise<string>;
export declare const addWebhookJob: (data: WebhookJobData) => Promise<string>;
export declare const addAnalyticsJob: (data: AnalyticsJobData) => Promise<string>;
export declare const addBroadcastJob: (data: BroadcastJobData) => Promise<string>;
export declare const checkRateLimit: (accountId: string) => boolean;
export declare const getQueueStats: (name: string) => Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
}>;
//# sourceMappingURL=queueService.d.ts.map