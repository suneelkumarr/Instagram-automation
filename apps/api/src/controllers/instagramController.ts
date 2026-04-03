import { Request, Response } from 'express';
import { createHmac } from 'crypto';
import { InstagramAccount, Automation, WebhookLog } from '../models/index.js';
import { instagramService } from '../services/instagramService.js';
import { sendSuccess, sendError } from '../utils/pagination.js';
import { config } from '../config/index.js';

/**
 * Verify Instagram webhook signature
 * Meta sends X-Hub-Signature-256 header with HMAC-SHA256 of the payload
 */
function verifyWebhookSignature(payload: string, signature: string | undefined, appSecret: string): boolean {
  if (!signature) return false;

  const expectedSig = 'sha256=' + createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');

  return signature === expectedSig;
}

// =============================================================================
// INSTAGRAM ACCOUNT MANAGEMENT
// =============================================================================

export const listInstagramAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace?._id.toString();

    const accounts = await InstagramAccount.find({ workspaceId })
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, accounts);
  } catch (error) {
    sendError(res, 'Failed to list Instagram accounts');
  }
};

export const connectInstagram = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspace?._id.toString();
    const { code, redirectUri } = req.body;

    // Exchange code for token
    const { accessToken, instagramAccountId: igId } = await instagramService.exchangeCodeForToken(
      code,
      redirectUri || `${process.env.API_URL}/auth/instagram/callback`
    );

    // Get long-lived token
    const { accessToken: longLivedToken, expiresIn } = await instagramService.getLongLivedToken(accessToken);

    // Get account info
    const accountInfo = await instagramService.getAccountInfo(longLivedToken, igId);

    // Check if already connected
    const existing = await InstagramAccount.findOne({ instagramId: igId });
    if (existing) {
      existing.accessToken = longLivedToken;
      existing.accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
      existing.status = 'active';
      await existing.save();
      sendSuccess(res, existing);
      return;
    }

    // Check limit
    const workspace = req.workspace!;
    if (!workspace.checkUsageLimit('instagramAccounts')) {
      sendError(res, `Instagram account limit reached (${workspace.limits.instagramAccounts}). Upgrade your plan.`, 403);
      return;
    }

    // Generate webhook verify token
    const crypto = await import('crypto');
    const webhookVerifyToken = crypto.randomBytes(32).toString('hex');

    // Create new account
    const account = new InstagramAccount({
      workspaceId,
      instagramId: igId,
      username: accountInfo.username as string,
      displayName: accountInfo.name as string,
      profilePicture: accountInfo.profile_picture_url as string,
      followersCount: accountInfo.followers_count as number,
      bio: accountInfo.biography as string,
      website: accountInfo.website as string,
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
      await instagramService.registerWebhook(
        longLivedToken,
        igId,
        webhookUrl,
        webhookVerifyToken
      );
    } catch (whErr) {
      console.warn('Webhook registration warning (may need app review):', (whErr as Error).message);
    }

    sendSuccess(res, account, 201);
  } catch (error) {
    console.error('Instagram connect error:', error);
    sendError(res, `Failed to connect Instagram: ${(error as Error).message}`);
  }
};

export const disconnectInstagram = async (req: Request, res: Response): Promise<void> => {
  try {
    const account = await InstagramAccount.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!account) {
      sendError(res, 'Account not found', 404);
      return;
    }

    await Automation.updateMany(
      { instagramAccountId: account._id },
      { status: 'paused' }
    );

    account.status = 'disconnected';
    await account.save();

    sendSuccess(res, { disconnected: true });
  } catch (error) {
    sendError(res, 'Failed to disconnect account');
  }
};

export const getInstagramAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const account = await InstagramAccount.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!account) {
      sendError(res, 'Account not found', 404);
      return;
    }

    sendSuccess(res, account);
  } catch (error) {
    sendError(res, 'Failed to get account');
  }
};

export const refreshInstagramToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const account = await InstagramAccount.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!account) {
      sendError(res, 'Account not found', 404);
      return;
    }

    if (account.isTokenExpired()) {
      await instagramService.refreshAccessToken(account._id.toString());
    }

    const updated = await InstagramAccount.findById(account._id);
    sendSuccess(res, updated);
  } catch (error) {
    sendError(res, 'Failed to refresh token');
  }
};

export const syncInstagramAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const account = await InstagramAccount.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!account) {
      sendError(res, 'Account not found', 404);
      return;
    }

    const token = account.getDecryptedToken();
    const accountInfo = await instagramService.getAccountInfo(token, account.instagramId);

    account.displayName = accountInfo.name as string;
    account.profilePicture = accountInfo.profile_picture_url as string;
    account.followersCount = accountInfo.followers_count as number;
    account.bio = accountInfo.biography as string;
    account.website = accountInfo.website as string;
    account.lastSyncedAt = new Date();
    await account.save();

    sendSuccess(res, account);
  } catch (error) {
    sendError(res, 'Failed to sync account');
  }
};

// =============================================================================
// WEBHOOK TEST & REGISTRATION
// =============================================================================

export const testWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const account = await InstagramAccount.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!account) {
      sendError(res, 'Account not found', 404);
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

    sendSuccess(res, {
      message: 'Test webhook event queued',
      jobId: testJobId,
      webhookUrl: `${process.env.WEBHOOK_BASE_URL}/api/v1/webhooks/instagram/${account._id}`,
    });
  } catch (error) {
    sendError(res, 'Failed to test webhook');
  }
};

