import mongoose, { Schema, Document } from 'mongoose';
import { IGAccountStatus } from '@rsushop/shared';
import { encryptToken, decryptToken } from '../utils/crypto.js';

export interface IInstagramAccount extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  instagramId: string;       // IG Business Account ID from Meta
  username: string;
  displayName: string;
  profilePicture?: string;
  followersCount?: number;
  bio?: string;
  website?: string;
  accessToken: string;
  accessTokenExpiresAt?: Date;
  permissions: string[];
  pageId?: string;
  appId?: string;
  status: IGAccountStatus;
  lastSyncedAt?: Date;
  webhookVerifyToken: string;
}

const instagramAccountSchema = new Schema<IInstagramAccount>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramId: { type: String, unique: true, index: true },
    username: { type: String, required: true },
    displayName: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    followersCount: { type: Number, default: 0 },
    bio: { type: String, default: '' },
    website: { type: String, default: '' },
    accessToken: { type: String, required: true },
    accessTokenExpiresAt: { type: Date },
    permissions: [{ type: String }],
    pageId: { type: String },
    appId: { type: String },
    status: { type: String, enum: ['active', 'expired', 'pending', 'disconnected'], default: 'pending' },
    lastSyncedAt: { type: Date },
    webhookVerifyToken: { type: String, default: () => require('uuid').v4() },
  },
  { timestamps: true }
);

// Encrypt access token before saving
instagramAccountSchema.pre('save', function (next) {
  if (this.isModified('accessToken')) {
    this.accessToken = encryptToken(this.accessToken);
  }
  next();
});

// Decrypt on retrieval
instagramAccountSchema.methods.getDecryptedToken = function (): string {
  return decryptToken(this.accessToken);
};

instagramAccountSchema.methods.isTokenExpired = function (): boolean {
  if (!this.accessTokenExpiresAt) return false;
  return this.accessTokenExpiresAt < new Date();
};

export const InstagramAccount = mongoose.models.InstagramAccount || mongoose.model<IInstagramAccount>('InstagramAccount', instagramAccountSchema);
