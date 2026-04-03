import { Worker, Job } from 'bullmq';
import OpenAI from 'openai';
import { getConnection, QUEUE_NAMES } from '../queues/queues.js';
import config from '../queues/connection.js';
import { Contact, Conversation, Message, Workspace } from '../models/index.js';

interface AIJobData {
  workspaceId: string;
  instagramAccountId: string;
  contactId: string;
  conversationId: string;
  message: string;
  brandName: string;
  niche: string;
  customPrompt?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  automationId?: string;
}

const openai = new OpenAI({ apiKey: config.openai.apiKey });

const CAPTURE_PATTERNS: Record<string, RegExp> = {
  email: /[\w.+-]+@[\w.-]+\.\w{2,}/gi,
  phone: /(\+?\d{1,4}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  name: /(?:my name is|i'm|i am|call me|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
};

const generateResponse = async (data: AIJobData): Promise<{
  text: string;
  capturedFields: Record<string, string>;
  escalate: boolean;
}> => {
  const { message, brandName, niche, customPrompt, conversationHistory = [] } = data;

  const systemPrompt = customPrompt || `You are a helpful assistant for ${brandName}.
Be friendly, helpful, and professional. Ask questions to understand needs.
Capture relevant information like name and email naturally.
Suggest products or next steps when appropriate.
Never be pushy, spammy, or make claims you can't verify.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of conversationHistory.slice(-10)) {
    messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
  }

  messages.push({ role: 'user', content: message });

  const completion = await openai.chat.completions.create({
    model: config.openai.model,
    messages,
    temperature: 0.7,
    max_tokens: 500,
  });

  const responseText = completion.choices[0]?.message?.content?.trim() || '';

  // Extract fields
  const capturedFields: Record<string, string> = {};
  const emailMatch = message.match(CAPTURE_PATTERNS.email);
  if (emailMatch) capturedFields.email = emailMatch[0].toLowerCase();

  const nameMatch = message.match(CAPTURE_PATTERNS.name);
  if (nameMatch) capturedFields.name = nameMatch[1];

  // Detect escalation
  const lowerResponse = responseText.toLowerCase();
  const escalateKeywords = ['speak to', 'talk to', 'human', 'real person', 'manager', 'cancel', 'refund'];
  const escalate = escalateKeywords.some(kw => lowerResponse.includes(kw));

  return { text: responseText, capturedFields, escalate };
};

export const createAIWorker = () => {
  const worker = new Worker<AIJobData>(
    QUEUE_NAMES.AI_AGENT,
    async (job: Job<AIJobData>) => {
      const startTime = Date.now();

      // Check AI credits
      const workspace = await Workspace.findById(job.data.workspaceId);
      if (workspace) {
        if (!workspace.checkUsageLimit('aiCredits')) {
          throw new Error('AI credits exhausted');
        }
      }

      const { text, capturedFields, escalate } = await generateResponse(job.data);

      // Update contact with captured fields
      if (Object.keys(capturedFields).length > 0) {
        const updateFields: Record<string, unknown> = {};
        if (capturedFields.email) updateFields['customFields.email'] = capturedFields.email;
        if (capturedFields.name) updateFields.displayName = capturedFields.name;

        await Contact.findByIdAndUpdate(job.data.contactId, updateFields);
      }

      // If escalation needed, mark conversation
      if (escalate && job.data.conversationId) {
        await Conversation.findByIdAndUpdate(job.data.conversationId, {
          status: 'pending',
          priority: 'high',
        });
      }

      // Update AI usage
      if (workspace) {
        await workspace.incrementUsage('aiCredits');
      }

      // Get contact to get recipientId (Instagram user ID)
      const contact = await Contact.findById(job.data.contactId);
      const recipientId = contact?.igUserId || contact?.username || '';

      // Get IG account to send response
      const { addDMJob } = await import('../queues/dmQueue.js');
      await addDMJob({
        workspaceId: job.data.workspaceId,
        instagramAccountId: job.data.instagramAccountId,
        contactId: job.data.contactId,
        conversationId: job.data.conversationId,
        recipientId,
        message: { text },
        automationId: job.data.automationId,
      }, 1);

      return {
        response: text,
        capturedFields,
        escalate,
        processingTime: Date.now() - startTime,
      };
    },
    {
      connection: getConnection(),
      concurrency: 20,
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`AI job ${job.id} completed in ${result.processingTime}ms`);
  });

  worker.on('failed', (job, err) => {
    console.error(`AI job ${job?.id} failed:`, err.message);
  });

  return worker;
};
