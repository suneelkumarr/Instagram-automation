"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeService = exports.StripeService = void 0;
const stripe_1 = __importDefault(require("stripe"));
const index_js_1 = require("../config/index.js");
const index_js_2 = require("../models/index.js");
const PLANS = {
    starter: {
        name: 'Starter',
        price: 29,
        stripePriceId: process.env.STRIPE_PRICE_STARTER || 'price_starter',
        features: ['3 Instagram accounts', '5,000 contacts', '20 automations', '10K messages/mo', 'AI Agent'],
    },
    pro: {
        name: 'Pro',
        price: 79,
        stripePriceId: process.env.STRIPE_PRICE_PRO || 'price_pro',
        features: ['10 Instagram accounts', '50K contacts', '100 automations', '100K messages/mo', 'API Access', 'Priority Support'],
    },
    agency: {
        name: 'Agency',
        price: 199,
        stripePriceId: process.env.STRIPE_PRICE_AGENCY || 'price_agency',
        features: ['Unlimited IG accounts', '500K contacts', 'Unlimited automations', '1M messages/mo', 'White Label', 'Custom Domain', '50 team members'],
    },
};
class StripeService {
    stripe;
    constructor() {
        this.stripe = new stripe_1.default(index_js_1.config.stripe.secretKey, {
            apiVersion: '2023-10-16',
        });
    }
    /**
     * Create a new customer
     */
    async createCustomer(email, name, workspaceId) {
        return this.stripe.customers.create({
            email,
            name,
            metadata: { workspaceId },
        });
    }
    /**
     * Create a checkout session for subscription
     */
    async createCheckoutSession(customerId, priceId, workspaceId, successUrl, cancelUrl) {
        return this.stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { workspaceId },
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
        });
    }
    /**
     * Create billing portal session
     */
    async createPortalSession(customerId, returnUrl) {
        return this.stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });
    }
    /**
     * Cancel subscription
     */
    async cancelSubscription(subscriptionId) {
        return this.stripe.subscriptions.cancel(subscriptionId);
    }
    /**
     * Update subscription plan
     */
    async updateSubscription(subscriptionId, newPriceId) {
        return this.stripe.subscriptions.update(subscriptionId, {
            items: [{ price: newPriceId }],
            proration_behavior: 'create_prorations',
        });
    }
    /**
     * Handle webhook events
     */
    async handleWebhookEvent(payload, signature) {
        const event = this.stripe.webhooks.constructEvent(payload, signature, index_js_1.config.stripe.webhookSecret);
        const object = event.data.object;
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                await this.syncSubscription(object);
                break;
            }
            case 'customer.subscription.deleted': {
                await this.handleSubscriptionDeleted(object);
                break;
            }
            case 'invoice.payment_succeeded': {
                await this.handlePaymentSuccess(object);
                break;
            }
            case 'invoice.payment_failed': {
                await this.handlePaymentFailed(object);
                break;
            }
            case 'checkout.session.completed': {
                await this.handleCheckoutComplete(object);
                break;
            }
        }
        return { type: event.type, data: object };
    }
    /**
     * Sync subscription from Stripe to our DB
     */
    async syncSubscription(stripeSub) {
        const workspaceId = stripeSub.metadata?.workspaceId;
        if (!workspaceId)
            return;
        const workspace = await index_js_2.Workspace.findById(workspaceId);
        if (!workspace)
            return;
        const plan = this.detectPlanFromPrice(stripeSub.items);
        workspace.stripeSubscriptionId = stripeSub.id;
        workspace.syncLimitsFromPlan(plan);
        await workspace.save();
        // Update or create subscription record
        await index_js_2.Subscription.findOneAndUpdate({ stripeSubscriptionId: stripeSub.id }, {
            workspaceId: workspace._id,
            stripeCustomerId: stripeSub.customer,
            stripeSubscriptionId: stripeSub.id,
            stripePriceId: stripeSub.items.data[0]?.price?.id,
            plan,
            status: stripeSub.status,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        }, { upsert: true, new: true });
    }
    detectPlanFromPrice(items) {
        const priceId = items.data[0]?.price?.id || '';
        for (const [planKey, plan] of Object.entries(PLANS)) {
            if (plan.stripePriceId === priceId) {
                return planKey;
            }
        }
        return 'starter';
    }
    async handleSubscriptionDeleted(stripeSub) {
        const workspaceId = stripeSub.metadata?.workspaceId;
        if (!workspaceId)
            return;
        const workspace = await index_js_2.Workspace.findById(workspaceId);
        if (!workspace)
            return;
        // Downgrade to free
        workspace.plan = 'free';
        workspace.stripeSubscriptionId = undefined;
        workspace.syncLimitsFromPlan('free');
        await workspace.save();
        await index_js_2.Subscription.findOneAndUpdate({ stripeSubscriptionId: stripeSub.id }, {
            status: 'canceled',
            cancelledAt: new Date(),
        });
    }
    async handlePaymentSuccess(invoice) {
        // Record successful payment - could send receipt email here
        console.log('Payment succeeded:', invoice.id);
    }
    async handlePaymentFailed(invoice) {
        const customerId = invoice.customer;
        const workspace = await index_js_2.Workspace.findOne({ stripeCustomerId: customerId });
        if (!workspace)
            return;
        const sub = await index_js_2.Subscription.findOne({ stripeCustomerId: customerId });
        if (sub) {
            sub.status = 'past_due';
            await sub.save();
        }
        // Could trigger email notification here
        console.log('Payment failed for workspace:', workspace._id);
    }
    async handleCheckoutComplete(session) {
        const workspaceId = session.metadata?.workspaceId;
        if (!workspaceId)
            return;
        console.log('Checkout completed for workspace:', workspaceId);
        // Additional onboarding actions could be triggered here
    }
    /**
     * Report usage for metered billing
     */
    async reportUsage(subscriptionItemId, quantity) {
        await this.stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
            quantity,
            timestamp: Math.floor(Date.now() / 1000),
        });
    }
    /**
     * Get available plans
     */
    getPlans() {
        return PLANS;
    }
}
exports.StripeService = StripeService;
exports.stripeService = new StripeService();
//# sourceMappingURL=stripeService.js.map