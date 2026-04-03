import mongoose, { Schema, Document } from 'mongoose';
import { PLAN_LIMITS, Plan } from '@rsushop/shared';

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

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    plan: { type: String, enum: ['free', 'starter', 'pro', 'agency'], default: 'free' },
    stripeCustomerId: { type: String, index: true },
    stripeSubscriptionId: { type: String },
    billingCycle: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
    limits: {
      instagramAccounts: { type: Number, default: () => PLAN_LIMITS.free.instagramAccounts },
      contacts: { type: Number, default: () => PLAN_LIMITS.free.contacts },
      automations: { type: Number, default: () => PLAN_LIMITS.free.automations },
      monthlyMessages: { type: Number, default: () => PLAN_LIMITS.free.monthlyMessages },
      aiCredits: { type: Number, default: () => PLAN_LIMITS.free.aiCredits },
    },
    usage: {
      instagramAccounts: { type: Number, default: 0 },
      contacts: { type: Number, default: 0 },
      automations: { type: Number, default: 0 },
      monthlyMessages: { type: Number, default: 0 },
      aiCredits: { type: Number, default: 0 },
      resetAt: { type: Date, default: () => new Date(new Date().setDate(1)) },
    },
    features: {
      aiAgent: { type: Boolean, default: false },
      visualFlowBuilder: { type: Boolean, default: true },
      analytics: { type: Boolean, default: true },
      teamMembers: { type: Number, default: 1 },
      apiAccess: { type: Boolean, default: false },
      whiteLabel: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

workspaceSchema.methods.syncLimitsFromPlan = function (plan: Plan) {
  const limits = PLAN_LIMITS[plan];
  this.plan = plan;
  this.limits = {
    instagramAccounts: limits.instagramAccounts,
    contacts: limits.contacts,
    automations: limits.automations,
    monthlyMessages: limits.monthlyMessages,
    aiCredits: limits.aiCredits,
  };
  this.features = {
    aiAgent: plan !== 'free',
    visualFlowBuilder: true,
    analytics: true,
    teamMembers: limits.teamMembers,
    apiAccess: plan === 'pro' || plan === 'agency',
    whiteLabel: plan === 'agency',
  };
};

workspaceSchema.methods.checkUsageLimit = function (type: keyof IWorkspace['usage'], count = 1): boolean {
  const limit = this.limits[type];
  const current = this.usage[type];
  if (limit === Infinity) return true;
  return current + count <= limit;
};

workspaceSchema.methods.incrementUsage = async function (type: keyof IWorkspace['usage'], count = 1) {
  const now = new Date();
  if (this.usage.resetAt < now) {
    // Monthly reset
    this.usage.resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    this.usage.monthlyMessages = 0;
    this.usage.aiCredits = 0;
  }
  (this.usage as Record<string, unknown>)[type] = (this.usage as Record<string, number>)[type] + count;
  await this.save();
};

export const Workspace = mongoose.models.Workspace || mongoose.model<IWorkspace>('Workspace', workspaceSchema);