export const registerWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const account = await InstagramAccount.findOne({
      _id: req.params.id,
      workspaceId: req.workspace?._id,
    });

    if (!account) {
      sendError(res, 'Account not found', 404);
      return;
    }

    const token = account.getDecryptedToken();
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/v1/webhooks/instagram/${account._id}`;

    try {
      const success = await instagramService.registerWebhook(
        token,
        account.instagramId,
        webhookUrl,
        account.webhookVerifyToken
      );

      sendSuccess(res, {
        registered: success,
        webhookUrl,
        message: success
          ? 'Webhook registered successfully'
          : 'Webhook registration returned non-OK. Your app may need Meta review for this permission.',
      });
    } catch (err) {
      sendError(res, `Webhook registration failed: ${(err as Error).message}`, 400);
    }
  } catch (error) {
    sendError(res, 'Failed to register webhook');
  }
};

// =============================================================================
// WEBHOOK HANDLERS (Meta -> Our Server)
// =============================================================================

export const handleWebhookVerification = async (req: Request, res: Response): Promise<void> => {
  // req.params.accountId is the MongoDB _id of the InstagramAccount
  const mode = req.query['hub.mode'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (mode === 'subscribe') {
    // Look up the account to get its verify token
    const account = await InstagramAccount.findById(req.params.accountId);
    if (!account) {
      res.status(404).send('Account not found');
      return;
    }

    const expectedToken = account.webhookVerifyToken;
    const receivedToken = req.query['hub.verify_token'] as string;

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

export const handleWebhookEvent = async (req: Request, res: Response): Promise<void> => {
  // CRITICAL: Always respond to Meta within 20 seconds
  res.status(200).send('OK');

  // Verify webhook signature in production
  const signature = req.headers['x-hub-signature-256'] as string;
  const rawBody = req.body;

  if (config.env === 'production') {
    // rawBody can be Buffer (from express.raw()), string, or already-parsed object
    let payload: string;
    if (Buffer.isBuffer(rawBody)) {
      payload = rawBody.toString('utf8');
    } else if (typeof rawBody === 'string') {
      payload = rawBody;
    } else {
      payload = JSON.stringify(rawBody);
    }
    if (!verifyWebhookSignature(payload, signature, config.instagram.appSecret)) {
      console.error('Webhook signature verification failed — rejecting event');
      return;
    }
  }

  // Parse body: Buffer → JSON, string → JSON, object → use as-is
  let parsedBody: Record<string, unknown>;
  if (Buffer.isBuffer(rawBody)) {
    parsedBody = JSON.parse(rawBody.toString('utf8'));
  } else if (typeof rawBody === 'string') {
    parsedBody = JSON.parse(rawBody);
  } else {
    parsedBody = rawBody as Record<string, unknown>;
  }

  const body = parsedBody as {
    object: string;
    entry: Array<{
      id: string;
      time: number;
      messaging?: Array<{
        sender: { id: string };
        recipient: { id: string };
        timestamp: string;
        message?: {
          mid: string;
          text?: string;
          attachments?: Array<{
            type: string;
            payload?: { url?: string; title?: string };
          }>;
          is_reply?: boolean;
          quick_reply?: { payload: string };
        };
        delivery?: { mids: string[] };
        read?: { watermark: number };
        reaction?: { action: string; mid: string; reaction: string };
      }>;
      changes?: Array<{
        field: string;
        value: {
          id?: string;
          from?: { id: string; username?: string; name?: string };
          text?: string;
          media?: { id: string; caption?: string };
          media_type?: string;
          verb?: string;
          created_at?: number;
          timestamp?: number;
          link?: string;
          user_id?: string;
          username?: string;
        };
      }>;
      standby?: Array<{
        sender: { id: string };
        recipient: { id: string };
        timestamp: string;
        message?: {
          mid: string;
          text?: string;
          attachments?: Array<{
            type: string;
            payload?: { url?: string; title?: string };
          }>;
          is_reply?: boolean;
        };
      }>;
    }>;
  };

  const { object, entry } = body;

  // Only process Instagram events
  if (object !== 'instagram') {
    console.log(`Ignoring webhook object: ${object}`);
    return;
  }

  // Import queue service dynamically
  let addWebhookJob: (data: any) => Promise<string>;
  try {
    const { addWebhookJob: fn } = await import('../services/queueService.js');
    addWebhookJob = fn;
  } catch (err) {
    console.error('Failed to import queueService:', err);
    return;
  }

  for (const entryItem of entry) {
    const igUserId = entryItem.id; // This is the Instagram User ID from Meta

    // Security check: verify the route accountId matches the entry's igUserId
    const routeAccountId = req.params.accountId;
    if (routeAccountId) {
      const accountByDbId = await InstagramAccount.findById(routeAccountId);
      if (accountByDbId && accountByDbId.instagramId !== igUserId) {
        console.warn(`Webhook security: route account ${routeAccountId} (igId: ${accountByDbId.instagramId}) doesn't match entry igUserId ${igUserId}`);
        continue;
      }
    }

    // Find our InstagramAccount by instagramId (the Meta IG User ID)
    const account = await InstagramAccount.findOne({ instagramId: igUserId });
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
      if (sender.id === igUserId) continue;

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
        if (value.verb === 'delete') continue;

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

      if (sender.id === igUserId) continue;

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
