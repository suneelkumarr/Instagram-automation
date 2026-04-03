import mongoose, { Document } from 'mongoose';
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
export declare const Automation: mongoose.Model<any, {}, {}, {}, any, any>;
//# sourceMappingURL=Automation.d.ts.map