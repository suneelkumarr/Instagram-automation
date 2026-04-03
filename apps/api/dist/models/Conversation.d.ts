import mongoose, { Document } from 'mongoose';
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
export declare const Conversation: mongoose.Model<any, {}, {}, {}, any, any>;
//# sourceMappingURL=Conversation.d.ts.map