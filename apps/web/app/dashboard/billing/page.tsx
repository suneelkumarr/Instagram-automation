'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/authContext';
import type { Workspace } from '@/lib/types';
import { Check, Zap, Crown } from 'lucide-react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    description: 'Perfect for creators getting started',
    features: [
      '3 Instagram accounts',
      '5,000 contacts',
      '20 automations',
      '10,000 messages/month',
      'AI Agent',
      'Basic analytics',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    description: 'For growing businesses and agencies',
    features: [
      '10 Instagram accounts',
      '50,000 contacts',
      '100 automations',
      '100,000 messages/month',
      'AI Agent + Custom prompts',
      'Advanced analytics',
      'API Access',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 199,
    description: 'For large teams and white-label',
    features: [
      'Unlimited Instagram accounts',
      '500,000 contacts',
      'Unlimited automations',
      '1M messages/month',
      'Everything in Pro',
      'White labeling',
      'Custom domain',
      '50 team members',
    ],
  },
];

export default function BillingPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const response = await api.get('/billing/current');
        setWorkspace(response.data.data);
      } catch (error) {
        console.error('Failed to fetch billing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBilling();
  }, []);

  const handleSubscribe = async (priceId: string) => {
    setSubscribing(priceId);
    try {
      const response = await api.post('/billing/subscribe', { priceId });
      if (response.data.data.url) {
        window.location.href = response.data.data.url;
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Billing & Plans</h1>
        <p className="text-gray-400 mt-1">Choose the plan that fits your needs</p>
      </div>

      {/* Current Plan */}
      {workspace && (
        <div className="bg-gradient-to-r from-primary-600/20 to-pink-600/20 rounded-xl p-6 border border-primary-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Current Plan</p>
              <h2 className="text-2xl font-bold text-white capitalize">{workspace.plan}</h2>
            </div>
            {workspace.plan !== 'free' && (
              <a
                href="#"
                className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors"
              >
                Manage Subscription
              </a>
            )}
          </div>

          {/* Usage */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <p className="text-gray-500 text-xs mb-1">Messages</p>
              <div className="flex items-baseline gap-1">
                <span className="text-white font-semibold">
                  {(workspace.usage.monthlyMessages / 1000).toFixed(1)}K
                </span>
                <span className="text-gray-500 text-sm">
                  / {workspace.limits.monthlyMessages === Infinity ? '∞' : `${workspace.limits.monthlyMessages / 1000}K`}
                </span>
              </div>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Contacts</p>
              <span className="text-white font-semibold">
                {workspace.usage.contacts.toLocaleString()}
              </span>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">AI Credits</p>
              <span className="text-white font-semibold">
                {workspace.usage.aiCredits.toLocaleString()}
              </span>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Resets</p>
              <span className="text-white font-semibold">
                {workspace.usage.resetAt ? new Date(workspace.usage.resetAt).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-[#1e1e2e] rounded-2xl p-6 border ${
              plan.popular ? 'border-primary-500 shadow-lg shadow-primary-500/10' : 'border-[#2d2d4a]'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-600 text-white text-xs font-medium rounded-full flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Most Popular
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-gray-400 text-sm">{plan.description}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">${plan.price}</span>
                <span className="text-gray-400">/month</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={subscribing === plan.id || workspace?.plan === plan.id}
              className={`w-full py-3 rounded-xl font-medium text-sm transition-colors ${
                plan.popular
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-[#0f0f17] text-white hover:bg-[#2d2d4a] border border-[#2d2d4a]'
              } disabled:opacity-50`}
            >
              {workspace?.plan === plan.id ? 'Current Plan' : subscribing === plan.id ? 'Loading...' : `Get ${plan.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
