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
interface FlowJobData {
    workspaceId: string;
    automationId: string;
    contactId: string;
    conversationId?: string;
    triggerType: string;
    triggerPayload: Record<string, unknown>;
}
export declare const addDMJob: (data: DMJobData, priority?: number) => Promise<string>;
export declare const addFlowJob: (data: FlowJobData, priority?: number) => Promise<string>;
export declare const addAIJob: (data: any, priority?: number) => Promise<string>;
export {};
