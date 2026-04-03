// Shared types for the frontend

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

export interface Contact {
  id: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  leadScore: number;
  tags: string[];
  lists: string[];
  customFields: Record<string, string>;
  conversationStage: 'aware' | 'interested' | 'decision' | 'action' | 'customer';
  lastInteractionAt?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  contact: Contact;
  status: 'open' | 'closed' | 'pending' | 'bot' | 'human';
  priority: 'low' | 'normal' | 'high';
  messageCount: number;
  lastMessageAt?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  messages?: Message[];
}

export interface Message {
  id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  sentVia: 'api' | 'webhook' | 'manual' | 'ai';
}

export interface Automation {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  trigger: {
    type: string;
    config: Record<string, unknown>;
  };
  flowData: {
    nodes: FlowNode[];
    edges: FlowEdge[];
  };
  stats: {
    triggered: number;
    completed: number;
    failed: number;
    lastTriggeredAt?: string;
  };
  instagramAccount?: {
    username: string;
    profilePicture?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface InstagramAccount {
  id: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  followersCount?: number;
  status: 'active' | 'expired' | 'pending' | 'disconnected';
}

export interface AnalyticsOverview {
  overview: {
    totalContacts: number;
    newContacts: number;
    totalMessages: number;
    messagesThisWeek: number;
    activeAutomations: number;
  };
  conversations: Record<string, number>;
  events: Record<string, number>;
  growthData: Array<{ _id: string; count: number }>;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  usage: {
    instagramAccounts: number;
    contacts: number;
    automations: number;
    monthlyMessages: number;
    aiCredits: number;
    resetAt: string;
  };
  limits: {
    instagramAccounts: number;
    contacts: number;
    automations: number;
    monthlyMessages: number;
    aiCredits: number;
  };
}
