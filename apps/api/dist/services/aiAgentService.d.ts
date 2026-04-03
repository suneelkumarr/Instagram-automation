interface AIRequest {
    workspaceId: string;
    contact: Partial<Contact>;
    conversation: Partial<Conversation>;
    message: string;
    brandName: string;
    niche: string;
    customPrompt?: string;
    conversationHistory?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
}
interface AIResponse {
    text: string;
    capturedFields: Record<string, string>;
    intent?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
    escalate?: boolean;
    confidence?: number;
}
export declare class AIService {
    private client;
    private fallbackClient;
    constructor();
    /**
     * Generate AI response for a DM conversation
     */
    generateResponse(request: AIRequest): Promise<AIResponse>;
    /**
     * Build conversation context from contact data
     */
    private buildContext;
    /**
     * Extract fields from user message
     */
    private extractFields;
    /**
     * Simple sentiment analysis using keyword matching
     */
    private analyzeSentiment;
    /**
     * Detect user intent from response
     */
    private detectIntent;
    /**
     * Determine if conversation should escalate to human
     */
    private shouldEscalate;
    /**
     * Test a prompt with sample input
     */
    testPrompt(prompt: string, testMessage: string): Promise<string>;
    /**
     * Get available niche templates
     */
    getNicheTemplates(): Record<string, string>;
}
export declare const aiService: AIService;
export {};
//# sourceMappingURL=aiAgentService.d.ts.map