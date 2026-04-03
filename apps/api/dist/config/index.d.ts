export declare const config: {
    env: string;
    port: number;
    jwt: {
        secret: string;
        accessExpiresIn: string;
        refreshExpiresIn: string;
    };
    instagram: {
        appId: string;
        appSecret: string;
        apiVersion: string;
        graphApiBase: string;
        webhookVerifyToken: string;
    };
    openai: {
        apiKey: string;
        baseURL: string;
        model: string;
        fallbackApiKey: string;
        fallbackModel: string;
        maxTokens: number;
        temperature: number;
    };
    stripe: {
        secretKey: string;
        webhookSecret: string;
        publishableKey: string;
    };
    rateLimit: {
        windowMs: number;
        max: number;
        authMax: number;
    };
    queue: {
        redis: {
            host: string;
            port: number;
            password: string | undefined;
        };
    };
    cors: {
        origin: string;
        credentials: boolean;
    };
};
//# sourceMappingURL=index.d.ts.map