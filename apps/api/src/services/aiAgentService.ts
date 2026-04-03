import OpenAI from 'openai';
import { config } from '../config/index.js';
import { Contact, Conversation } from '../models/index.js';

// Niche-specific prompt templates
const NICHE_PROMPTS: Record<string, string> = {
  fitness: `You are a friendly, knowledgeable fitness coach assistant for {{BRAND_NAME}}.
You help potential clients get started on their fitness journey.

PERSONALITY:
- Energetic but professional
- Ask one question at a time
- Be conversational, not robotic
- Celebrate small wins
- Never give specific medical advice (always say "consult a doctor")

CONVERSATION FLOW:
1. Greet warmly, reference what triggered the DM
2. Ask about their fitness goals (weight loss, muscle, endurance)
3. Ask about their experience level (beginner, intermediate, advanced)
4. Ask about any limitations or injuries
5. Mention relevant programs/products naturally
6. Capture: name, email, goal

NEVER DO:
- Promise specific results ("lose 10lbs in 2 weeks")
- Diagnose medical conditions
- Send multiple messages in rapid succession
- Be pushy or salesy
- Respond to topics outside fitness

CAPTURE FIELDS: name, email, phone (optional), fitness_goal
SUGGESTED PRODUCTS: 1-on-1 coaching, workout programs, meal plans, supplements`,

  coaching: `You are a professional coaching assistant for {{BRAND_NAME}}.
You help potential clients understand the value of coaching.

PERSONALITY:
- Empathetic and understanding
- Focus on transformation, not features
- Ask deep discovery questions
- Build trust through listening
- Professional but warm

CONVERSATION FLOW:
1. Warm greeting acknowledging their interest
2. Ask what brought them here / what challenge they're facing
3. Ask what they've tried before
4. Ask about their timeline and commitment level
5. Share a brief transformation story (generic)
6. Suggest booking a strategy call
7. Capture: name, email, best time to call, biggest challenge

NEVER DO:
- Dismiss their concerns
- Rush to the sales pitch
- Make promises about outcomes
- Discuss pricing without qualification
- Pressure them into immediate commitment

CAPTURE FIELDS: name, email, biggest_challenge, timeline, budget_range
SUGGESTED ACTIONS: Schedule call, download free guide, join waitlist`,

  ecommerce: `You are a helpful shopping assistant for {{BRAND_NAME}}.
You help customers find the right products and answer questions.

PERSONALITY:
- Friendly and helpful
- Product knowledgeable
- Suggest complementary items
- Handle objections gracefully
- Promote offers naturally

CONVERSATION FLOW:
1. Greet and ask how you can help
2. If product question → provide details + suggest alternatives
3. If sizing question → provide size guide
4. If price question → highlight value + mention bundles
5. If checkout help → guide through process
6. Capture: email (for order updates), preferences

OBJECTION HANDLING:
- "Too expensive" → Highlight value, mention EMI/offers
- "Need to think" → Offer to hold item, send reminder
- "Where's my order" → Provide tracking info
- "Wrong size" → Initiate exchange process

CAPTURE FIELDS: email, product_interest, size_preference
SUGGESTED ACTIONS: Add to cart, upsell, cross-sell, offer discount`,

  default: `You are a friendly assistant for {{BRAND_NAME}}.
You're helpful, conversational, and professional.

Guidelines:
- Be warm and approachable
- Ask clarifying questions when needed
- Capture relevant information (name, email, phone)
- Suggest next steps naturally
- Never be pushy or spammy

Never discuss: competitors, controversial topics, or make claims you can't verify.`,
};

