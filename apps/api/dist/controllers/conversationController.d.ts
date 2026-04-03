import { Request, Response } from 'express';
export declare const listConversations: (req: Request, res: Response) => Promise<void>;
export declare const getConversation: (req: Request, res: Response) => Promise<void>;
export declare const updateConversation: (req: Request, res: Response) => Promise<void>;
export declare const closeConversation: (req: Request, res: Response) => Promise<void>;
export declare const reopenConversation: (req: Request, res: Response) => Promise<void>;
export declare const sendMessage: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=conversationController.d.ts.map