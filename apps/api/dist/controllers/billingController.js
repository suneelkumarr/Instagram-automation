"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBillingPortal = exports.getUsage = exports.cancelSubscription = exports.upgrade = exports.subscribe = exports.getCurrentPlan = exports.getPlans = void 0;
const stripeService_js_1 = require("../services/stripeService.js");
const pagination_js_1 = require("../utils/pagination.js");
const getPlans = async (req, res) => {
    const plans = stripeService_js_1.stripeService.getPlans();
    (0, pagination_js_1.sendSuccess)(res, plans);
};
exports.getPlans = getPlans;
const getCurrentPlan = async (req, res) => {
    try {
        const workspace = req.workspace;
        if (!workspace) {
            (0, pagination_js_1.sendError)(res, 'Workspace not found', 404);
            return;
        }
        (0, pagination_js_1.sendSuccess)(res, {
            plan: workspace.plan,
            billingCycle: workspace.billingCycle,
            limits: workspace.limits,
            usage: workspace.usage,
            stripeSubscriptionId: workspace.stripeSubscriptionId,
            features: workspace.features,
            resetAt: workspace.usage.resetAt,
        });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to get current plan');
    }
};
exports.getCurrentPlan = getCurrentPlan;
const subscribe = async (req, res) => {
    try {
        const { priceId, paymentMethodId } = req.body;
        const workspace = req.workspace;
        if (!workspace.stripeCustomerId) {
            // Create Stripe customer
            const user = await (await import('../models/index.js')).User.findById(workspace.ownerId);
            if (!user) {
                (0, pagination_js_1.sendError)(res, 'User not found', 404);
                return;
            }
            const customer = await stripeService_js_1.stripeService.createCustomer(user.email, `${user.firstName} ${user.lastName}`, workspace._id.toString());
            workspace.stripeCustomerId = customer.id;
            await workspace.save();
        }
        const origin = req.headers.origin || 'http://localhost:3000';
        const session = await stripeService_js_1.stripeService.createCheckoutSession(workspace.stripeCustomerId, priceId, workspace._id.toString(), `${origin}/dashboard/billing?success=true`, `${origin}/dashboard/billing?canceled=true`);
        (0, pagination_js_1.sendSuccess)(res, { sessionId: session.id, url: session.url });
    }
    catch (error) {
        console.error('Subscribe error:', error);
        (0, pagination_js_1.sendError)(res, `Failed to create subscription: ${error.message}`);
    }
};
exports.subscribe = subscribe;
const upgrade = async (req, res) => {
    try {
        const { newPriceId } = req.body;
        const workspace = req.workspace;
        if (!workspace.stripeSubscriptionId) {
            (0, pagination_js_1.sendError)(res, 'No active subscription to upgrade', 400);
            return;
        }
        const subscription = await stripeService_js_1.stripeService.updateSubscription(workspace.stripeSubscriptionId, newPriceId);
        (0, pagination_js_1.sendSuccess)(res, { subscriptionId: subscription.id });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to upgrade plan');
    }
};
exports.upgrade = upgrade;
const cancelSubscription = async (req, res) => {
    try {
        const workspace = req.workspace;
        if (!workspace.stripeSubscriptionId) {
            (0, pagination_js_1.sendError)(res, 'No active subscription to cancel', 400);
            return;
        }
        await stripeService_js_1.stripeService.cancelSubscription(workspace.stripeSubscriptionId);
        (0, pagination_js_1.sendSuccess)(res, { canceled: true, effectiveAt: 'end_of_period' });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to cancel subscription');
    }
};
exports.cancelSubscription = cancelSubscription;
const getUsage = async (req, res) => {
    try {
        const workspace = req.workspace;
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
        (0, pagination_js_1.sendSuccess)(res, {
            ...overage,
            resetAt: workspace.usage.resetAt,
            plan: workspace.plan,
        });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to get usage');
    }
};
exports.getUsage = getUsage;
const getBillingPortal = async (req, res) => {
    try {
        const workspace = req.workspace;
        if (!workspace.stripeCustomerId) {
            (0, pagination_js_1.sendError)(res, 'No billing account found', 400);
            return;
        }
        const origin = req.headers.origin || 'http://localhost:3000';
        const session = await stripeService_js_1.stripeService.createPortalSession(workspace.stripeCustomerId, `${origin}/dashboard/billing`);
        (0, pagination_js_1.sendSuccess)(res, { url: session.url });
    }
    catch (error) {
        (0, pagination_js_1.sendError)(res, 'Failed to get billing portal');
    }
};
exports.getBillingPortal = getBillingPortal;
//# sourceMappingURL=billingController.js.map