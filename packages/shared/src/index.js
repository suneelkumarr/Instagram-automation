"use strict";
// Shared types for RsuShop platform
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLANS = exports.PLAN_LIMITS = void 0;
exports.PLAN_LIMITS = {
    free: {
        instagramAccounts: 1,
        contacts: 100,
        automations: 3,
        monthlyMessages: 500,
        aiCredits: 50,
        teamMembers: 1,
    },
    starter: {
        instagramAccounts: 3,
        contacts: 5000,
        automations: 20,
        monthlyMessages: 10000,
        aiCredits: 500,
        teamMembers: 3,
    },
    pro: {
        instagramAccounts: 10,
        contacts: 50000,
        automations: 100,
        monthlyMessages: 100000,
        aiCredits: 5000,
        teamMembers: 10,
    },
    agency: {
        instagramAccounts: Infinity,
        contacts: 500000,
        automations: Infinity,
        monthlyMessages: 1000000,
        aiCredits: 50000,
        teamMembers: 50,
    },
};
exports.PLANS = [
    { id: 'free', name: 'Free', price: 0, stripePriceId: '' },
    { id: 'starter', name: 'Starter', price: 29, stripePriceId: 'price_starter' },
    { id: 'pro', name: 'Pro', price: 79, stripePriceId: 'price_pro' },
    { id: 'agency', name: 'Agency', price: 199, stripePriceId: 'price_agency' },
];
//# sourceMappingURL=index.js.map