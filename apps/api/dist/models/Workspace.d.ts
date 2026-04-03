import mongoose, { Document } from 'mongoose';
import { Plan } from '@rsushop/shared';
export interface IWorkspace extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    ownerId: mongoose.Types.ObjectId;
    memberIds: mongoose.Types.ObjectId[];
    plan: Plan;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    billingCycle: 'monthly' | 'annual';
    limits: {
        instagramAccounts: number;
        contacts: number;
        automations: number;
        monthlyMessages: number;
        aiCredits: number;
    };
    usage: {
        instagramAccounts: number;
        contacts: number;
        automations: number;
        monthlyMessages: number;
        aiCredits: number;
        resetAt: Date;
    };
    features: {
        aiAgent: boolean;
        visualFlowBuilder: boolean;
        analytics: boolean;
        teamMembers: number;
        apiAccess: boolean;
        whiteLabel: boolean;
    };
}
export declare const Workspace: mongoose.Model<any, {}, {}, {}, any, any>;
//# sourceMappingURL=Workspace.d.ts.map