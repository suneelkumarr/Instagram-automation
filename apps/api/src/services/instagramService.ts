import { config } from '../config/index.js';
import { InstagramAccount } from '../models/index.js';

const { graphApiBase, apiVersion } = config.instagram;

interface InstagramError {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    fbtrace_id?: string;
  };
}

export class RateLimitError extends Error {
  retryAfter?: number;
  constructor(error: InstagramError) {
    super(error?.error?.message || 'Instagram API rate limit exceeded');
    this.name = 'RateLimitError';
    this.retryAfter = 60; // seconds
  }
}

export class InstagramAPIError extends Error {
  code?: number;
  type?: string;
  fbtrace_id?: string;
  constructor(error: InstagramError) {
    super(error?.error?.message || 'Instagram API error');
    this.name = 'InstagramAPIError';
    this.code = error?.error?.code;
    this.type = error?.error?.type;
    this.fbtrace_id = error?.error?.fbtrace_id;
  }
}

export class InstagramService {
  private baseUrl = `${graphApiBase}/${apiVersion}`;

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<{
    accessToken: string;
    instagramAccountId: string;
    expiresIn: number;
  }> {
    const url = `${graphApiBase}/oauth/access_token`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.instagram.appId,
        client_secret: config.instagram.appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new InstagramAPIError(data);
    }

    // Get Instagram Business Account ID
    const accountsResponse = await fetch(
      `${this.baseUrl}/me/accounts?access_token=${data.access_token}`
    );
    const accountsData = await accountsResponse.json();

    const pageId = accountsData.data?.[0]?.id;
    if (!pageId) {
      throw new Error('No Facebook Page found');
    }

    // Get linked Instagram account
    const igResponse = await fetch(
      `${this.baseUrl}/${pageId}?fields=instagram_business_account&access_token=${data.access_token}`
    );
    const igData = await igResponse.json();

    const instagramAccountId = igData.instagram_business_account?.id;
    if (!instagramAccountId) {
      throw new Error('No Instagram Business Account linked to this page');
    }

