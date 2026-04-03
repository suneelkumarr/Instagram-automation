"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebhookWorker = void 0;
const bullmq_1 = require("bullmq");
const mongoose_1 = __importDefault(require("mongoose"));
const queues_js_1 = require("../queues/queues.js");
const index_js_1 = require("../models/index.js");
/**
 * Track analytics event
 */
async function trackEvent(workspaceId, instagramAccountId, event, metadata) {
    try {
        const analyticsEvent = new index_js_1.AnalyticsEvent({
            workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId),
            instagramAccountId: new mongoose_1.default.Types.ObjectId(instagramAccountId),
            event,
            metadata,
            timestamp: new Date(),
        });
        await analyticsEvent.save();
    }
    catch (err) {
        console.error('Failed to track analytics event:', err);
    }
}
/**
 * Get or create a contact from an inbound message
 */
async function getOrCreateContact(workspaceId, instagramAccountId, senderId, username, profilePicture) {
    // Try to find existing contact
    let contact = await index_js_1.Contact.findOne({
        instagramAccountId: new mongoose_1.default.Types.ObjectId(instagramAccountId),
        igUserId: senderId,
    });
    if (contact) {
        // Update last interaction
        contact.lastInteractionAt = new Date();
        await contact.save();
        return { contact, isNew: false };
    }
    // Create new contact
    contact = new index_js_1.Contact({
        workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId),
        instagramAccountId: new mongoose_1.default.Types.ObjectId(instagramAccountId),
        igUserId: senderId,
        username: username || `user_${senderId}`,
        displayName: username || '',
        profilePicture: profilePicture || '',
        source: 'dm',
        isBusiness: false,
        tags: [],
        lists: [],
        customFields: {},
        leadScore: 0,
        conversationStage: 'aware',
        followStatus: 'unknown',
    });
    await contact.save();
    return { contact, isNew: true };
}
/**
 * Get or create conversation for a contact
 */
async function getOrCreateConversation(workspaceId, instagramAccountId, contactId, igThreadId) {
    let conversation = await index_js_1.Conversation.findOne({
        instagramAccountId: new mongoose_1.default.Types.ObjectId(instagramAccountId),
        igThreadId,
    });
    if (!conversation) {
        conversation = new index_js_1.Conversation({
            workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId),
            instagramAccountId: new mongoose_1.default.Types.ObjectId(instagramAccountId),
            contactId,
            igThreadId,
            status: 'open',
            messageCount: 0,
            tags: [],
            priority: 'normal',
        });
        await conversation.save();
    }
    return conversation;
}
/**
 * Check if message is a duplicate
 */
async function isDuplicateMessage(messageId) {
    const existing = await index_js_1.Message.findOne({ igMessageId: messageId });
    return !!existing;
}
/**
 * Get active automations matching a trigger type
 */
async function getMatchingAutomations(workspaceId, instagramAccountId, triggerType) {
    return index_js_1.Automation.find({
        workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId),
        instagramAccountId: new mongoose_1.default.Types.ObjectId(instagramAccountId),
        status: 'active',
        'trigger.type': triggerType,
    }).lean();
}
/**
 * Trigger flow execution for matching automations
 */
async function triggerAutomations(workspaceId, instagramAccountId, triggerType, contactId, conversationId, triggerPayload) {
    const automations = await getMatchingAutomations(workspaceId, instagramAccountId, triggerType);
    for (const automation of automations) {
        try {
            const { addFlowJob } = await import('../queues/dmQueue.js');
            await addFlowJob({
                workspaceId,
                automationId: automation._id.toString(),
                contactId,
                conversationId,
                triggerType,
                triggerPayload,
            });
            console.log(`Triggered automation ${automation._id} for trigger ${triggerType}`);
        }
        catch (err) {
            console.error(`Failed to trigger automation ${automation._id}:`, err);
        }
    }
}
// =============================================================================
// EVENT HANDLERS
// =============================================================================
/**
 * Handle incoming direct message
 */
