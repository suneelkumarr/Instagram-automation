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
exports.Automation = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const automationSchema = new mongoose_1.Schema({
    workspaceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramAccountId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'InstagramAccount', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'active', 'paused', 'archived'], default: 'draft' },
    trigger: {
        type: { type: String, required: true },
        config: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    },
    flowData: {
        nodes: { type: mongoose_1.Schema.Types.Mixed, default: [] },
        edges: { type: mongoose_1.Schema.Types.Mixed, default: [] },
        viewport: {
            x: { type: Number, default: 0 },
            y: { type: Number, default: 0 },
            zoom: { type: Number, default: 1 },
        },
    },
    stats: {
        triggered: { type: Number, default: 0 },
        completed: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        lastTriggeredAt: { type: Date },
    },
    version: { type: Number, default: 1 },
    publishedAt: { type: Date },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
// Indexes for common queries
automationSchema.index({ workspaceId: 1, instagramAccountId: 1 });
automationSchema.index({ workspaceId: 1, status: 1 });
automationSchema.index({ workspaceId: 1, 'trigger.type': 1 });
automationSchema.methods.activate = async function () {
    this.status = 'active';
    this.publishedAt = new Date();
    this.stats.lastTriggeredAt = new Date();
    await this.save();
};
automationSchema.methods.pause = async function () {
    this.status = 'paused';
    await this.save();
};
automationSchema.methods.incrementTriggered = async function () {
    this.stats.triggered += 1;
    this.stats.lastTriggeredAt = new Date();
    await this.save();
};
automationSchema.methods.incrementCompleted = async function () {
    this.stats.completed += 1;
    await this.save();
};
automationSchema.methods.incrementFailed = async function () {
    this.stats.failed += 1;
    await this.save();
};
exports.Automation = mongoose_1.default.models.Automation || mongoose_1.default.model('Automation', automationSchema);
//# sourceMappingURL=Automation.js.map