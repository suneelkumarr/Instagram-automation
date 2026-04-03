import mongoose, { Document } from 'mongoose';
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
export declare const Message: mongoose.Model<any, {}, {}, {}, any, any>;
//# sourceMappingURL=Message.d.ts.map