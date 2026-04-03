// Shared types for RsuShop platform

export const PLAN_LIMITS = {
  free: {
    instagramAccounts: 1,
    contacts: 100,
    automations: 3,
    monthlyMessages: 500,
    aiCredits: 50,
    teamMembers: 1,
  },
  starter: {
    instagramAccounts: 3,
    contacts: 5000,
    automations: 20,
    monthlyMessages: 10000,
    aiCredits: 500,
    teamMembers: 3,
  },
  pro: {
    instagramAccounts: 10,
    contacts: 50000,
    automations: 100,
    monthlyMessages: 100000,
    aiCredits: 5000,
    teamMembers: 10,
  },
  agency: {
    instagramAccounts: Infinity,
    contacts: 500000,
    automations: Infinity,
    monthlyMessages: 1000000,
    aiCredits: 50000,
    teamMembers: 50,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export const PLANS: { id: Plan; name: string; price: number; stripePriceId: string }[] = [
  { id: 'free', name: 'Free', price: 0, stripePriceId: '' },
  { id: 'starter', name: 'Starter', price: 29, stripePriceId: 'price_starter' },
  { id: 'pro', name: 'Pro', price: 79, stripePriceId: 'price_pro' },
  { id: 'agency', name: 'Agency', price: 199, stripePriceId: 'price_agency' },
];

export type TriggerType =
  | 'comment'
  | 'keyword'
  | 'new_follower'
  | 'story_mention'
  | 'story_reply'
  | 'post_like'
  | 'direct_message'
  | 'scheduled';

export type NodeType =
  | 'trigger'
  | 'message'
  | 'ai_agent'
  | 'condition'
  | 'delay'
  | 'http_request'
  | 'update_contact'
  | 'add_to_list'
  | 'remove_from_list'
  | 'webhook'
  | 'randomizer'
  | 'end';

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
  position: { x: number; y: number };
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
  viewport?: { x: number; y: number; zoom: number };
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
