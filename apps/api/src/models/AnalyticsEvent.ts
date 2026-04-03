import mongoose, { Schema, Document } from 'mongoose';

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

const analyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramAccountId: { type: Schema.Types.ObjectId, ref: 'InstagramAccount', index: true },
    event: { type: String, required: true, index: true },
    automationId: { type: Schema.Types.ObjectId, ref: 'Automation', index: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// TTL: auto-delete analytics older than 365 days
analyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const AnalyticsEvent = mongoose.models.AnalyticsEvent || mongoose.model<IAnalyticsEvent>('AnalyticsEvent', analyticsEventSchema);
