"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsEvent = exports.WebhookLog = exports.FlowExecution = exports.Message = exports.Conversation = exports.Contact = exports.Automation = exports.InstagramAccount = exports.Workspace = exports.User = void 0;
// Re-export models for worker
const mongoose_1 = __importDefault(require("mongoose"));
const UserSchema = new mongoose_1.default.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    avatar: { type: String, default: '' },
    emailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    settings: {
        timezone: { type: String, default: 'UTC' },
        language: { type: String, default: 'en' },
        notifications: { email: { type: Boolean, default: true } },
    },
    referrerId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User' },
    affiliateCode: { type: String, unique: true },
    affiliateEarnings: { type: Number, default: 0 },
}, { timestamps: true });
exports.User = mongoose_1.default.models.User || mongoose_1.default.model('User', UserSchema);
const WorkspaceSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    slug: { type: String, unique: true },
    ownerId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    memberIds: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User' }],
    plan: { type: String, enum: ['free', 'starter', 'pro', 'agency'], default: 'free' },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    billingCycle: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
    limits: {
        instagramAccounts: { type: Number, default: 1 },
        contacts: { type: Number, default: 100 },
        automations: { type: Number, default: 3 },
        monthlyMessages: { type: Number, default: 500 },
        aiCredits: { type: Number, default: 50 },
    },
    usage: {
        instagramAccounts: { type: Number, default: 0 },
        contacts: { type: Number, default: 0 },
        automations: { type: Number, default: 0 },
        monthlyMessages: { type: Number, default: 0 },
        aiCredits: { type: Number, default: 0 },
        resetAt: { type: Date, default: () => new Date() },
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
WorkspaceSchema.methods.checkUsageLimit = function (type, count = 1) {
    const limit = this.limits[type];
    const current = this.usage[type];
    if (limit === Infinity)
        return true;
    return current + count <= limit;
};
WorkspaceSchema.methods.incrementUsage = async function (type, count = 1) {
    const now = new Date();
    if (this.usage.resetAt < now) {
        this.usage.resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        this.usage.monthlyMessages = 0;
        this.usage.aiCredits = 0;
    }
    this.usage[type] += count;
    await this.save();
};
exports.Workspace = mongoose_1.default.models.Workspace || mongoose_1.default.model('Workspace', WorkspaceSchema);
const InstagramAccountSchema = new mongoose_1.default.Schema({
    workspaceId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    instagramId: { type: String, unique: true },
    username: { type: String, required: true },
    displayName: { type: String },
    profilePicture: { type: String },
    followersCount: { type: Number, default: 0 },
    bio: { type: String },
    website: { type: String },
    accessToken: { type: String, required: true },
    accessTokenExpiresAt: { type: Date },
    permissions: [{ type: String }],
    pageId: { type: String },
    appId: { type: String },
    status: { type: String, enum: ['active', 'expired', 'pending', 'disconnected'], default: 'pending' },
    lastSyncedAt: { type: Date },
    webhookVerifyToken: { type: String },
}, { timestamps: true });
InstagramAccountSchema.methods.getDecryptedToken = function () {
    // In production, this would decrypt the token
    // For now, return as-is
    return this.accessToken;
};
InstagramAccountSchema.methods.isTokenExpired = function () {
    if (!this.accessTokenExpiresAt)
        return false;
    return new Date() >= this.accessTokenExpiresAt;
};
exports.InstagramAccount = mongoose_1.default.models.InstagramAccount || mongoose_1.default.model('InstagramAccount', InstagramAccountSchema);
const AutomationSchema = new mongoose_1.default.Schema({
    workspaceId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    instagramAccountId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'InstagramAccount', required: true },
    name: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ['draft', 'active', 'paused', 'archived'], default: 'draft' },
    trigger: {
        type: { type: String, required: true },
        config: { type: mongoose_1.default.Schema.Types.Mixed, default: {} },
    },
    flowData: {
        nodes: { type: mongoose_1.default.Schema.Types.Mixed, default: [] },
        edges: { type: mongoose_1.default.Schema.Types.Mixed, default: [] },
    },
    stats: {
        triggered: { type: Number, default: 0 },
        completed: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        lastTriggeredAt: { type: Date },
    },
    version: { type: Number, default: 1 },
    publishedAt: { type: Date },
    createdBy: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
AutomationSchema.methods.incrementTriggered = async function () {
    this.stats.triggered += 1;
    this.stats.lastTriggeredAt = new Date();
    await this.save();
};
AutomationSchema.methods.incrementCompleted = async function () {
    this.stats.completed += 1;
    await this.save();
};
AutomationSchema.methods.incrementFailed = async function () {
    this.stats.failed += 1;
    await this.save();
};
exports.Automation = mongoose_1.default.models.Automation || mongoose_1.default.model('Automation', AutomationSchema);
const ContactSchema = new mongoose_1.default.Schema({
    workspaceId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    instagramAccountId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'InstagramAccount', required: true },
    igUserId: { type: String, required: true },
    username: { type: String, required: true },
    displayName: { type: String },
    profilePicture: { type: String },
    biography: { type: String },
    followersCount: { type: Number, default: 0 },
    isBusiness: { type: Boolean, default: false },
    source: { type: String, enum: ['follower', 'dm', 'comment', 'imported'], default: 'dm' },
    tags: [{ type: String }],
    lists: [{ type: String }],
    customFields: { type: mongoose_1.default.Schema.Types.Mixed, default: {} },
    leadScore: { type: Number, default: 0 },
    lastInteractionAt: { type: Date },
    firstSeenAt: { type: Date },
    conversationStage: { type: String, enum: ['aware', 'interested', 'decision', 'action', 'customer'], default: 'aware' },
    followStatus: { type: String, enum: ['following', 'not_following', 'requested', 'unknown'], default: 'unknown' },
}, { timestamps: true });
ContactSchema.index({ instagramAccountId: 1, igUserId: 1 }, { unique: true });
ContactSchema.methods.updateLeadScore = async function (delta) {
    this.leadScore = Math.max(0, Math.min(100, this.leadScore + delta));
    await this.save();
};
exports.Contact = mongoose_1.default.models.Contact || mongoose_1.default.model('Contact', ContactSchema);
const ConversationSchema = new mongoose_1.default.Schema({
    workspaceId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    instagramAccountId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'InstagramAccount', required: true },
    contactId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Contact', required: true },
    igThreadId: { type: String },
    status: { type: String, enum: ['open', 'closed', 'pending', 'bot', 'human'], default: 'open' },
    lastMessageAt: { type: Date },
    lastMessageFrom: { type: String, enum: ['contact', 'bot', 'agent'] },
    messageCount: { type: Number, default: 0 },
    tags: [{ type: String }],
    assignedTo: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
}, { timestamps: true });
ConversationSchema.index({ contactId: 1, igThreadId: 1 }, { unique: true });
exports.Conversation = mongoose_1.default.models.Conversation || mongoose_1.default.model('Conversation', ConversationSchema);
const MessageSchema = new mongoose_1.default.Schema({
    workspaceId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    instagramAccountId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'InstagramAccount', required: true },
    conversationId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Conversation' },
    contactId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Contact', required: true },
    automationId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Automation' },
    igMessageId: { type: String },
    igSenderId: { type: String, required: true },
    igRecipientId: { type: String, required: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    type: { type: String, enum: ['text', 'image', 'video', 'audio', 'story_link', 'link', 'location', 'file', 'reaction', 'unsupported'], default: 'text' },
    content: { type: String },
    mediaUrl: { type: String },
    mediaType: { type: String },
    quickReply: { type: String },
    status: { type: String, enum: ['sent', 'delivered', 'read', 'failed'], default: 'sent' },
    sentVia: { type: String, enum: ['api', 'webhook', 'manual', 'ai'], default: 'api' },
    aiTriggered: { type: Boolean, default: false },
    aiConfidence: { type: Number },
    processingTime: { type: Number },
}, { timestamps: true });
MessageSchema.index({ igMessageId: 1 }, { unique: true });
exports.Message = mongoose_1.default.models.Message || mongoose_1.default.model('Message', MessageSchema);
const FlowExecutionSchema = new mongoose_1.default.Schema({
    workspaceId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    automationId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Automation', required: true },
    contactId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Contact', required: true },
    conversationId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Conversation' },
    triggerType: { type: String, required: true },
    triggerPayload: { type: mongoose_1.default.Schema.Types.Mixed, default: {} },
    currentNodeId: { type: String, required: true },
    executionPath: [{ type: String }],
    context: { type: mongoose_1.default.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['running', 'completed', 'failed', 'paused'], default: 'running' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    error: { type: String },
    duration: { type: Number },
}, { timestamps: true });
exports.FlowExecution = mongoose_1.default.models.FlowExecution || mongoose_1.default.model('FlowExecution', FlowExecutionSchema);
// =============================================================================
// WEBHOOK LOG
// =============================================================================
const WebhookLogSchema = new mongoose_1.default.Schema({
    workspaceId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramAccountId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'InstagramAccount', index: true },
    event: { type: String, required: true },
    payload: { type: mongoose_1.default.Schema.Types.Mixed, default: {} },
    processed: { type: Boolean, default: false },
    processingTime: { type: Number },
    error: { type: String },
}, { timestamps: true });
// TTL: auto-delete webhook logs older than 30 days
WebhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
exports.WebhookLog = mongoose_1.default.models.WebhookLog || mongoose_1.default.model('WebhookLog', WebhookLogSchema);
// =============================================================================
// ANALYTICS EVENTS
// =============================================================================
const AnalyticsEventSchema = new mongoose_1.default.Schema({
    workspaceId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramAccountId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'InstagramAccount', index: true },
    event: { type: String, required: true, index: true },
    automationId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Automation' },
    contactId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Contact' },
    conversationId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Conversation' },
    metadata: { type: mongoose_1.default.Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now },
}, { timestamps: true });
// TTL: auto-delete analytics older than 365 days
AnalyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });
exports.AnalyticsEvent = mongoose_1.default.models.AnalyticsEvent || mongoose_1.default.model('AnalyticsEvent', AnalyticsEventSchema);
//# sourceMappingURL=index.js.map