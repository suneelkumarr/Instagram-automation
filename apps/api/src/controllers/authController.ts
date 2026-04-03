import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User, Workspace, Affiliate } from '../models/index.js';
import { sendSuccess, sendError } from '../utils/pagination.js';

const generateTokens = (userId: string, workspaceId?: string) => {
  const payload = { userId, email: '', workspaceId };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn,
  });

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, workspaceName, ref } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      sendError(res, 'Email already registered', 409);
      return;
    }

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      passwordHash: password, // Will be hashed by pre-save hook
      firstName,
      lastName,
    });

    // Handle referral
    if (ref) {
      const referrer = await User.findOne({ affiliateCode: ref });
      if (referrer) {
        user.referrerId = referrer._id;
      }
    }

    await user.save();

    // Create default workspace
    const workspace = new Workspace({
      name: workspaceName || `${firstName}'s Workspace`,
      slug: `${firstName.toLowerCase()}-${Date.now().toString(36)}`,
      ownerId: user._id,
      memberIds: [user._id],
    });
    await workspace.save();

    // Create affiliate record
    const affiliate = new Affiliate({
      userId: user._id,
      code: user.affiliateCode,
    });
    await affiliate.save();

    // Generate tokens
    const tokens = generateTokens(user._id.toString(), workspace._id.toString());

    sendSuccess(res, {
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
  } catch (error) {
    console.error('Register error:', error);
    sendError(res, 'Registration failed');
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Get default workspace
    const workspace = await Workspace.findOne({ ownerId: user._id });
    if (!workspace) {
      sendError(res, 'No workspace found', 500);
      return;
    }

    const tokens = generateTokens(user._id.toString(), workspace._id.toString());

    sendSuccess(res, {
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
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'Login failed');
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      sendError(res, 'Refresh token required', 401);
      return;
    }

    const decoded = jwt.verify(refreshToken, config.jwt.secret) as {
      userId: string;
      type: string;
    };

    if (decoded.type !== 'refresh') {
      sendError(res, 'Invalid token type', 401);
      return;
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      sendError(res, 'User not found', 401);
      return;
    }

    const workspace = await Workspace.findOne({ ownerId: user._id });
    const tokens = generateTokens(user._id.toString(), workspace?._id.toString());

    sendSuccess(res, tokens);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, 'Refresh token expired', 401);
      return;
    }
    sendError(res, 'Invalid refresh token', 401);
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const workspaces = await Workspace.find({
      $or: [{ ownerId: user._id }, { memberIds: user._id }],
    });

    sendSuccess(res, {
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
  } catch (error) {
    sendError(res, 'Failed to get user');
  }
};

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, settings } = req.body;

    const user = await User.findById(req.user?._id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (settings) {
      user.settings = { ...user.settings, ...settings };
    }

    await user.save();

    sendSuccess(res, {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      settings: user.settings,
    });
  } catch (error) {
    sendError(res, 'Failed to update profile');
  }
};
