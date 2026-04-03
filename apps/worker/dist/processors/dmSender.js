"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDMSenderWorker = void 0;
const bullmq_1 = require("bullmq");
const queues_js_1 = require("../queues/queues.js");
const connection_js_1 = __importDefault(require("../queues/connection.js"));
const index_js_1 = require("../models/index.js");
// Rate limiting
const accountRateLimits = new Map();
const RATE_LIMIT_TOKENS = 250;
const RATE_LIMIT_REFILL_MS = 60000;
const checkRateLimit = (accountId) => {
    const now = Date.now();
    let accountLimit = accountRateLimits.get(accountId);
    if (!accountLimit || now - accountLimit.lastRefill >= RATE_LIMIT_REFILL_MS) {
        accountRateLimits.set(accountId, { tokens: RATE_LIMIT_TOKENS - 1, lastRefill: now });
        return true;
    }
    if (accountLimit.tokens <= 0)
        return false;
    accountLimit.tokens -= 1;
    return true;
};
const sendInstagramDM = async (accessToken, igUserId, recipientId, message) => {
    const url = `${connection_js_1.default.instagram.graphApiBase}/${connection_js_1.default.instagram.apiVersion}/${igUserId}/messages`;
    const payload = {
        recipient: { id: recipientId },
        message: {},
    };
    const msgObj = payload.message;
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
const createDMSenderWorker = () => {
    const worker = new bullmq_1.Worker(queues_js_1.QUEUE_NAMES.DM_SENDER, async (job) => {
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
        const account = await index_js_1.InstagramAccount.findById(instagramAccountId);
        if (!account || account.status !== 'active') {
            throw new Error('Instagram account not found or inactive');
        }
        const accessToken = account.getDecryptedToken();
        // Send message
        const result = await sendInstagramDM(accessToken, account.instagramId, recipientId, message);
        // Record message in DB
        const newMessage = new index_js_1.Message({
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
            await index_js_1.Conversation.findByIdAndUpdate(conversationId, {
                lastMessageAt: new Date(),
                lastMessageFrom: 'agent',
                $inc: { messageCount: 1 },
            });
        }
        // Update workspace usage
        const workspace = await index_js_1.Workspace.findById(job.data.workspaceId);
        if (workspace) {
            await workspace.incrementUsage('monthlyMessages');
        }
        // Update lead score
        const contact = await index_js_1.Contact.findById(contactId);
        if (contact) {
            await contact.updateLeadScore(1);
        }
        return { success: true, messageId: result.messageId };
    }, {
        connection: (0, queues_js_1.getConnection)(),
        concurrency: 25,
        limiter: {
            max: 250,
            duration: 60000,
        },
    });
    worker.on('completed', (job) => {
        console.log(`DM job ${job.id} completed`);
    });
    worker.on('failed', (job, err) => {
        console.error(`DM job ${job?.id} failed:`, err.message);
    });
    return worker;
};
exports.createDMSenderWorker = createDMSenderWorker;
//# sourceMappingURL=dmSender.js.map