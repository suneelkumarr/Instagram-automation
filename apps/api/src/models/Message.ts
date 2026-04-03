import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  instagramAccountId: mongoose.Types.ObjectId;
  conversationId?: mongoose.Types.ObjectId;
  contactId: mongoose.Types.ObjectId;
  automationId?: mongoose.Types.ObjectId;
  igMessageId: string;
  igSenderId: string;
  igRecipientId: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'image' | 'video' | 'audio' | 'story_link' | 'link' | 'location' | 'file' | 'reaction' | 'unsupported';
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  quickReply?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sentVia: 'api' | 'webhook' | 'manual' | 'ai';
  aiTriggered: boolean;
  aiConfidence?: number;
  processingTime?: number;
}

const messageSchema = new Schema<IMessage>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramAccountId: { type: Schema.Types.ObjectId, ref: 'InstagramAccount', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', index: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
    automationId: { type: Schema.Types.ObjectId, ref: 'Automation', index: true },
    igMessageId: { type: String },
    igSenderId: { type: String, required: true },
    igRecipientId: { type: String, required: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'story_link', 'link', 'location', 'file', 'reaction', 'unsupported'],
      default: 'text',
    },
    content: { type: String, default: '' },
    mediaUrl: { type: String },
    mediaType: { type: String },
    quickReply: { type: String },
    status: { type: String, enum: ['sent', 'delivered', 'read', 'failed'], default: 'sent' },
    sentVia: { type: String, enum: ['api', 'webhook', 'manual', 'ai'], default: 'api' },
    aiTriggered: { type: Boolean, default: false },
    aiConfidence: { type: Number },
    processingTime: { type: Number },
  },
  { timestamps: true }
);

messageSchema.index({ workspaceId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ igMessageId: 1 }, { unique: true }); // Deduplication
messageSchema.index({ automationId: 1, createdAt: -1 });

// TTL index: auto-delete messages older than 90 days for free tier
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { 'sentVia': 'api' } });

export const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema);
