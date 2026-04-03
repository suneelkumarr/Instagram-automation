import mongoose, { Schema, Document } from 'mongoose';

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

const webhookLogSchema = new Schema<IWebhookLog>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramAccountId: { type: Schema.Types.ObjectId, ref: 'InstagramAccount', index: true },
    event: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    processed: { type: Boolean, default: false },
    processingTime: { type: Number },
    error: { type: String },
  },
  { timestamps: true }
);

// TTL: auto-delete webhook logs older than 30 days
webhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const WebhookLog = mongoose.models.WebhookLog || mongoose.model<IWebhookLog>('WebhookLog', webhookLogSchema);
