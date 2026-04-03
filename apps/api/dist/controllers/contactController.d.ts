import { Request, Response } from 'express';
export declare const listContacts: (req: Request, res: Response) => Promise<void>;
export declare const getContact: (req: Request, res: Response) => Promise<void>;
export declare const updateContact: (req: Request, res: Response) => Promise<void>;
export declare const deleteContact: (req: Request, res: Response) => Promise<void>;
export declare const addTag: (req: Request, res: Response) => Promise<void>;
export declare const removeTag: (req: Request, res: Response) => Promise<void>;
export declare const addToList: (req: Request, res: Response) => Promise<void>;
export declare const removeFromList: (req: Request, res: Response) => Promise<void>;
export declare const importContacts: (req: Request, res: Response) => Promise<void>;
export declare const exportContacts: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=contactController.d.ts.map