import Stripe from 'stripe';
export declare class StripeService {
    private stripe;
    constructor();
    /**
     * Create a new customer
     */
    createCustomer(email: string, name: string, workspaceId: string): Promise<Stripe.Customer>;
    /**
     * Create a checkout session for subscription
     */
    createCheckoutSession(customerId: string, priceId: string, workspaceId: string, successUrl: string, cancelUrl: string): Promise<Stripe.Checkout.Session>;
    /**
     * Create billing portal session
     */
    createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session>;
    /**
     * Cancel subscription
     */
    cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
    /**
     * Update subscription plan
     */
    updateSubscription(subscriptionId: string, newPriceId: string): Promise<Stripe.Subscription>;
    /**
     * Handle webhook events
     */
    handleWebhookEvent(payload: string, signature: string): Promise<{
        type: string;
        data: Record<string, unknown>;
    }>;
    /**
     * Sync subscription from Stripe to our DB
     */
    private syncSubscription;
    private detectPlanFromPrice;
    private handleSubscriptionDeleted;
    private handlePaymentSuccess;
    private handlePaymentFailed;
    private handleCheckoutComplete;
    /**
     * Report usage for metered billing
     */
    reportUsage(subscriptionItemId: string, quantity: number): Promise<void>;
    /**
     * Get available plans
     */
    getPlans(): Record<string, {
        name: string;
        price: number;
        stripePriceId: string;
        features: string[];
    }>;
}
export declare const stripeService: StripeService;
//# sourceMappingURL=stripeService.d.ts.map