// Lead capture patterns
const CAPTURE_PATTERNS: Record<string, RegExp> = {
  email: /[\w.+-]+@[\w.-]+\.\w{2,}/gi,
  phone: /(\+?\d{1,4}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  name: /(?:my name is|i'm|i am|call me|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
};

interface AIRequest {
  workspaceId: string;
  contact: Partial<Contact>;
  conversation: Partial<Conversation>;
  message: string;
  brandName: string;
  niche: string;
  customPrompt?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface AIResponse {
  text: string;
  capturedFields: Record<string, string>;
  intent?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  escalate?: boolean;
  confidence?: number;
}

export class AIService {
  private client: OpenAI;
  private fallbackClient: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL,
    });
    this.fallbackClient = new OpenAI({
      apiKey: config.openai.fallbackApiKey,
      baseURL: config.openai.baseURL,
    });
  }

  /**
   * Generate AI response for a DM conversation
   */
  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const {
      contact,
      message,
      brandName,
      niche,
      customPrompt,
      conversationHistory = [],
    } = request;

    // Build context
    const context = this.buildContext(contact, brandName, niche);

    // Get or build system prompt
    const systemPrompt = customPrompt
      || NICHE_PROMPTS[niche] || NICHE_PROMPTS.default;

    // Compose messages for OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'system', content: context },
    ];

    // Add conversation history (last 5 messages)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }

    messages.push({ role: 'user', content: message });

    const models = [config.openai.model, config.openai.fallbackModel].filter(Boolean) as string[];

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const client = i === 0 ? this.client : this.fallbackClient;
      try {
        const completion = await client.chat.completions.create({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 500,
          top_p: 0.9,
        });

        const responseText = completion.choices[0]?.message?.content?.trim() || '';

        // Parse response
        const capturedFields = this.extractFields(message, responseText);
        const sentiment = this.analyzeSentiment(responseText);
        const intent = this.detectIntent(responseText);
        const escalate = this.shouldEscalate(responseText, sentiment, intent);

        return {
          text: responseText,
          capturedFields,
          sentiment,
          intent,
          escalate,
          confidence: completion.choices[0]?.finish_reason === 'stop' ? 0.9 : 0.7,
        };
      } catch (error: unknown) {
        console.error(`OpenAI error (${model}):`, (error as Error).message);
        if (model === models[models.length - 1]) {
          throw new Error(`AI generation failed: ${(error as Error).message}`);
        }
      }
    }
  }

  /**
   * Build conversation context from contact data
   */
  private buildContext(contact: Partial<Contact>, brandName: string, niche: string): string {
    let context = `BRAND_NAME: ${brandName}\n`;
    context += `NICHE: ${niche}\n`;

    if (contact.username) {
      context += `CONTACT_USERNAME: @${contact.username}\n`;
    }
    if (contact.displayName) {
      context += `CONTACT_NAME: ${contact.displayName}\n`;
    }
    if (contact.tags && contact.tags.length > 0) {
      context += `CONTACT_TAGS: ${contact.tags.join(', ')}\n`;
    }
    if (contact.leadScore !== undefined) {
      context += `LEAD_SCORE: ${contact.leadScore}/100\n`;
    }
    if (contact.conversationStage) {
      context += `STAGE: ${contact.conversationStage}\n`;
    }

    context += '\nRemember: Be helpful, capture lead info naturally, suggest products when appropriate.';

    return context;
  }

  /**
   * Extract fields from user message
   */
  private extractFields(message: string, response: string): Record<string, string> {
    const fields: Record<string, string> = {};

    // Extract email
    const emailMatch = message.match(CAPTURE_PATTERNS.email);
    if (emailMatch) {
      fields.email = emailMatch[0].toLowerCase();
    }

    // Extract name
    const nameMatch = message.match(CAPTURE_PATTERNS.name);
    if (nameMatch) {
      fields.name = nameMatch[1];
    }

    // Extract phone
    const phoneMatch = message.match(CAPTURE_PATTERNS.phone);
    if (phoneMatch && phoneMatch[0].length >= 10) {
      fields.phone = phoneMatch[0].replace(/[^\d+]/g, '');
    }

    return fields;
  }

  /**
   * Simple sentiment analysis using keyword matching
   */
  private analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const lower = text.toLowerCase();
    const positive = ['great', 'amazing', 'love', 'awesome', 'perfect', 'thank', 'excited', 'happy', 'wonderful', 'fantastic', 'congratulations', 'well done'];
    const negative = ['terrible', 'awful', 'hate', 'disappointed', 'frustrated', 'angry', 'worst', 'bad', 'annoying', 'unfortunately'];

    let score = 0;
    for (const word of positive) {
      if (lower.includes(word)) score += 1;
    }
    for (const word of negative) {
      if (lower.includes(word)) score -= 1;
    }

    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  /**
   * Detect user intent from response
   */
  private detectIntent(text: string): string {
    const lower = text.toLowerCase();

    if (lower.includes('buy') || lower.includes('purchase') || lower.includes('checkout')) return 'purchase_intent';
    if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) return 'pricing_question';
    if (lower.includes('size') || lower.includes('fit') || lower.includes('measure')) return 'sizing_question';
    if (lower.includes('when') || lower.includes('delivery') || lower.includes('shipping')) return 'shipping_question';
    if (lower.includes('refund') || lower.includes('return') || lower.includes('exchange')) return 'support_request';
    if (lower.includes('demo') || lower.includes('try') || lower.includes('free')) return 'trial_interest';
    if (lower.includes('call') || lower.includes('schedule') || lower.includes('book')) return 'appointment_interest';

    return 'general_inquiry';
  }

  /**
   * Determine if conversation should escalate to human
   */
  private shouldEscalate(
    text: string,
    sentiment: string,
    intent: string
  ): boolean {
    // Negative sentiment = always escalate
    if (sentiment === 'negative') return true;

    // Refund/support issues = escalate
    if (intent === 'support_request') return true;

    // Explicit escalation keywords
    const escalateKeywords = ['speak to', 'talk to', 'human', 'real person', 'manager', 'supervisor', 'cancel my', 'refund', 'lawsuit'];
    const lower = text.toLowerCase();
    return escalateKeywords.some(keyword => lower.includes(keyword));
  }

  /**
   * Test a prompt with sample input
   */
  async testPrompt(prompt: string, testMessage: string): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: prompt },
      { role: 'user', content: testMessage },
    ];

    const models = [config.openai.model, config.openai.fallbackModel].filter(Boolean) as string[];

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const client = i === 0 ? this.client : this.fallbackClient;
      try {
        const completion = await client.chat.completions.create({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 300,
        });
        return completion.choices[0]?.message?.content?.trim() || '';
      } catch (error) {
        console.error(`testPrompt error (${model}):`, (error as Error).message);
      }
    }
    return '';
  }

  /**
   * Get available niche templates
   */
  getNicheTemplates(): Record<string, string> {
    return { ...NICHE_PROMPTS };
  }
}

export const aiService = new AIService();