async function handleIncomingMessage(workspaceId, instagramAccountId, payload) {
    const { senderId, recipientId, messageId, text, attachments, timestamp, threadId } = payload;
    // Deduplicate
    if (await isDuplicateMessage(messageId)) {
        console.log(`Skipping duplicate message: ${messageId}`);
        return;
    }
    // Get IG account for profile info (if available from IG API)
    const igAccount = await index_js_1.InstagramAccount.findById(instagramAccountId);
    // Get or create contact
    const { contact, isNew } = await getOrCreateContact(workspaceId, instagramAccountId, senderId);
    // Get or create conversation
    const conversation = await getOrCreateConversation(workspaceId, instagramAccountId, contact._id, threadId || senderId);
    // Determine message type
    let messageType = 'text';
    let mediaUrl = '';
    if (attachments?.length) {
        const attachment = attachments[0];
        if (attachment.type === 'image') {
            messageType = 'image';
            mediaUrl = attachment.url || '';
        }
        else if (attachment.type === 'video') {
            messageType = 'video';
            mediaUrl = attachment.url || '';
        }
        else if (attachment.type === 'story_link') {
            messageType = 'story_link';
        }
        else {
            messageType = 'unsupported';
        }
    }
    // Determine message content
    let content = text || '';
    if (attachments?.length && !text) {
        content = `[${messageType}]`;
    }
    // Save inbound message
    const message = new index_js_1.Message({
        workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId),
        instagramAccountId: new mongoose_1.default.Types.ObjectId(instagramAccountId),
        conversationId: conversation._id,
        contactId: contact._id,
        igMessageId: messageId,
        igSenderId: senderId,
        igRecipientId: recipientId,
        direction: 'inbound',
        type: messageType,
        content,
        mediaUrl,
        status: 'delivered',
        sentVia: 'webhook',
        processingTime: 0,
    });
    await message.save();
    // Update conversation
    conversation.lastMessageAt = new Date();
    conversation.lastMessageFrom = 'contact';
    conversation.messageCount += 1;
    if (isNew) {
        conversation.tags.push('new_contact');
    }
    await conversation.save();
    // Track analytics
    await trackEvent(workspaceId, instagramAccountId, 'message_received', {
        messageId,
        isNew: isNew ? 'true' : 'false',
    });
    // Trigger automations
    await triggerAutomations(workspaceId, instagramAccountId, 'direct_message', contact._id.toString(), conversation._id.toString(), {
        message: content,
        messageType,
        mediaUrl,
        isNewContact: isNew,
        senderId,
        timestamp: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date(),
        threadId: threadId || senderId,
        username: contact.username,
    });
    console.log(`Processed incoming message from ${senderId} in workspace ${workspaceId}`);
}
/**
 * Handle incoming comment on a post
 */
async function handleCommentReceived(workspaceId, instagramAccountId, payload) {
    const { id, text, from, media, timestamp } = payload;
    // Deduplicate by comment ID
    if (await isDuplicateMessage(id)) {
        console.log(`Skipping duplicate comment: ${id}`);
        return;
    }
    // Get or create contact
    const { contact, isNew } = await getOrCreateContact(workspaceId, instagramAccountId, from.id, from.username);
    // Save comment as a message (using comment ID as message ID)
    const igAccount = await index_js_1.InstagramAccount.findById(instagramAccountId);
    const message = new index_js_1.Message({
        workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId),
        instagramAccountId: new mongoose_1.default.Types.ObjectId(instagramAccountId),
        contactId: contact._id,
        igMessageId: id,
        igSenderId: from.id,
        igRecipientId: igAccount?.instagramId || '',
        direction: 'inbound',
        type: 'text',
        content: text,
        status: 'delivered',
        sentVia: 'webhook',
    });
    await message.save();
    // Update contact interaction
    contact.lastInteractionAt = new Date();
    await contact.save();
    // Track analytics
    await trackEvent(workspaceId, instagramAccountId, 'comment_received', {
        commentId: id,
        postId: media.id,
        isNew: isNew,
    });
    // Trigger automations for comment
    await triggerAutomations(workspaceId, instagramAccountId, 'comment', contact._id.toString(), '', {
        message: text,
        commentId: id,
        postId: media.id,
        postCaption: media.caption,
        username: from.username,
        timestamp: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date(),
        isNewContact: isNew,
    });
    console.log(`Processed comment from ${from.username} on post ${media.id}`);
}
/**
 * Handle new follower event
 */
async function handleNewFollower(workspaceId, instagramAccountId, payload) {
    const { userId, username, timestamp } = payload;
    // Get or create contact
    const { contact, isNew } = await getOrCreateContact(workspaceId, instagramAccountId, userId, username);
    // Update follow status
    contact.followStatus = 'following';
    contact.source = 'follower';
    contact.lastInteractionAt = new Date();
    if (isNew) {
        contact.conversationStage = 'aware';
    }
    await contact.save();
    // Track analytics
    await trackEvent(workspaceId, instagramAccountId, 'new_follower', {
        followerId: userId,
        username,
        isNew,
    });
    // Trigger automations for new follower
    await triggerAutomations(workspaceId, instagramAccountId, 'new_follower', contact._id.toString(), '', {
        followerId: userId,
        username,
        isNewFollower: isNew,
        timestamp: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date(),
    });
    console.log(`Processed new follower ${username} in workspace ${workspaceId}`);
}
/**
 * Handle story mention event
 */
