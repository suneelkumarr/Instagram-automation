import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, Workspace } from '../models/index.js';
import { config } from '../config/index.js';

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

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    req.user = {
      _id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      workspaceId: decoded.workspaceId,
    };

    // Load workspace if workspaceId header is present
    const workspaceId = req.headers['x-workspace-id'] as string || decoded.workspaceId;
    if (workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (workspace) {
        req.workspace = workspace;
      }
    }

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};

export const requireWorkspace = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.workspace) {
    res.status(403).json({ success: false, error: 'Workspace not selected or access denied' });
    return;
  }
  next();
};

export const requireMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user || !req.workspace) {
    res.status(403).json({ success: false, error: 'Access denied' });
    return;
  }

  const isOwner = req.workspace.ownerId.toString() === req.user._id;
  const isMember = req.workspace.memberIds.some(
    (id: any) => id.toString() === req.user!._id
  );

  if (!isOwner && !isMember) {
    res.status(403).json({ success: false, error: 'Not a member of this workspace' });
    return;
  }
  next();
};
