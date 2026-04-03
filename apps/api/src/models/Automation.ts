import mongoose, { Schema, Document } from 'mongoose';
import { AutomationStatus, TriggerType, FlowData } from '@rsushop/shared';

export interface IAutomation extends Document {
  _id: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  instagramAccountId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  status: AutomationStatus;
  trigger: {
    type: TriggerType;
    config: Record<string, unknown>;
  };
  flowData: FlowData;
  stats: {
    triggered: number;
    completed: number;
    failed: number;
    lastTriggeredAt?: Date;
  };
  version: number;
  publishedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
}

const automationSchema = new Schema<IAutomation>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    instagramAccountId: { type: Schema.Types.ObjectId, ref: 'InstagramAccount', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'active', 'paused', 'archived'], default: 'draft' },
    trigger: {
      type: { type: String, required: true },
      config: { type: Schema.Types.Mixed, default: {} },
    },
    flowData: {
      nodes: { type: Schema.Types.Mixed, default: [] },
      edges: { type: Schema.Types.Mixed, default: [] },
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
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

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

export const Automation = mongoose.models.Automation || mongoose.model<IAutomation>('Automation', automationSchema);
