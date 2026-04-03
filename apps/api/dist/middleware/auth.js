"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireMember = exports.requireWorkspace = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../models/index.js");
const index_js_2 = require("../config/index.js");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({ success: false, error: 'No token provided' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, index_js_2.config.jwt.secret);
        const user = await index_js_1.User.findById(decoded.userId).lean();
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
        const workspaceId = req.headers['x-workspace-id'] || decoded.workspaceId;
        if (workspaceId) {
            const workspace = await index_js_1.Workspace.findById(workspaceId);
            if (workspace) {
                req.workspace = workspace;
            }
        }
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({ success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' });
            return;
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({ success: false, error: 'Invalid token' });
            return;
        }
        res.status(500).json({ success: false, error: 'Authentication failed' });
    }
};
exports.authenticate = authenticate;
const requireWorkspace = (req, res, next) => {
    if (!req.workspace) {
        res.status(403).json({ success: false, error: 'Workspace not selected or access denied' });
        return;
    }
    next();
};
exports.requireWorkspace = requireWorkspace;
const requireMember = async (req, res, next) => {
    if (!req.user || !req.workspace) {
        res.status(403).json({ success: false, error: 'Access denied' });
        return;
    }
    const isOwner = req.workspace.ownerId.toString() === req.user._id;
    const isMember = req.workspace.memberIds.some((id) => id.toString() === req.user._id);
    if (!isOwner && !isMember) {
        res.status(403).json({ success: false, error: 'Not a member of this workspace' });
        return;
    }
    next();
};
exports.requireMember = requireMember;
//# sourceMappingURL=auth.js.map