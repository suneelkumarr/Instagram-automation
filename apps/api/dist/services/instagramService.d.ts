interface InstagramError {
    error?: {
        message?: string;
        type?: string;
        code?: number;
        fbtrace_id?: string;
    };
}
export declare class RateLimitError extends Error {
    retryAfter?: number;
    constructor(error: InstagramError);
}
export declare class InstagramAPIError extends Error {
    code?: number;
    type?: string;
    fbtrace_id?: string;
    constructor(error: InstagramError);
}
export declare class InstagramService {
    private baseUrl;
    /**
     * Exchange authorization code for access token
     */
    exchangeCodeForToken(code: string, redirectUri: string): Promise<{
        accessToken: string;
        instagramAccountId: string;
        expiresIn: number;
    }>;
    /**
     * Get long-lived access token (valid for 60 days)
     */
    getLongLivedToken(shortLivedToken: string): Promise<{
        accessToken: string;
        expiresIn: number;
    }>;
    /**
     * Refresh access token
     */
    refreshAccessToken(accountId: string): Promise<string>;
    /**
     * Get Instagram account info
     */
    getAccountInfo(accessToken: string, instagramId: string): Promise<Record<string, unknown>>;
    /**
     * Send direct message
     */
    sendMessage(accessToken: string, igUserId: string, recipientId: string, message: {
        text?: string;
        mediaUrl?: string;
        quickReplies?: Array<{
            title: string;
            payload: string;
        }>;
    }): Promise<{
        messageId: string;
    }>;
    /**
     * Upload media for message
     */
    private uploadMedia;
    /**
     * Get recent comments on a post
     */
    getComments(accessToken: string, igUserId: string, mediaId: string, fields?: string): Promise<Array<Record<string, unknown>>>;
    /**
     * Reply to a comment
     */
    replyToComment(accessToken: string, igUserId: string, commentId: string, message: string): Promise<{
        id: string;
    }>;
    /**
     * Get incoming messages from DM inbox
     */
    getMessages(accessToken: string, igUserId: string, threadId: string): Promise<Array<Record<string, unknown>>>;
    /**
     * Register webhook for Instagram events
     */
    registerWebhook(accessToken: string, igUserId: string, webhookUrl: string, verifyToken: string): Promise<boolean>;
    /**
     * Check if a user follows the business account
     * Uses the Instagram Graph API to check relationship status
     */
    checkFollowStatus(accessToken: string, igUserId: string, targetUserId: string): Promise<'following' | 'not_following' | 'requested' | 'unknown'>;
    /**
     * Check follow status using the newer relationships endpoint
     * More reliable approach using IG Story mentions or direct API
     */
    checkFollowStatusV2(accessToken: string, igUserId: string, targetUsername: string): Promise<'following' | 'not_following' | 'requested' | 'unknown'>;
    /**
     * Refresh contact follow status from Instagram API
     * Called when processing inbound DMs or comments
     */
    refreshContactFollowStatus(accessToken: string, igUserId: string, contactIgUserId: string, contactUsername: string): Promise<'following' | 'not_following' | 'requested' | 'unknown'>;
}
export declare const instagramService: InstagramService;
export {};
//# sourceMappingURL=instagramService.d.ts.map