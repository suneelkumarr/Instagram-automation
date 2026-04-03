import { Worker } from 'bullmq';
interface FlowJobData {
    workspaceId: string;
    automationId: string;
    contactId: string;
    conversationId?: string;
    triggerType: string;
    triggerPayload: Record<string, unknown>;
}
export declare const createFlowExecutionWorker: () => Worker<FlowJobData, any, string>;
export {};
