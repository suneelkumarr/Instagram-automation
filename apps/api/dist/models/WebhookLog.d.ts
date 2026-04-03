import mongoose, { Document } from 'mongoose';
export interface IWebhookLog extends Document {
    _id: mongoose.Types.ObjectId;
    workspaceId: mongoose.Types.ObjectId;
    instagramAccountId?: mongoose.Types.ObjectId;
    event: string;
    payload: Record<string, unknown>;
    processed: boolean;
    processingTime?: number;
    error?: string;
}
export declare const WebhookLog: mongoose.Model<any, {}, {}, {}, any, any>;
//# sourceMappingURL=WebhookLog.d.ts.map