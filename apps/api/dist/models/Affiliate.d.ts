import mongoose, { Document } from 'mongoose';
export interface IAffiliate extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    code: string;
    commission: number;
    referredCount: number;
    totalEarnings: number;
    paidOut: number;
    pendingPayout: number;
    stripePayoutId?: string;
}
export declare const Affiliate: mongoose.Model<any, {}, {}, {}, any, any>;
//# sourceMappingURL=Affiliate.d.ts.map