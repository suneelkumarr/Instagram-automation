import { Request, Response, NextFunction } from 'express';
import { Workspace } from '../models/index.js';
export interface JWTPayload {
    userId: string;
    email: string;
    workspaceId?: string;
}
declare global {
    namespace Express {
        interface Request {
            user?: {
                _id: string;
                email: string;
                firstName: string;
                lastName: string;
                workspaceId?: string;
            };
            workspace?: InstanceType<typeof Workspace>;
        }
    }
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireWorkspace: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireMember: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map