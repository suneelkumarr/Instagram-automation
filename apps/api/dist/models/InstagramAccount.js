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
exports.InstagramAccount = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const crypto_js_1 = require("../utils/crypto.js");
const instagramAccountSchema = new mongoose_1.Schema({
    workspaceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramId: { type: String, unique: true, index: true },
    username: { type: String, required: true },
    displayName: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    followersCount: { type: Number, default: 0 },
    bio: { type: String, default: '' },
    website: { type: String, default: '' },
    accessToken: { type: String, required: true },
    accessTokenExpiresAt: { type: Date },
    permissions: [{ type: String }],
    pageId: { type: String },
    appId: { type: String },
    status: { type: String, enum: ['active', 'expired', 'pending', 'disconnected'], default: 'pending' },
    lastSyncedAt: { type: Date },
    webhookVerifyToken: { type: String, default: () => require('uuid').v4() },
}, { timestamps: true });
// Encrypt access token before saving
instagramAccountSchema.pre('save', function (next) {
    if (this.isModified('accessToken')) {
        this.accessToken = (0, crypto_js_1.encryptToken)(this.accessToken);
    }
    next();
});
// Decrypt on retrieval
instagramAccountSchema.methods.getDecryptedToken = function () {
    return (0, crypto_js_1.decryptToken)(this.accessToken);
};
instagramAccountSchema.methods.isTokenExpired = function () {
    if (!this.accessTokenExpiresAt)
        return false;
    return this.accessTokenExpiresAt < new Date();
};
exports.InstagramAccount = mongoose_1.default.models.InstagramAccount || mongoose_1.default.model('InstagramAccount', instagramAccountSchema);
//# sourceMappingURL=InstagramAccount.js.map