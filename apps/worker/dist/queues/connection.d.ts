export declare const config: {
    env: string;
    port: number;
    mongodb: {
        uri: string;
    };
    redis: {
        host: string;
        port: number;
        password: string | undefined;
    };
    instagram: {
        appId: string;
        appSecret: string;
        apiVersion: string;
        graphApiBase: string;
    };
    openai: {
        apiKey: string;
        model: string;
    };
};
export default config;
