"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhookEvent = exports.handleWebhookVerification = exports.registerWebhook = exports.testWebhook = exports.syncInstagramAccount = exports.refreshInstagramToken = exports.getInstagramAccount = exports.disconnectInstagram = exports.connectInstagram = exports.listInstagramAccounts = void 0;
const crypto_1 = require("crypto");
const index_js_1 = require("../models/index.js");
const instagramService_js_1 = require("../services/instagramService.js");
const pagination_js_1 = require("../utils/pagination.js");
const index_js_2 = require("../config/index.js");
/**
 * Verify Instagram webhook signature
 * Meta sends X-Hub-Signature-256 header with HMAC-SHA256 of the payload
 */
function verifyWebhookSignature(payload, signature, appSecret) {
    if (!signature)
        return false;
    const expectedSig = 'sha256=' + (0, crypto_1.createHmac)('sha256', appSecret)
        .update(payload)
        .digest('hex');
    return signature === expectedSig;
}
// =============================================================================
// INSTAGRAM ACCOUNT MANAGEMENT
// =============================================================================
const listInstagramAccounts = async (req, res) => {
    try {
        const workspaceId = req.workspace?._id.toString();
        const accounts = await index_js_1.InstagramAccount.find({ workspaceId })
            .sort({ createdAt: -1 })
            .lean();
        (0, pagination_js_1.sendSuccess)(res, accounts);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to list Instagram accounts');
    }
};
exports.listInstagramAccounts = listInstagramAccounts;
const connectInstagram = async (req, res) => {
    try {
        const workspaceId = req.workspace?._id.toString();
        const { code, redirectUri } = req.body;
        // Exchange code for token
        const { accessToken, instagramAccountId: igId } = await instagramService_js_1.instagramService.exchangeCodeForToken(code, redirectUri || `${process.env.API_URL}/auth/instagram/callback`);
        // Get long-lived token
        const { accessToken: longLivedToken, expiresIn } = await instagramService_js_1.instagramService.getLongLivedToken(accessToken);
        // Get account info
        const accountInfo = await instagramService_js_1.instagramService.getAccountInfo(longLivedToken, igId);
        // Check if already connected
        const existing = await index_js_1.InstagramAccount.findOne({ instagramId: igId });
        if (existing) {
            existing.accessToken = longLivedToken;
            existing.accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
            existing.status = 'active';
            await existing.save();
            (0, pagination_js_1.sendSuccess)(res, existing);
            return;
        }
        // Check limit
        const workspace = req.workspace;
        if (!workspace.checkUsageLimit('instagramAccounts')) {
            (0, pagination_js_1.sendError)(res, `Instagram account limit reached (${workspace.limits.instagramAccounts}). Upgrade your plan.`, 403);
            return;
        }
        // Generate webhook verify token
        const crypto = await import('crypto');
        const webhookVerifyToken = crypto.randomBytes(32).toString('hex');
        // Create new account
        const account = new index_js_1.InstagramAccount({
            workspaceId,
            instagramId: igId,
            username: accountInfo.username,
            displayName: accountInfo.name,
            profilePicture: accountInfo.profile_picture_url,
            followersCount: accountInfo.followers_count,
            bio: accountInfo.biography,
            website: accountInfo.website,
            accessToken: longLivedToken,
            accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
            status: 'active',
            permissions: ['instagram_basic', 'instagram_manage_messages', 'instagram_manage_comments', 'pages_read_engagement'],
            webhookVerifyToken,
        });
        await account.save();
        await workspace.incrementUsage('instagramAccounts');
        // Register webhook — using the _id as the route parameter
        const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/v1/webhooks/instagram/${account._id}`;
        try {
            await instagramService_js_1.instagramService.registerWebhook(longLivedToken, igId, webhookUrl, webhookVerifyToken);
        }
        catch (whErr) {
            console.warn('Webhook registration warning (may need app review):', whErr.message);
        }
        (0, pagination_js_1.sendSuccess)(res, account, 201);
    }
    catch (error) {
        console.error('Instagram connect error:', error);
        (0, pagination_js_1.sendError)(res, `Failed to connect Instagram: ${error.message}`);
    }
};
exports.connectInstagram = connectInstagram;
const disconnectInstagram = async (req, res) => {
    try {
        const account = await index_js_1.InstagramAccount.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!account) {
            (0, pagination_js_1.sendError)(res, 'Account not found', 404);
            return;
        }
        await index_js_1.Automation.updateMany({ instagramAccountId: account._id }, { status: 'paused' });
        account.status = 'disconnected';
        await account.save();
        (0, pagination_js_1.sendSuccess)(res, { disconnected: true });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to disconnect account');
    }
};
exports.disconnectInstagram = disconnectInstagram;
const getInstagramAccount = async (req, res) => {
    try {
        const account = await index_js_1.InstagramAccount.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!account) {
            (0, pagination_js_1.sendError)(res, 'Account not found', 404);
            return;
        }
        (0, pagination_js_1.sendSuccess)(res, account);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to get account');
    }
};
exports.getInstagramAccount = getInstagramAccount;
const refreshInstagramToken = async (req, res) => {
    try {
        const account = await index_js_1.InstagramAccount.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!account) {
            (0, pagination_js_1.sendError)(res, 'Account not found', 404);
            return;
        }
        if (account.isTokenExpired()) {
            await instagramService_js_1.instagramService.refreshAccessToken(account._id.toString());
        }
        const updated = await index_js_1.InstagramAccount.findById(account._id);
        (0, pagination_js_1.sendSuccess)(res, updated);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to refresh token');
    }
};
exports.refreshInstagramToken = refreshInstagramToken;
const syncInstagramAccount = async (req, res) => {
    try {
        const account = await index_js_1.InstagramAccount.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!account) {
            (0, pagination_js_1.sendError)(res, 'Account not found', 404);
            return;
        }
        const token = account.getDecryptedToken();
        const accountInfo = await instagramService_js_1.instagramService.getAccountInfo(token, account.instagramId);
        account.displayName = accountInfo.name;
        account.profilePicture = accountInfo.profile_picture_url;
        account.followersCount = accountInfo.followers_count;
        account.bio = accountInfo.biography;
        account.website = accountInfo.website;
        account.lastSyncedAt = new Date();
        await account.save();
        (0, pagination_js_1.sendSuccess)(res, account);
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to sync account');
    }
};
exports.syncInstagramAccount = syncInstagramAccount;
// =============================================================================
// WEBHOOK TEST & REGISTRATION
// =============================================================================
const testWebhook = async (req, res) => {
    try {
        const account = await index_js_1.InstagramAccount.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!account) {
            (0, pagination_js_1.sendError)(res, 'Account not found', 404);
            return;
        }
        // Simulate a test message event
        const { addWebhookJob } = await import('../services/queueService.js');
        const testJobId = await addWebhookJob({
            workspaceId: account.workspaceId.toString(),
            instagramAccountId: account._id.toString(),
            event: 'incoming_message',
            payload: {
                senderId: 'test_user_123',
                recipientId: account.instagramId,
                messageId: `test_${Date.now()}`,
                text: 'This is a test message',
                timestamp: String(Math.floor(Date.now() / 1000)),
                threadId: 'test_thread',
                isTest: true,
            },
        });
        (0, pagination_js_1.sendSuccess)(res, {
            message: 'Test webhook event queued',
            jobId: testJobId,
            webhookUrl: `${process.env.WEBHOOK_BASE_URL}/api/v1/webhooks/instagram/${account._id}`,
        });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to test webhook');
    }
};
exports.testWebhook = testWebhook;
const registerWebhook = async (req, res) => {
    try {
        const account = await index_js_1.InstagramAccount.findOne({
            _id: req.params.id,
            workspaceId: req.workspace?._id,
        });
        if (!account) {
            (0, pagination_js_1.sendError)(res, 'Account not found', 404);
            return;
        }
        const token = account.getDecryptedToken();
        const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/v1/webhooks/instagram/${account._id}`;
        try {
            const success = await instagramService_js_1.instagramService.registerWebhook(token, account.instagramId, webhookUrl, account.webhookVerifyToken);
            (0, pagination_js_1.sendSuccess)(res, {
                registered: success,
                webhookUrl,
                message: success
                    ? 'Webhook registered successfully'
                    : 'Webhook registration returned non-OK. Your app may need Meta review for this permission.',
            });
        }
        catch (err) {
            (0, pagination_js_1.sendError)(res, `Webhook registration failed: ${err.message}`, 400);
        }
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to register webhook');
    }
};
exports.registerWebhook = registerWebhook;
// =============================================================================
// WEBHOOK HANDLERS (Meta -> Our Server)
// =============================================================================
const handleWebhookVerification = async (req, res) => {
    // req.params.accountId is the MongoDB _id of the InstagramAccount
    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe') {
        // Look up the account to get its verify token
        const account = await index_js_1.InstagramAccount.findById(req.params.accountId);
        if (!account) {
            res.status(404).send('Account not found');
            return;
        }
        const expectedToken = account.webhookVerifyToken;
        const receivedToken = req.query['hub.verify_token'];
        if (receivedToken === expectedToken) {
            console.log(`Webhook verified for account ${account.username}`);
            res.status(200).send(challenge);
            return;
        }
    }
    console.warn('Webhook verification failed:', {
        mode,
        accountId: req.params.accountId,
        receivedToken: req.query['hub.verify_token'],
    });
    res.status(403).send('Forbidden');
};
exports.handleWebhookVerification = handleWebhookVerification;
const handleWebhookEvent = async (req, res) => {
    // CRITICAL: Always respond to Meta within 20 seconds
    res.status(200).send('OK');
    // Verify webhook signature in production
    const signature = req.headers['x-hub-signature-256'];
    const rawBody = req.body;
    if (index_js_2.config.env === 'production') {
        // rawBody can be Buffer (from express.raw()), string, or already-parsed object
        let payload;
        if (Buffer.isBuffer(rawBody)) {
            payload = rawBody.toString('utf8');
        }
        else if (typeof rawBody === 'string') {
            payload = rawBody;
        }
        else {
            payload = JSON.stringify(rawBody);
        }
        if (!verifyWebhookSignature(payload, signature, index_js_2.config.instagram.appSecret)) {
            console.error('Webhook signature verification failed — rejecting event');
            return;
        }
    }
    // Parse body: Buffer → JSON, string → JSON, object → use as-is
    let parsedBody;
    if (Buffer.isBuffer(rawBody)) {
        parsedBody = JSON.parse(rawBody.toString('utf8'));
    }
    else if (typeof rawBody === 'string') {
        parsedBody = JSON.parse(rawBody);
    }
    else {
        parsedBody = rawBody;
    }
    const body = parsedBody;
    const { object, entry } = body;
    // Only process Instagram events
    if (object !== 'instagram') {
        console.log(`Ignoring webhook object: ${object}`);
        return;
    }
    // Import queue service dynamically
    let addWebhookJob;
    try {
        const { addWebhookJob: fn } = await import('../services/queueService.js');
        addWebhookJob = fn;
    }
    catch (err) {
        console.error('Failed to import queueService:', err);
        return;
    }
    for (const entryItem of entry) {
        const igUserId = entryItem.id; // This is the Instagram User ID from Meta
        // Security check: verify the route accountId matches the entry's igUserId
        const routeAccountId = req.params.accountId;
        if (routeAccountId) {
            const accountByDbId = await index_js_1.InstagramAccount.findById(routeAccountId);
            if (accountByDbId && accountByDbId.instagramId !== igUserId) {
                console.warn(`Webhook security: route account ${routeAccountId} (igId: ${accountByDbId.instagramId}) doesn't match entry igUserId ${igUserId}`);
                continue;
            }
        }
        // Find our InstagramAccount by instagramId (the Meta IG User ID)
        const account = await index_js_1.InstagramAccount.findOne({ instagramId: igUserId });
        if (!account) {
            console.error(`Webhook: No InstagramAccount found for igUserId ${igUserId}`);
            continue;
        }
        const workspaceId = account.workspaceId.toString();
        const accountDbId = account._id.toString();
        // --- 1. MESSAGING EVENTS (direct messages received) ---
        for (const event of entryItem.messaging || []) {
            const { sender, recipient, timestamp, message } = event;
            // Skip outgoing messages (our own bot sending)
            if (sender.id === igUserId)
                continue;
            // Handle message reads
            if (event.read) {
                const readJob = {
                    workspaceId,
                    instagramAccountId: accountDbId,
                    event: 'message_read',
                    payload: {
                        senderId: sender.id,
                        recipientId: recipient.id,
                        watermark: event.read.watermark,
                        timestamp,
                    },
                };
                await addWebhookJob(readJob);
                continue;
            }
            // Handle delivery confirmations
            if (event.delivery) {
                console.log(`Delivery confirmed for messages: ${event.delivery.mids.join(', ')}`);
                continue;
            }
            // Handle reactions
            if (event.reaction) {
                const reactionJob = {
                    workspaceId,
                    instagramAccountId: accountDbId,
                    event: 'message_reaction',
                    payload: {
                        senderId: sender.id,
                        recipientId: recipient.id,
                        messageId: event.reaction.mid,
                        reaction: event.reaction.reaction,
                        action: event.reaction.action,
                        timestamp,
                    },
                };
                await addWebhookJob(reactionJob);
                continue;
            }
            // Handle incoming messages
            if (message && !message.is_reply) {
                // Skip quick reply payloads (those are user responses to our buttons)
                const messageJob = {
                    workspaceId,
                    instagramAccountId: accountDbId,
                    event: 'incoming_message',
                    payload: {
                        senderId: sender.id,
                        recipientId: recipient.id,
                        messageId: message.mid,
                        text: message.text || '',
                        quickReplyPayload: message.quick_reply?.payload || '',
                        attachments: (message.attachments || []).map((att) => ({
                            type: att.type,
                            url: att.payload?.url || '',
                        })),
                        timestamp,
                        threadId: sender.id, // Use sender ID as thread ID for 1:1 DMs
                    },
                };
                await addWebhookJob(messageJob);
            }
        }
        // --- 2. CHANGES EVENTS (comments, follows, mentions, storyline) ---
        for (const change of entryItem.changes || []) {
            const value = change.value;
            const timestamp = value.timestamp || value.created_at;
            // COMMENTS on posts
            if (change.field === 'comments') {
                // Ignore deleted comments
                if (value.verb === 'delete')
                    continue;
                const commentJob = {
                    workspaceId,
                    instagramAccountId: accountDbId,
                    event: 'comment_received',
                    payload: {
                        id: value.id,
                        text: value.text || '',
                        from: {
                            id: value.from?.id || '',
                            username: value.from?.username || '',
                        },
                        media: {
                            id: value.media?.id || '',
                            caption: value.media?.caption || '',
                        },
                        timestamp: String(timestamp || Math.floor(Date.now() / 1000)),
                    },
                };
                await addWebhookJob(commentJob);
            }
            // MENTIONS in comments
            if (change.field === 'mentions') {
                const mentionJob = {
                    workspaceId,
                    instagramAccountId: accountDbId,
                    event: 'comment_received',
                    payload: {
                        id: value.id || `mention_${Date.now()}`,
                        text: value.text || '',
                        from: {
                            id: value.from?.id || '',
                            username: value.from?.username || '',
                        },
                        media: {
                            id: value.media?.id || '',
                            caption: value.media?.caption || '',
                        },
                        timestamp: String(timestamp || Math.floor(Date.now() / 1000)),
                    },
                };
                await addWebhookJob(mentionJob);
            }
            // STORY mentions
            if (change.field === 'story_mentions' || (change.field === 'mentions' && value.link)) {
                const mentionJob = {
                    workspaceId,
                    instagramAccountId: accountDbId,
                    event: 'story_mention',
                    payload: {
                        mentionId: value.id || `story_${Date.now()}`,
                        userId: value.from?.id || '',
                        username: value.from?.username || '',
                        storyId: value.media?.id || '',
                        timestamp: String(timestamp || Math.floor(Date.now() / 1000)),
                    },
                };
                await addWebhookJob(mentionJob);
            }
        }
        // --- 3. STANDBY EVENTS (messages in shared flows / secondary apps) ---
        for (const event of entryItem.standby || []) {
            const { sender, recipient, timestamp, message } = event;
            if (sender.id === igUserId)
                continue;
            if (message) {
                const messageJob = {
                    workspaceId,
                    instagramAccountId: accountDbId,
                    event: 'incoming_message',
                    payload: {
                        senderId: sender.id,
                        recipientId: recipient.id,
                        messageId: message.mid,
                        text: message.text || '',
                        attachments: (message.attachments || []).map((att) => ({
                            type: att.type,
                            url: att.payload?.url || '',
                        })),
                        timestamp,
                        threadId: sender.id,
                        isStandby: true,
                    },
                };
                await addWebhookJob(messageJob);
            }
        }
    }
};
exports.handleWebhookEvent = handleWebhookEvent;
//# sourceMappingURL=instagramController.js.map