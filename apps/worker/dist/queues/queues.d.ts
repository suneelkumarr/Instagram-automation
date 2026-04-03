import { Queue } from 'bullmq';
import IORedis from 'ioredis';
export declare const QUEUE_NAMES: {
    readonly DM_SENDER: "dm-sender";
    readonly AI_AGENT: "ai-agent";
    readonly WEBHOOK_PROCESS: "webhook-process";
    readonly FLOW_EXECUTION: "flow-execution";
    readonly BROADCAST: "broadcast";
    readonly ANALYTICS: "analytics";
};
export declare const getConnection: () => IORedis;
export declare const createQueue: (name: string) => Queue<any, any, string, any, any, string>;
export declare const dmSenderQueue: Queue<any, any, string, any, any, string>;
export declare const aiAgentQueue: Queue<any, any, string, any, any, string>;
export declare const webhookProcessQueue: Queue<any, any, string, any, any, string>;
export declare const flowExecutionQueue: Queue<any, any, string, any, any, string>;
export declare const broadcastQueue: Queue<any, any, string, any, any, string>;
export declare const analyticsQueue: Queue<any, any, string, any, any, string>;