    return {
      accessToken: data.access_token,
      instagramAccountId,
      expiresIn: data.expires_in || 0,
    };
  }

  /**
   * Get long-lived access token (valid for 60 days)
   */
  async getLongLivedToken(shortLivedToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const url = `${graphApiBase}/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.instagram.appId}&client_secret=${config.instagram.appSecret}&fb_exchange_token=${shortLivedToken}`;

    const response = await fetch(url, {
      method: 'GET',
    });

    const data = await response.json();
    if (!response.ok) {
      throw new InstagramAPIError(data);
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(accountId: string): Promise<string> {
    const account = await InstagramAccount.findById(accountId);
    if (!account) throw new Error('Account not found');

    const token = account.getDecryptedToken();
    const url = `${graphApiBase}/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.instagram.appId}&client_secret=${config.instagram.appSecret}&fb_exchange_token=${token}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new InstagramAPIError(data);
    }

    const newToken = data.access_token;
    const expiresIn = data.expires_in;

    // Save encrypted new token
    account.accessToken = newToken;
    account.accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    await account.save();

    return newToken;
  }

  /**
   * Get Instagram account info
   */
  async getAccountInfo(accessToken: string, instagramId: string): Promise<Record<string, unknown>> {
    const fields = [
      'id', 'username', 'name', 'profile_picture_url', 'biography',
      'followers_count', 'follows_count', 'media_count', 'website',
      'is_business_profile', 'ig_id'
    ].join(',');

    const url = `${this.baseUrl}/${instagramId}?fields=${fields}&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new InstagramAPIError(data);
    }

    return data;
  }

  /**
   * Send direct message
   */
  async sendMessage(
    accessToken: string,
    igUserId: string,
    recipientId: string,
    message: {
      text?: string;
      mediaUrl?: string;
      quickReplies?: Array<{ title: string; payload: string }>;
    }
  ): Promise<{ messageId: string }> {
    const url = `${this.baseUrl}/${igUserId}/messages`;

    const payload: Record<string, unknown> = {
      recipient: { id: recipientId },
      message: { text: message.text },
    };

    // Add media if provided
    if (message.mediaUrl) {
      // First upload media to get reusable ID
      const mediaId = await this.uploadMedia(accessToken, igUserId, message.mediaUrl);
      (payload.message as Record<string, unknown>).attachment = {
        type: 'image',
        payload: { url: message.mediaUrl, is_reusable: true },
      };
    }

    // Add quick replies if provided
    if (message.quickReplies && message.quickReplies.length > 0) {
      (payload.message as Record<string, unknown>).quick_replies = message.quickReplies.slice(0, 13).map((qr) => ({
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
      if (data.error?.code === 4 || data.error?.type === 'OAuthException') {
        throw new RateLimitError(data);
      }
      throw new InstagramAPIError(data);
    }

    return { messageId: data.message_id };
  }

  /**
   * Upload media for message
   */
  private async uploadMedia(
    accessToken: string,
    igUserId: string,
    mediaUrl: string
  ): Promise<string> {
    const url = `${this.baseUrl}/${igUserId}/media`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: mediaUrl,
        is_reusable: true,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new InstagramAPIError(data);
    }

    return data.id;
  }

  /**
   * Get recent comments on a post
   */
  async getComments(
    accessToken: string,
    igUserId: string,
    mediaId: string,
    fields = 'id,text,username,timestamp,from,replies{id,text,username,timestamp}'
  ): Promise<Array<Record<string, unknown>>> {
    const url = `${this.baseUrl}/${mediaId}/comments?fields=${fields}&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new InstagramAPIError(data);
    }

    return data.data || [];
  }

  /**
   * Reply to a comment
   */
  async replyToComment(
    accessToken: string,
    igUserId: string,
    commentId: string,
    message: string
  ): Promise<{ id: string }> {
    const url = `${this.baseUrl}/${commentId}/replies`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        access_token: accessToken,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new InstagramAPIError(data);
    }

    return { id: data.id };
  }

  /**
   * Get incoming messages from DM inbox
   */
  async getMessages(
    accessToken: string,
    igUserId: string,
    threadId: string
  ): Promise<Array<Record<string, unknown>>> {
    const url = `${this.baseUrl}/${threadId}/messages?fields=id,from,to,timestamp,type,text,attachments&access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new InstagramAPIError(data);
    }

    return data.data || [];
  }

  /**
   * Register webhook for Instagram events
   */
  async registerWebhook(
    accessToken: string,
    igUserId: string,
    webhookUrl: string,
    verifyToken: string
  ): Promise<boolean> {
    const url = `${this.baseUrl}/${igUserId}/subscriptions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_url: webhookUrl,
        verify_token: verifyToken,
        fields: ['messages', 'comments', 'mentions', 'story_mentions', 'follows'].join(','),
      }),
    });

    return response.ok;
  }

  /**
   * Check if a user follows the business account
   * Uses the Instagram Graph API to check relationship status
   */
  async checkFollowStatus(
    accessToken: string,
    igUserId: string,
    targetUserId: string
  ): Promise<'following' | 'not_following' | 'requested' | 'unknown'> {
    // IG Graph API: GET /{ig-user-id}/followers?user_id={target-user-id}
    // or check via the accounts they follow
    const url = `${this.baseUrl}/${igUserId}/followers?access_token=${accessToken}&user_id=${targetUserId}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        // API may return empty data if user doesn't follow
        if (data.error?.code === 100 || data.error?.message?.includes('does not follow')) {
          return 'not_following';
        }
        return 'unknown';
      }

      // Check if target user is in the followers list
      const followers = data.data || [];
      const isFollowing = followers.some((f: any) => f.id === targetUserId);

      return isFollowing ? 'following' : 'not_following';
    } catch (error) {
      console.error('Error checking follow status:', error);
      return 'unknown';
    }
  }

  /**
   * Check follow status using the newer relationships endpoint
   * More reliable approach using IG Story mentions or direct API
   */
  async checkFollowStatusV2(
    accessToken: string,
    igUserId: string,
    targetUsername: string
  ): Promise<'following' | 'not_following' | 'requested' | 'unknown'> {
    // First get the IG user ID for the target username
    const searchUrl = `${this.baseUrl}/${igUserId}/igds_search?search_surface=reels_viewer&query=${encodeURIComponent(targetUsername)}&access_token=${accessToken}`;

    try {
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (!searchResponse.ok || !searchData.users?.length) {
        return 'unknown';
      }

      const targetUser = searchData.users.find(
        (u: any) => u.username?.toLowerCase() === targetUsername.toLowerCase()
      );

      if (!targetUser) {
        return 'unknown';
      }

      const targetIgId = targetUser.id;

      // Check if this user follows the business account
      const followCheckUrl = `${this.baseUrl}/${igUserId}/relationship?access_token=${accessToken}`;
      const followResponse = await fetch(followCheckUrl);
      const followData = await followResponse.json();

      // If the target user is in the followers list, they follow us
      const followersUrl = `${this.baseUrl}/${igUserId}/followers?access_token=${accessToken}`;
      const followersResponse = await fetch(followersUrl);
      const followersData = await followersResponse.json();

      if (followersData.data) {
        const found = followersData.data.some((u: any) => u.id === targetIgId);
        return found ? 'following' : 'not_following';
      }

      return 'unknown';
    } catch (error) {
      console.error('Error checking follow status v2:', error);
      return 'unknown';
    }
  }

  /**
   * Refresh contact follow status from Instagram API
   * Called when processing inbound DMs or comments
   */
  async refreshContactFollowStatus(
    accessToken: string,
    igUserId: string,
    contactIgUserId: string,
    contactUsername: string
  ): Promise<'following' | 'not_following' | 'requested' | 'unknown'> {
    // Try v2 first (more reliable with usernames)
    let status = await this.checkFollowStatusV2(accessToken, igUserId, contactUsername);

    // If v2 fails, fall back to v1
    if (status === 'unknown') {
      status = await this.checkFollowStatus(accessToken, igUserId, contactIgUserId);
    }

    return status;
  }
}

export const instagramService = new InstagramService();
