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
exports.Contact = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const contactSchema = new mongoose_1.Schema({
    workspaceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramAccountId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'InstagramAccount', required: true, index: true },
    igUserId: { type: String, required: true },
    username: { type: String, required: true },
    displayName: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    biography: { type: String, default: '' },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    mediaCount: { type: Number, default: 0 },
    website: { type: String, default: '' },
    isBusiness: { type: Boolean, default: false },
    source: { type: String, enum: ['follower', 'dm', 'comment', 'imported'], default: 'dm' },
    tags: [{ type: String }],
    lists: [{ type: String }],
    customFields: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    leadScore: { type: Number, default: 0 },
    lastInteractionAt: { type: Date },
    firstSeenAt: { type: Date },
    conversationStage: {
        type: String,
        enum: ['aware', 'interested', 'decision', 'action', 'customer'],
        default: 'aware',
    },
    followStatus: {
        type: String,
        enum: ['following', 'not_following', 'requested', 'unknown'],
        default: 'unknown',
    },
}, { timestamps: true });
// Compound unique index to prevent duplicate contacts
contactSchema.index({ instagramAccountId: 1, igUserId: 1 }, { unique: true });
// Text index for search
contactSchema.index({ username: 'text', displayName: 'text' });
contactSchema.methods.updateLeadScore = async function (delta) {
    this.leadScore = Math.max(0, Math.min(100, this.leadScore + delta));
    await this.save();
};
contactSchema.methods.addTag = async function (tag) {
    if (!this.tags.includes(tag)) {
        this.tags.push(tag);
        await this.save();
    }
};
contactSchema.methods.removeTag = async function (tag) {
    this.tags = this.tags.filter((t) => t !== tag);
    await this.save();
};
contactSchema.methods.addToList = async function (listName) {
    if (!this.lists.includes(listName)) {
        this.lists.push(listName);
        await this.save();
    }
};
contactSchema.methods.removeFromList = async function (listName) {
    this.lists = this.lists.filter((l) => l !== listName);
    await this.save();
};
exports.Contact = mongoose_1.default.models.Contact || mongoose_1.default.model('Contact', contactSchema);
//# sourceMappingURL=Contact.js.map