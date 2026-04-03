import mongoose, { Document } from 'mongoose';
export interface IFlowExecution extends Document {
    _id: mongoose.Types.ObjectId;
    workspaceId: mongoose.Types.ObjectId;
    automationId: mongoose.Types.ObjectId;
    contactId: mongoose.Types.ObjectId;
    conversationId?: mongoose.Types.ObjectId;
    triggerType: string;
    triggerPayload: Record<string, unknown>;
    currentNodeId: string;
    executionPath: string[];
    context: Record<string, unknown>;
    status: 'running' | 'completed' | 'failed' | 'paused';
    startedAt: Date;
    completedAt?: Date;
    error?: string;
    duration?: number;
}
export declare const FlowExecution: mongoose.Model<any, {}, {}, {}, any, any>;
//# sourceMappingURL=FlowExecution.d.ts.map