async function handleStoryMention(workspaceId, instagramAccountId, payload) {
    const { mentionId, userId, username, storyId, timestamp } = payload;
    // Get or create contact
    const { contact, isNew } = await getOrCreateContact(workspaceId, instagramAccountId, userId, username);
    // Track analytics
    await trackEvent(workspaceId, instagramAccountId, 'story_mention', {
        mentionId,
        storyId,
        username,
        isNew,
    });
    // Trigger automations for story mention
    await triggerAutomations(workspaceId, instagramAccountId, 'story_mention', contact._id.toString(), '', {
        mentionId,
        storyId,
        username,
        isNewContact: isNew,
        timestamp: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date(),
    });
    console.log(`Processed story mention from ${username}`);
}
/**
 * Handle message reaction (read/seen)
 */
async function handleMessageReaction(workspaceId, instagramAccountId, payload) {
    const { senderId, messageId, reaction } = payload;
    // Update message status to read if it was sent by us
    if (reaction === 'reaction') {
        await index_js_1.Message.findOneAndUpdate({ igMessageId: messageId, direction: 'outbound' }, { status: 'read' });
    }
    // Track read event
    await trackEvent(workspaceId, instagramAccountId, 'message_read', {
        messageId,
        reaction,
    });
}
// =============================================================================
// WORKER
// =============================================================================
const createWebhookWorker = () => {
    const worker = new bullmq_1.Worker(queues_js_1.QUEUE_NAMES.WEBHOOK_PROCESS, async (job) => {
        const startTime = Date.now();
        const { workspaceId, instagramAccountId, event, payload } = job.data;
        console.log(`Processing webhook event: ${event} for workspace: ${workspaceId}`);
        try {
            switch (event) {
                case 'incoming_message':
                    await handleIncomingMessage(workspaceId, instagramAccountId, payload);
                    break;
                case 'comment_received':
                    await handleCommentReceived(workspaceId, instagramAccountId, payload);
                    break;
                case 'new_follower':
                    await handleNewFollower(workspaceId, instagramAccountId, payload);
                    break;
                case 'story_mention':
                    await handleStoryMention(workspaceId, instagramAccountId, payload);
                    break;
                case 'message_reaction':
                    await handleMessageReaction(workspaceId, instagramAccountId, payload);
                    break;
                default:
                    console.log(`Unknown webhook event type: ${event}`);
            }
            // Log successful processing
            try {
                await index_js_1.WebhookLog.findOneAndUpdate({
                    workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId),
                    event,
                    'payload.messageId': payload['messageId'] || payload['id'],
                }, {
                    processed: true,
                    processingTime: Date.now() - startTime,
                }, { upsert: true });
            }
            catch (logErr) {
                console.error('Failed to update webhook log:', logErr);
            }
            return {
                success: true,
                event,
                workspaceId,
                processingTime: Date.now() - startTime,
            };
        }
        catch (err) {
            const errorMessage = err.message;
            console.error(`Webhook processing error for ${event}:`, errorMessage);
            // Log failure
            try {
                const logEntry = new index_js_1.WebhookLog({
                    workspaceId: new mongoose_1.default.Types.ObjectId(workspaceId),
                    instagramAccountId: new mongoose_1.default.Types.ObjectId(instagramAccountId),
                    event,
                    payload,
                    processed: false,
                    error: errorMessage,
                    processingTime: Date.now() - startTime,
                });
                await logEntry.save();
            }
            catch (logErr) {
                console.error('Failed to save webhook log:', logErr);
            }
            throw err;
        }
    }, {
        connection: (0, queues_js_1.getConnection)(),
        concurrency: 10,
        limiter: {
            max: 100,
            duration: 60000,
        },
    });
    worker.on('completed', (job, result) => {
        console.log(`Webhook job ${job.id} (${result.event}) completed in ${result.processingTime}ms`);
    });
    worker.on('failed', (job, err) => {
        console.error(`Webhook job ${job?.id} failed:`, err.message);
    });
    worker.on('error', (err) => {
        console.error('Webhook worker error:', err);
    });
    return worker;
};
exports.createWebhookWorker = createWebhookWorker;
//# sourceMappingURL=webhookProcessor.js.map