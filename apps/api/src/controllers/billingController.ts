import { Request, Response } from 'express';
import { stripeService } from '../services/stripeService.js';
import { sendSuccess, sendError } from '../utils/pagination.js';
import { Workspace } from '../models/index.js';

export const getPlans = async (req: Request, res: Response): Promise<void> => {
  const plans = stripeService.getPlans();
  sendSuccess(res, plans);
};

export const getCurrentPlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspace = req.workspace;
    if (!workspace) {
      sendError(res, 'Workspace not found', 404);
      return;
    }

    sendSuccess(res, {
      plan: workspace.plan,
      billingCycle: workspace.billingCycle,
      limits: workspace.limits,
      usage: workspace.usage,
      stripeSubscriptionId: workspace.stripeSubscriptionId,
      features: workspace.features,
      resetAt: workspace.usage.resetAt,
    });
  } catch (error) {
    sendError(res, 'Failed to get current plan');
  }
};

export const subscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { priceId, paymentMethodId } = req.body;
    const workspace = req.workspace!;

    if (!workspace.stripeCustomerId) {
      // Create Stripe customer
      const user = await (await import('../models/index.js')).User.findById(workspace.ownerId);
      if (!user) {
        sendError(res, 'User not found', 404);
        return;
      }

      const customer = await stripeService.createCustomer(
        user.email,
        `${user.firstName} ${user.lastName}`,
        workspace._id.toString()
      );

      workspace.stripeCustomerId = customer.id;
      await workspace.save();
    }

    const origin = req.headers.origin || 'http://localhost:3000';
    const session = await stripeService.createCheckoutSession(
      workspace.stripeCustomerId,
      priceId,
      workspace._id.toString(),
      `${origin}/dashboard/billing?success=true`,
      `${origin}/dashboard/billing?canceled=true`
    );

    sendSuccess(res, { sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Subscribe error:', error);
    sendError(res, `Failed to create subscription: ${(error as Error).message}`);
  }
};

export const upgrade = async (req: Request, res: Response): Promise<void> => {
  try {
    const { newPriceId } = req.body;
    const workspace = req.workspace!;

    if (!workspace.stripeSubscriptionId) {
      sendError(res, 'No active subscription to upgrade', 400);
      return;
    }

    const subscription = await stripeService.updateSubscription(
      workspace.stripeSubscriptionId,
      newPriceId
    );

    sendSuccess(res, { subscriptionId: subscription.id });
  } catch (error) {
    sendError(res, 'Failed to upgrade plan');
  }
};

export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspace = req.workspace!;

    if (!workspace.stripeSubscriptionId) {
      sendError(res, 'No active subscription to cancel', 400);
      return;
    }

    await stripeService.cancelSubscription(workspace.stripeSubscriptionId);

    sendSuccess(res, { canceled: true, effectiveAt: 'end_of_period' });
  } catch (error) {
    sendError(res, 'Failed to cancel subscription');
  }
};

export const getUsage = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspace = req.workspace!;

    const overage = {
      messages: {
        used: workspace.usage.monthlyMessages,
        limit: workspace.limits.monthlyMessages,
        percent: workspace.limits.monthlyMessages === Infinity
          ? 0
          : ((workspace.usage.monthlyMessages / workspace.limits.monthlyMessages) * 100).toFixed(1),
        hasOverage: workspace.usage.monthlyMessages > workspace.limits.monthlyMessages,
      },
      contacts: {
        used: workspace.usage.contacts,
        limit: workspace.limits.contacts,
        percent: workspace.limits.contacts === Infinity
          ? 0
          : ((workspace.usage.contacts / workspace.limits.contacts) * 100).toFixed(1),
        hasOverage: workspace.usage.contacts > workspace.limits.contacts,
      },
      aiCredits: {
        used: workspace.usage.aiCredits,
        limit: workspace.limits.aiCredits,
        percent: workspace.limits.aiCredits === Infinity
          ? 0
          : ((workspace.usage.aiCredits / workspace.limits.aiCredits) * 100).toFixed(1),
        hasOverage: workspace.usage.aiCredits > workspace.limits.aiCredits,
      },
    };

    sendSuccess(res, {
      ...overage,
      resetAt: workspace.usage.resetAt,
      plan: workspace.plan,
    });
  } catch (error) {
    sendError(res, 'Failed to get usage');
  }
};

export const getBillingPortal = async (req: Request, res: Response): Promise<void> => {
  try {
    const workspace = req.workspace!;

    if (!workspace.stripeCustomerId) {
      sendError(res, 'No billing account found', 400);
      return;
    }

    const origin = req.headers.origin || 'http://localhost:3000';
    const session = await stripeService.createPortalSession(
      workspace.stripeCustomerId,
      `${origin}/dashboard/billing`
    );

    sendSuccess(res, { url: session.url });
  } catch (error) {
    sendError(res, 'Failed to get billing portal');
  }
};
