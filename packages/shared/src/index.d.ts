export declare const PLAN_LIMITS: {
    readonly free: {
        readonly instagramAccounts: 1;
        readonly contacts: 100;
        readonly automations: 3;
        readonly monthlyMessages: 500;
        readonly aiCredits: 50;
        readonly teamMembers: 1;
    };
    readonly starter: {
        readonly instagramAccounts: 3;
        readonly contacts: 5000;
        readonly automations: 20;
        readonly monthlyMessages: 10000;
        readonly aiCredits: 500;
        readonly teamMembers: 3;
    };
    readonly pro: {
        readonly instagramAccounts: 10;
        readonly contacts: 50000;
        readonly automations: 100;
        readonly monthlyMessages: 100000;
        readonly aiCredits: 5000;
        readonly teamMembers: 10;
    };
    readonly agency: {
        readonly instagramAccounts: number;
        readonly contacts: 500000;
        readonly automations: number;
        readonly monthlyMessages: 1000000;
        readonly aiCredits: 50000;
        readonly teamMembers: 50;
    };
};
export type Plan = keyof typeof PLAN_LIMITS;
export declare const PLANS: {
    id: Plan;
    name: string;
    price: number;
    stripePriceId: string;
}[];
export type TriggerType = 'comment' | 'keyword' | 'new_follower' | 'story_mention' | 'story_reply' | 'post_like' | 'direct_message' | 'scheduled';
export type NodeType = 'trigger' | 'message' | 'ai_agent' | 'condition' | 'delay' | 'http_request' | 'update_contact' | 'add_to_list' | 'remove_from_list' | 'webhook' | 'randomizer' | 'end';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'story_link' | 'link' | 'location' | 'file' | 'reaction' | 'unsupported';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';
export type AutomationStatus = 'draft' | 'active' | 'paused' | 'archived';
export type ConversationStatus = 'open' | 'closed' | 'pending' | 'bot' | 'human';
export type ConversationPriority = 'low' | 'normal' | 'high';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';
export type IGAccountStatus = 'active' | 'expired' | 'pending' | 'disconnected';
export interface FlowNode {
    id: string;
    type: NodeType;
    position: {
        x: number;
        y: number;
    };
    data: Record<string, unknown>;
    config?: Record<string, unknown>;
}
export interface FlowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    label?: string;
}
export interface FlowData {
    nodes: FlowNode[];
    edges: FlowEdge[];
    viewport?: {
        x: number;
        y: number;
        zoom: number;
    };
}
export interface AIResponse {
    text: string;
    capturedFields?: Record<string, string>;
    intent?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    escalate?: boolean;
    confidence?: number;
}
export interface QueueJobData {
    jobId: string;
    workspaceId: string;
    instagramAccountId: string;
    contactId?: string;
    automationId?: string;
    type: string;
    payload: Record<string, unknown>;
    priority?: number;
    scheduledAt?: number;
}
export interface AnalyticsEvent {
    workspaceId: string;
    instagramAccountId: string;
    event: string;
    automationId?: string;
    contactId?: string;
    metadata?: Record<string, unknown>;
    timestamp: Date;
}
export interface APIResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
//# sourceMappingURL=index.d.ts.map