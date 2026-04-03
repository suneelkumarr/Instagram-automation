export declare const encryptToken: (text: string) => string;
export declare const decryptToken: (encryptedText: string) => string;
export declare const hashApiKey: (key: string) => string;
export declare const generateApiKey: () => {
    key: string;
    keyHash: string;
    keyPrefix: string;
};
//# sourceMappingURL=crypto.d.ts.map