import { Request, Response } from 'express';
export declare const listInstagramAccounts: (req: Request, res: Response) => Promise<void>;
export declare const connectInstagram: (req: Request, res: Response) => Promise<void>;
export declare const disconnectInstagram: (req: Request, res: Response) => Promise<void>;
export declare const getInstagramAccount: (req: Request, res: Response) => Promise<void>;
export declare const refreshInstagramToken: (req: Request, res: Response) => Promise<void>;
export declare const syncInstagramAccount: (req: Request, res: Response) => Promise<void>;
export declare const testWebhook: (req: Request, res: Response) => Promise<void>;
export declare const registerWebhook: (req: Request, res: Response) => Promise<void>;
export declare const handleWebhookVerification: (req: Request, res: Response) => Promise<void>;
export declare const handleWebhookEvent: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=instagramController.d.ts.map