import Stripe from 'stripe';
import { config } from '../config/index.js';
import { Workspace, Subscription, User } from '../models/index.js';
import { Plan } from '@rsushop/shared';

const PLANS: Record<string, { name: string; price: number; stripePriceId: string; features: string[] }> = {
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

export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Create a new customer
   */
  async createCustomer(email: string, name: string, workspaceId: string): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      name,
      metadata: { workspaceId },
    });
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    customerId: string,
    priceId: string,
    workspaceId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
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
  async createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  /**
   * Update subscription plan
   */
  async updateSubscription(
    subscriptionId: string,
    newPriceId: string
  ): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.update(subscriptionId, {
      items: [{ price: newPriceId }],
      proration_behavior: 'create_prorations',
    });
  }

  /**
   * Handle webhook events
   */
  async handleWebhookEvent(
    payload: string,
    signature: string
  ): Promise<{ type: string; data: Record<string, unknown> }> {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );

    const object = event.data.object as Record<string, unknown>;

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
  private async syncSubscription(stripeSub: Record<string, unknown>): Promise<void> {
    const workspaceId = stripeSub.metadata?.workspaceId as string;
    if (!workspaceId) return;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return;

    const plan = this.detectPlanFromPrice(stripeSub.items as Stripe.SubscriptionItem[]);

    workspace.stripeSubscriptionId = stripeSub.id as string;
    workspace.syncLimitsFromPlan(plan);
    await workspace.save();

    // Update or create subscription record
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: stripeSub.id },
      {
        workspaceId: workspace._id,
        stripeCustomerId: stripeSub.customer as string,
        stripeSubscriptionId: stripeSub.id as string,
        stripePriceId: (stripeSub.items as { data: Array<{ price: { id: string } }> }).data[0]?.price?.id,
        plan,
        status: stripeSub.status as string,
        currentPeriodStart: new Date(stripeSub.current_period_start as number * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end as number * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end as boolean,
      },
      { upsert: true, new: true }
    );
  }

  private detectPlanFromPrice(items: Stripe.SubscriptionItem[]): Plan {
    const priceId = items.data[0]?.price?.id || '';
    for (const [planKey, plan] of Object.entries(PLANS)) {
      if (plan.stripePriceId === priceId) {
        return planKey as Plan;
      }
    }
    return 'starter';
  }

  private async handleSubscriptionDeleted(stripeSub: Record<string, unknown>): Promise<void> {
    const workspaceId = stripeSub.metadata?.workspaceId as string;
    if (!workspaceId) return;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return;

    // Downgrade to free
    workspace.plan = 'free';
    workspace.stripeSubscriptionId = undefined;
    workspace.syncLimitsFromPlan('free');
    await workspace.save();

    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: stripeSub.id },
      {
        status: 'canceled',
        cancelledAt: new Date(),
      }
    );
  }

  private async handlePaymentSuccess(invoice: Record<string, unknown>): Promise<void> {
    // Record successful payment - could send receipt email here
    console.log('Payment succeeded:', invoice.id);
  }

  private async handlePaymentFailed(invoice: Record<string, unknown>): Promise<void> {
    const customerId = invoice.customer as string;
    const workspace = await Workspace.findOne({ stripeCustomerId: customerId });
    if (!workspace) return;

    const sub = await Subscription.findOne({ stripeCustomerId: customerId });
    if (sub) {
      sub.status = 'past_due';
      await sub.save();
    }

    // Could trigger email notification here
    console.log('Payment failed for workspace:', workspace._id);
  }

  private async handleCheckoutComplete(session: Record<string, unknown>): Promise<void> {
    const workspaceId = session.metadata?.workspaceId as string;
    if (!workspaceId) return;

    console.log('Checkout completed for workspace:', workspaceId);
    // Additional onboarding actions could be triggered here
  }

  /**
   * Report usage for metered billing
   */
  async reportUsage(subscriptionItemId: string, quantity: number): Promise<void> {
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

export const stripeService = new StripeService();
