import mongoose, { Document } from 'mongoose';
export interface ISubscription extends Document {
    _id: mongoose.Types.ObjectId;
    workspaceId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    stripePriceId: string;
    plan: string;
    status: 'active' | 'past_due' | 'canceled' | 'trialing';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    trialEndsAt?: Date;
    cancelledAt?: Date;
}
export declare const Subscription: mongoose.Model<any, {}, {}, {}, any, any>;
//# sourceMappingURL=Subscription.d.ts.map