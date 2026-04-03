import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  instagramAccountId: mongoose.Types.ObjectId;
  contactId: mongoose.Types.ObjectId;
  igThreadId: string;
  status: 'open' | 'closed' | 'pending' | 'bot' | 'human';
  lastMessageAt?: Date;
  lastMessageFrom?: 'contact' | 'bot' | 'agent';
  messageCount: number;
  tags: string[];
  assignedTo?: mongoose.Types.ObjectId;
  priority: 'low' | 'normal' | 'high';
  sentiment?: 'positive' | 'neutral' | 'negative';
}

const conversationSchema = new Schema<IConversation>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramAccountId: { type: Schema.Types.ObjectId, ref: 'InstagramAccount', required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
    igThreadId: { type: String, index: true },
    status: {
      type: String,
      enum: ['open', 'closed', 'pending', 'bot', 'human'],
      default: 'open',
    },
    lastMessageAt: { type: Date },
    lastMessageFrom: { type: String, enum: ['contact', 'bot', 'agent'] },
    messageCount: { type: Number, default: 0 },
    tags: [{ type: String }],
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
  },
  { timestamps: true }
);

conversationSchema.index({ workspaceId: 1, status: 1 });
conversationSchema.index({ workspaceId: 1, lastMessageAt: -1 });
conversationSchema.index({ contactId: 1, igThreadId: 1 }, { unique: true });

export const Conversation = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', conversationSchema);
