import mongoose, { Document } from 'mongoose';
export interface IAnalyticsEvent extends Document {
    _id: mongoose.Types.ObjectId;
    workspaceId: mongoose.Types.ObjectId;
    instagramAccountId?: mongoose.Types.ObjectId;
    event: string;
    automationId?: mongoose.Types.ObjectId;
    contactId?: mongoose.Types.ObjectId;
    conversationId?: mongoose.Types.ObjectId;
    metadata?: Record<string, unknown>;
    timestamp: Date;
}
export declare const AnalyticsEvent: mongoose.Model<any, {}, {}, {}, any, any>;
//# sourceMappingURL=AnalyticsEvent.d.ts.map