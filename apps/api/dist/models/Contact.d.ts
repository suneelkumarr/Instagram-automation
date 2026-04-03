import mongoose, { Document } from 'mongoose';
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
export declare const Contact: mongoose.Model<any, {}, {}, {}, any, any>;
//# sourceMappingURL=Contact.d.ts.map