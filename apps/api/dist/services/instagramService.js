"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instagramService = exports.InstagramService = exports.InstagramAPIError = exports.RateLimitError = void 0;
const index_js_1 = require("../config/index.js");
const index_js_2 = require("../models/index.js");
const { graphApiBase, apiVersion } = index_js_1.config.instagram;
class RateLimitError extends Error {
    retryAfter;
    constructor(error) {
        super(error?.error?.message || 'Instagram API rate limit exceeded');
        this.name = 'RateLimitError';
        this.retryAfter = 60; // seconds
    }
}
exports.RateLimitError = RateLimitError;
class InstagramAPIError extends Error {
    code;
    type;
    fbtrace_id;
    constructor(error) {
        super(error?.error?.message || 'Instagram API error');
        this.name = 'InstagramAPIError';
        this.code = error?.error?.code;
        this.type = error?.error?.type;
        this.fbtrace_id = error?.error?.fbtrace_id;
    }
}
exports.InstagramAPIError = InstagramAPIError;
class InstagramService {
    baseUrl = `${graphApiBase}/${apiVersion}`;
    /**
     * Exchange authorization code for access token
     */
    async exchangeCodeForToken(code, redirectUri) {
        const url = `${graphApiBase}/oauth/access_token`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: index_js_1.config.instagram.appId,
                client_secret: index_js_1.config.instagram.appSecret,
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
        const accountsResponse = await fetch(`${this.baseUrl}/me/accounts?access_token=${data.access_token}`);
        const accountsData = await accountsResponse.json();
        const pageId = accountsData.data?.[0]?.id;
        if (!pageId) {
            throw new Error('No Facebook Page found');
        }
        // Get linked Instagram account
        const igResponse = await fetch(`${this.baseUrl}/${pageId}?fields=instagram_business_account&access_token=${data.access_token}`);
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
    async getLongLivedToken(shortLivedToken) {
        const url = `${graphApiBase}/oauth/access_token?grant_type=fb_exchange_token&client_id=${index_js_1.config.instagram.appId}&client_secret=${index_js_1.config.instagram.appSecret}&fb_exchange_token=${shortLivedToken}`;
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
    async refreshAccessToken(accountId) {
        const account = await index_js_2.InstagramAccount.findById(accountId);
        if (!account)
            throw new Error('Account not found');
        const token = account.getDecryptedToken();
        const url = `${graphApiBase}/oauth/access_token?grant_type=fb_exchange_token&client_id=${index_js_1.config.instagram.appId}&client_secret=${index_js_1.config.instagram.appSecret}&fb_exchange_token=${token}`;
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
    async getAccountInfo(accessToken, instagramId) {
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
    async sendMessage(accessToken, igUserId, recipientId, message) {
        const url = `${this.baseUrl}/${igUserId}/messages`;
        const payload = {
            recipient: { id: recipientId },
            message: { text: message.text },
        };
        // Add media if provided
        if (message.mediaUrl) {
            // First upload media to get reusable ID
            const mediaId = await this.uploadMedia(accessToken, igUserId, message.mediaUrl);
            payload.message.attachment = {
                type: 'image',
                payload: { url: message.mediaUrl, is_reusable: true },
            };
        }
        // Add quick replies if provided
        if (message.quickReplies && message.quickReplies.length > 0) {
            payload.message.quick_replies = message.quickReplies.slice(0, 13).map((qr) => ({
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
    async uploadMedia(accessToken, igUserId, mediaUrl) {
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
    async getComments(accessToken, igUserId, mediaId, fields = 'id,text,username,timestamp,from,replies{id,text,username,timestamp}') {
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
    async replyToComment(accessToken, igUserId, commentId, message) {
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
    async getMessages(accessToken, igUserId, threadId) {
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
    async registerWebhook(accessToken, igUserId, webhookUrl, verifyToken) {
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
    async checkFollowStatus(accessToken, igUserId, targetUserId) {
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
            const isFollowing = followers.some((f) => f.id === targetUserId);
            return isFollowing ? 'following' : 'not_following';
        }
        catch (error) {
            console.error('Error checking follow status:', error);
            return 'unknown';
        }
    }
    /**
     * Check follow status using the newer relationships endpoint
     * More reliable approach using IG Story mentions or direct API
     */
    async checkFollowStatusV2(accessToken, igUserId, targetUsername) {
        // First get the IG user ID for the target username
        const searchUrl = `${this.baseUrl}/${igUserId}/igds_search?search_surface=reels_viewer&query=${encodeURIComponent(targetUsername)}&access_token=${accessToken}`;
        try {
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();
            if (!searchResponse.ok || !searchData.users?.length) {
                return 'unknown';
            }
            const targetUser = searchData.users.find((u) => u.username?.toLowerCase() === targetUsername.toLowerCase());
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
                const found = followersData.data.some((u) => u.id === targetIgId);
                return found ? 'following' : 'not_following';
            }
            return 'unknown';
        }
        catch (error) {
            console.error('Error checking follow status v2:', error);
            return 'unknown';
        }
    }
    /**
     * Refresh contact follow status from Instagram API
     * Called when processing inbound DMs or comments
     */
    async refreshContactFollowStatus(accessToken, igUserId, contactIgUserId, contactUsername) {
        // Try v2 first (more reliable with usernames)
        let status = await this.checkFollowStatusV2(accessToken, igUserId, contactUsername);
        // If v2 fails, fall back to v1
        if (status === 'unknown') {
            status = await this.checkFollowStatus(accessToken, igUserId, contactIgUserId);
        }
        return status;
    }
}
exports.InstagramService = InstagramService;
exports.instagramService = new InstagramService();
//# sourceMappingURL=instagramService.js.map