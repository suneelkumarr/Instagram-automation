"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMe = exports.getMe = exports.refreshToken = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
const index_js_2 = require("../models/index.js");
const pagination_js_1 = require("../utils/pagination.js");
const generateTokens = (userId, workspaceId) => {
    const payload = { userId, email: '', workspaceId };
    const accessToken = jsonwebtoken_1.default.sign(payload, index_js_1.config.jwt.secret, {
        expiresIn: index_js_1.config.jwt.accessExpiresIn,
    });
    const refreshToken = jsonwebtoken_1.default.sign({ userId, type: 'refresh' }, index_js_1.config.jwt.secret, { expiresIn: index_js_1.config.jwt.refreshExpiresIn });
    return { accessToken, refreshToken };
};
const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, workspaceName, ref } = req.body;
        // Check if user exists
        const existingUser = await index_js_2.User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            (0, pagination_js_1.sendError)(res, 'Email already registered', 409);
            return;
        }
        // Create user
        const user = new index_js_2.User({
            email: email.toLowerCase(),
            passwordHash: password, // Will be hashed by pre-save hook
            firstName,
            lastName,
        });
        // Handle referral
        if (ref) {
            const referrer = await index_js_2.User.findOne({ affiliateCode: ref });
            if (referrer) {
                user.referrerId = referrer._id;
            }
        }
        await user.save();
        // Create default workspace
        const workspace = new index_js_2.Workspace({
            name: workspaceName || `${firstName}'s Workspace`,
            slug: `${firstName.toLowerCase()}-${Date.now().toString(36)}`,
            ownerId: user._id,
            memberIds: [user._id],
        });
        await workspace.save();
        // Create affiliate record
        const affiliate = new index_js_2.Affiliate({
            userId: user._id,
            code: user.affiliateCode,
        });
        await affiliate.save();
        // Generate tokens
        const tokens = generateTokens(user._id.toString(), workspace._id.toString());
        (0, pagination_js_1.sendSuccess)(res, {
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                affiliateCode: user.affiliateCode,
            },
            workspace: {
                id: workspace._id,
                name: workspace.name,
                slug: workspace.slug,
                plan: workspace.plan,
            },
            ...tokens,
        }, 201);
    }
    catch (error) {
        console.error('Register error:', error);
        (0, pagination_js_1.sendError)(res, 'Registration failed');
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await index_js_2.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            (0, pagination_js_1.sendError)(res, 'Invalid email or password', 401);
            return;
        }
        const isValid = await user.comparePassword(password);
        if (!isValid) {
            (0, pagination_js_1.sendError)(res, 'Invalid email or password', 401);
            return;
        }
        // Update last login
        user.lastLoginAt = new Date();
        await user.save();
        // Get default workspace
        const workspace = await index_js_2.Workspace.findOne({ ownerId: user._id });
        if (!workspace) {
            (0, pagination_js_1.sendError)(res, 'No workspace found', 500);
            return;
        }
        const tokens = generateTokens(user._id.toString(), workspace._id.toString());
        (0, pagination_js_1.sendSuccess)(res, {
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                affiliateCode: user.affiliateCode,
            },
            workspace: {
                id: workspace._id,
                name: workspace.name,
                slug: workspace.slug,
                plan: workspace.plan,
                usage: workspace.usage,
                limits: workspace.limits,
            },
            ...tokens,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        (0, pagination_js_1.sendError)(res, 'Login failed');
    }
};
exports.login = login;
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            (0, pagination_js_1.sendError)(res, 'Refresh token required', 401);
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(refreshToken, index_js_1.config.jwt.secret);
        if (decoded.type !== 'refresh') {
            (0, pagination_js_1.sendError)(res, 'Invalid token type', 401);
            return;
        }
        const user = await index_js_2.User.findById(decoded.userId);
        if (!user) {
            (0, pagination_js_1.sendError)(res, 'User not found', 401);
            return;
        }
        const workspace = await index_js_2.Workspace.findOne({ ownerId: user._id });
        const tokens = generateTokens(user._id.toString(), workspace?._id.toString());
        (0, pagination_js_1.sendSuccess)(res, tokens);
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            (0, pagination_js_1.sendError)(res, 'Refresh token expired', 401);
            return;
        }
        (0, pagination_js_1.sendError)(res, 'Invalid refresh token', 401);
    }
};
exports.refreshToken = refreshToken;
const getMe = async (req, res) => {
    try {
        const user = await index_js_2.User.findById(req.user?._id);
        if (!user) {
            (0, pagination_js_1.sendError)(res, 'User not found', 404);
            return;
        }
        const workspaces = await index_js_2.Workspace.find({
            $or: [{ ownerId: user._id }, { memberIds: user._id }],
        });
        (0, pagination_js_1.sendSuccess)(res, {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            settings: user.settings,
            affiliateCode: user.affiliateCode,
            workspaces: workspaces.map((w) => ({
                id: w._id,
                name: w.name,
                slug: w.slug,
                plan: w.plan,
                role: w.ownerId.toString() === user._id.toString() ? 'owner' : 'member',
            })),
        });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to get user');
    }
};
exports.getMe = getMe;
const updateMe = async (req, res) => {
    try {
        const { firstName, lastName, settings } = req.body;
        const user = await index_js_2.User.findById(req.user?._id);
        if (!user) {
            (0, pagination_js_1.sendError)(res, 'User not found', 404);
            return;
        }
        if (firstName)
            user.firstName = firstName;
        if (lastName)
            user.lastName = lastName;
        if (settings) {
            user.settings = { ...user.settings, ...settings };
        }
        await user.save();
        (0, pagination_js_1.sendSuccess)(res, {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            settings: user.settings,
        });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to update profile');
    }
};
exports.updateMe = updateMe;
//# sourceMappingURL=authController.js.map