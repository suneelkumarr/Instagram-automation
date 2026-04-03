import mongoose, { Document } from 'mongoose';
import { IGAccountStatus } from '@rsushop/shared';
export interface IInstagramAccount extends Document {
    _id: mongoose.Types.ObjectId;
    workspaceId: mongoose.Types.ObjectId;
    instagramId: string;
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
export declare const InstagramAccount: mongoose.Model<any, {}, {}, {}, any, any>;
//# sourceMappingURL=InstagramAccount.d.ts.map