import mongoose, { Schema, Document } from 'mongoose';

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

const affiliateSchema = new Schema<IAffiliate>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    code: { type: String, unique: true, required: true, index: true },
    commission: { type: Number, default: 0.2 },
    referredCount: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    paidOut: { type: Number, default: 0 },
    pendingPayout: { type: Number, default: 0 },
    stripePayoutId: { type: String },
  },
  { timestamps: true }
);

export const Affiliate = mongoose.models.Affiliate || mongoose.model<IAffiliate>('Affiliate', affiliateSchema);
