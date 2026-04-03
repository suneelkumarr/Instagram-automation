import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  instagramAccountId: mongoose.Types.ObjectId;
  igUserId: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  biography?: string;
  followersCount?: number;
  followingCount?: number;
  mediaCount?: number;
  website?: string;
  isBusiness: boolean;
  source: 'follower' | 'dm' | 'comment' | 'imported';
  tags: string[];
  lists: string[];
  customFields: Record<string, string | number | boolean>;
  leadScore: number;
  lastInteractionAt?: Date;
  firstSeenAt?: Date;
  conversationStage: 'aware' | 'interested' | 'decision' | 'action' | 'customer';
  followStatus: 'following' | 'not_following' | 'requested' | 'unknown';
}

const contactSchema = new Schema<IContact>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramAccountId: { type: Schema.Types.ObjectId, ref: 'InstagramAccount', required: true, index: true },
    igUserId: { type: String, required: true },
    username: { type: String, required: true },
    displayName: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    biography: { type: String, default: '' },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    mediaCount: { type: Number, default: 0 },
    website: { type: String, default: '' },
    isBusiness: { type: Boolean, default: false },
    source: { type: String, enum: ['follower', 'dm', 'comment', 'imported'], default: 'dm' },
    tags: [{ type: String }],
    lists: [{ type: String }],
    customFields: { type: Schema.Types.Mixed, default: {} },
    leadScore: { type: Number, default: 0 },
    lastInteractionAt: { type: Date },
    firstSeenAt: { type: Date },
    conversationStage: {
      type: String,
      enum: ['aware', 'interested', 'decision', 'action', 'customer'],
      default: 'aware',
    },
    followStatus: {
      type: String,
      enum: ['following', 'not_following', 'requested', 'unknown'],
      default: 'unknown',
    },
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate contacts
contactSchema.index(
  { instagramAccountId: 1, igUserId: 1 },
  { unique: true }
);

// Text index for search
contactSchema.index({ username: 'text', displayName: 'text' });

contactSchema.methods.updateLeadScore = async function (delta: number) {
  this.leadScore = Math.max(0, Math.min(100, this.leadScore + delta));
  await this.save();
};

contactSchema.methods.addTag = async function (tag: string) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    await this.save();
  }
};

contactSchema.methods.removeTag = async function (tag: string) {
  this.tags = this.tags.filter((t) => t !== tag);
  await this.save();
};

contactSchema.methods.addToList = async function (listName: string) {
  if (!this.lists.includes(listName)) {
    this.lists.push(listName);
    await this.save();
  }
};

contactSchema.methods.removeFromList = async function (listName: string) {
  this.lists = this.lists.filter((l) => l !== listName);
  await this.save();
};

export const Contact = mongoose.models.Contact || mongoose.model<IContact>('Contact', contactSchema);
