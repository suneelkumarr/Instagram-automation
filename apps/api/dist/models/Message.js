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
exports.Message = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const messageSchema = new mongoose_1.Schema({
    workspaceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramAccountId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'InstagramAccount', required: true, index: true },
    conversationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Conversation', index: true },
    contactId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
    automationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Automation', index: true },
    igMessageId: { type: String },
    igSenderId: { type: String, required: true },
    igRecipientId: { type: String, required: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'story_link', 'link', 'location', 'file', 'reaction', 'unsupported'],
        default: 'text',
    },
    content: { type: String, default: '' },
    mediaUrl: { type: String },
    mediaType: { type: String },
    quickReply: { type: String },
    status: { type: String, enum: ['sent', 'delivered', 'read', 'failed'], default: 'sent' },
    sentVia: { type: String, enum: ['api', 'webhook', 'manual', 'ai'], default: 'api' },
    aiTriggered: { type: Boolean, default: false },
    aiConfidence: { type: Number },
    processingTime: { type: Number },
}, { timestamps: true });
messageSchema.index({ workspaceId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ igMessageId: 1 }, { unique: true }); // Deduplication
messageSchema.index({ automationId: 1, createdAt: -1 });
// TTL index: auto-delete messages older than 90 days for free tier
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60, partialFilterExpression: { 'sentVia': 'api' } });
exports.Message = mongoose_1.default.models.Message || mongoose_1.default.model('Message', messageSchema);
//# sourceMappingURL=Message.js.map