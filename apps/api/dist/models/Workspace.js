"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Workspace = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const shared_1 = require("@rsushop/shared");
const workspaceSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, index: true },
    ownerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    memberIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    plan: { type: String, enum: ['free', 'starter', 'pro', 'agency'], default: 'free' },
    stripeCustomerId: { type: String, index: true },
    stripeSubscriptionId: { type: String },
    billingCycle: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
    limits: {
        instagramAccounts: { type: Number, default: () => shared_1.PLAN_LIMITS.free.instagramAccounts },
        contacts: { type: Number, default: () => shared_1.PLAN_LIMITS.free.contacts },
        automations: { type: Number, default: () => shared_1.PLAN_LIMITS.free.automations },
        monthlyMessages: { type: Number, default: () => shared_1.PLAN_LIMITS.free.monthlyMessages },
        aiCredits: { type: Number, default: () => shared_1.PLAN_LIMITS.free.aiCredits },
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
}, { timestamps: true });
workspaceSchema.methods.syncLimitsFromPlan = function (plan) {
    const limits = shared_1.PLAN_LIMITS[plan];
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
workspaceSchema.methods.checkUsageLimit = function (type, count = 1) {
    const limit = this.limits[type];
    const current = this.usage[type];
    if (limit === Infinity)
        return true;
    return current + count <= limit;
};
workspaceSchema.methods.incrementUsage = async function (type, count = 1) {
    const now = new Date();
    if (this.usage.resetAt < now) {
        // Monthly reset
        this.usage.resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        this.usage.monthlyMessages = 0;
        this.usage.aiCredits = 0;
    }
    this.usage[type] = this.usage[type] + count;
    await this.save();
};
exports.Workspace = mongoose_1.default.models.Workspace || mongoose_1.default.model('Workspace', workspaceSchema);
//# sourceMappingURL=Workspace.js.map