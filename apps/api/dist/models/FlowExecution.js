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
exports.FlowExecution = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const flowExecutionSchema = new mongoose_1.Schema({
    workspaceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    automationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Automation', required: true, index: true },
    contactId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
    conversationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Conversation', index: true },
    triggerType: { type: String, required: true },
    triggerPayload: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    currentNodeId: { type: String, required: true },
    executionPath: [{ type: String }],
    context: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['running', 'completed', 'failed', 'paused'], default: 'running' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    error: { type: String },
    duration: { type: Number },
}, { timestamps: true });
flowExecutionSchema.index({ automationId: 1, status: 1, startedAt: -1 });
flowExecutionSchema.index({ workspaceId: 1, startedAt: -1 });
flowExecutionSchema.methods.complete = async function () {
    this.status = 'completed';
    this.completedAt = new Date();
    this.duration = this.completedAt.getTime() - this.startedAt.getTime();
    await this.save();
};
flowExecutionSchema.methods.fail = async function (error) {
    this.status = 'failed';
    this.completedAt = new Date();
    this.duration = this.completedAt.getTime() - this.startedAt.getTime();
    this.error = error;
    await this.save();
};
exports.FlowExecution = mongoose_1.default.models.FlowExecution || mongoose_1.default.model('FlowExecution', flowExecutionSchema);
//# sourceMappingURL=FlowExecution.js.map