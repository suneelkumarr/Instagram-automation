import mongoose, { Schema, Document } from 'mongoose';

export interface IFlowExecution extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  automationId: mongoose.Types.ObjectId;
  contactId: mongoose.Types.ObjectId;
  conversationId?: mongoose.Types.ObjectId;
  triggerType: string;
  triggerPayload: Record<string, unknown>;
  currentNodeId: string;
  executionPath: string[];
  context: Record<string, unknown>;
  status: 'running' | 'completed' | 'failed' | 'paused';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  duration?: number;
}

const flowExecutionSchema = new Schema<IFlowExecution>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    automationId: { type: Schema.Types.ObjectId, ref: 'Automation', required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', index: true },
    triggerType: { type: String, required: true },
    triggerPayload: { type: Schema.Types.Mixed, default: {} },
    currentNodeId: { type: String, required: true },
    executionPath: [{ type: String }],
    context: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['running', 'completed', 'failed', 'paused'], default: 'running' },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    error: { type: String },
    duration: { type: Number },
  },
  { timestamps: true }
);

flowExecutionSchema.index({ automationId: 1, status: 1, startedAt: -1 });
flowExecutionSchema.index({ workspaceId: 1, startedAt: -1 });

flowExecutionSchema.methods.complete = async function () {
  this.status = 'completed';
  this.completedAt = new Date();
  this.duration = this.completedAt.getTime() - this.startedAt.getTime();
  await this.save();
};

flowExecutionSchema.methods.fail = async function (error: string) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.duration = this.completedAt.getTime() - this.startedAt.getTime();
  this.error = error;
  await this.save();
};

export const FlowExecution = mongoose.models.FlowExecution || mongoose.model<IFlowExecution>('FlowExecution', flowExecutionSchema);
