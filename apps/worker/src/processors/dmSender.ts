import mongoose from 'mongoose';
import { Worker, Job } from 'bullmq';
import { getConnection, QUEUE_NAMES } from '../queues/queues.js';
import config from '../queues/connection.js';
import { InstagramAccount, Message, Conversation, Contact, Workspace } from '../models/index.js';

// Rate limiting
const accountRateLimits = new Map<string, { tokens: number; lastRefill: number }>();
const RATE_LIMIT_TOKENS = 250;
const RATE_LIMIT_REFILL_MS = 60000;

const checkRateLimit = (accountId: string): boolean => {
  const now = Date.now();
  let accountLimit = accountRateLimits.get(accountId);

  if (!accountLimit || now - accountLimit.lastRefill >= RATE_LIMIT_REFILL_MS) {
    accountRateLimits.set(accountId, { tokens: RATE_LIMIT_TOKENS - 1, lastRefill: now });
    return true;
  }

  if (accountLimit.tokens <= 0) return false;
  accountLimit.tokens -= 1;
  return true;
};

interface DMJobData {
  workspaceId: string;
  instagramAccountId: string;
  contactId: string;
  conversationId?: string;
  recipientId: string;
  message: {
    text?: string;
    mediaUrl?: string;
    quickReplies?: Array<{ title: string; payload: string }>;
  };
  automationId?: string;
}

const sendInstagramDM = async (
  accessToken: string,
  igUserId: string,
  recipientId: string,
  message: DMJobData['message']
): Promise<{ messageId: string }> => {
  const url = `${config.instagram.graphApiBase}/${config.instagram.apiVersion}/${igUserId}/messages`;

  const payload: Record<string, unknown> = {
    recipient: { id: recipientId },
    message: {},
  };

  const msgObj = payload.message as Record<string, unknown>;

  if (message.text) {
    msgObj.text = message.text;
  }

  if (message.mediaUrl) {
    msgObj.attachment = {
      type: 'image',
      payload: { url: message.mediaUrl, is_reusable: true },
    };
  }

  if (message.quickReplies && message.quickReplies.length > 0) {
    msgObj.quick_replies = message.quickReplies.slice(0, 13).map((qr) => ({
      content_type: 'text',
      title: qr.title.substring(0, 20),
      payload: qr.payload,
    }));
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to send message');
  }

  return { messageId: data.message_id };
};

export const createDMSenderWorker = () => {
  const worker = new Worker<DMJobData>(
    QUEUE_NAMES.DM_SENDER,
    async (job: Job<DMJobData>) => {
      const startTime = Date.now();
      const { instagramAccountId, contactId, conversationId, recipientId, message, automationId } = job.data;

      // Validate recipientId
      if (!recipientId) {
        throw new Error('recipientId is required to send DM');
      }

      // Check rate limit
      if (!checkRateLimit(instagramAccountId)) {
        // Requeue with delay
        await job.moveToDelayed(Date.now() + 60000);
        return { skipped: true, reason: 'Rate limited' };
      }

      // Get Instagram account
      const account = await InstagramAccount.findById(instagramAccountId);
      if (!account || account.status !== 'active') {
        throw new Error('Instagram account not found or inactive');
      }

      const accessToken = account.getDecryptedToken();

      // Send message
      const result = await sendInstagramDM(
        accessToken,
        account.instagramId,
        recipientId,
        message
      );

      // Record message in DB
      const newMessage = new Message({
        workspaceId: job.data.workspaceId,
        instagramAccountId,
        conversationId,
        contactId,
        igMessageId: result.messageId,
        igSenderId: account.instagramId,
        igRecipientId: recipientId,
        direction: 'outbound',
        type: message.mediaUrl ? 'image' : 'text',
        content: message.text || '',
        mediaUrl: message.mediaUrl,
        status: 'sent',
        sentVia: automationId ? 'api' : 'manual',
        automationId,
        aiTriggered: false,
        processingTime: Date.now() - startTime,
      });

      await newMessage.save();

      // Update conversation
      if (conversationId) {
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessageAt: new Date(),
          lastMessageFrom: 'agent',
          $inc: { messageCount: 1 },
        });
      }

      // Update workspace usage
      const workspace = await Workspace.findById(job.data.workspaceId);
      if (workspace) {
        await workspace.incrementUsage('monthlyMessages');
      }

      // Update lead score
      const contact = await Contact.findById(contactId);
      if (contact) {
        await contact.updateLeadScore(1);
      }

      return { success: true, messageId: result.messageId };
    },
    {
      connection: getConnection(),
      concurrency: 25,
      limiter: {
        max: 250,
        duration: 60000,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`DM job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`DM job ${job?.id} failed:`, err.message);
  });

  return worker;
};
