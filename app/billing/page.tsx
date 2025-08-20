"use client";

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Navigation from '../components/Navigation';
import { useSubscription } from '../hooks/useSubscription';

interface PlanFeature {
  name: string;
  free: boolean | string;
  pro: boolean | string;
  highlight?: boolean;
}

const planFeatures: PlanFeature[] = [
  { name: "Browse opportunities", free: true, pro: true },
  { name: "Save to opportunities dashboard", free: true, pro: true },
  { name: "LinkedIn profiles & email addresses", free: false, pro: true, highlight: true },
  { name: "AI outreach generation with context settings", free: false, pro: true, highlight: true },
  { name: "Outreach tracking & kanban boards", free: false, pro: true, highlight: true },
  { name: "Message archive", free: false, pro: true },
];

export default function BillingPage() {
  const { isSignedIn } = useUser();
  const { isPaid, plan, expiresAt } = useSubscription();
  const [billingLoading, setBillingLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle URL parameters for success/cancel messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success')) {
      setMessage({ type: 'success', text: 'Payment successful! Your subscription is now active.' });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('canceled')) {
      setMessage({ type: 'error', text: 'Payment was canceled. You can try again anytime.' });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const handleSubscribe = async () => {
    if (!isSignedIn) return;
    
    setBillingLoading(true);
    try {
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY;

      if (!priceId) {
        throw new Error('Monthly price ID not configured');
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/billing?success=true`,
          cancelUrl: `${window.location.origin}/billing?canceled=true`,
        }),
      });

      const { url, error } = await response.json();

      if (error) {
        throw new Error(error);
      }

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Failed to start checkout process. Please try again.');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setBillingLoading(true);
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { url, error } = await response.json();

      if (error) {
        throw new Error(error);
      }

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setBillingLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen" style={{
        background: `
          radial-gradient(900px 500px at 10% -10%, rgba(5,32,74,.12) 0%, transparent 60%),
          radial-gradient(900px 500px at 90% -10%, rgba(180,151,214,.12) 0%, transparent 60%),
          linear-gradient(180deg, #0c0d14, #0a0b12 60%, #08090f 100%)
        `,
        color: '#ececf1'
      }}>
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white mb-2">Access Required</h1>
            <p className="text-[#ccceda]">Sign in to view your billing information</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen antialiased" style={{
      background: `
        radial-gradient(900px 500px at 10% -10%, rgba(5,32,74,.12) 0%, transparent 60%),
        radial-gradient(900px 500px at 90% -10%, rgba(180,151,214,.12) 0%, transparent 60%),
        linear-gradient(180deg, #0c0d14, #0a0b12 60%, #08090f 100%)
      `,
      color: '#ececf1'
    }}>
      <Navigation />
      
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white mb-2">Billing & Subscription</h1>
          <p className="text-[#ccceda]">Manage your subscription and view pricing plans</p>
        </div>

        {/* Success/Error Messages */}
        {message && (
          <div className={`mb-6 rounded-lg border p-4 ${
            message.type === 'success' 
              ? 'border-green-500/30 bg-green-500/10 text-green-400'
              : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="font-medium">{message.text}</span>
              <button 
                onClick={() => setMessage(null)}
                className="ml-auto text-current opacity-70 hover:opacity-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Current Subscription Status */}
        <section className="mb-8">
          <div className="rounded-2xl border border-white/10 panel p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">Current Plan</h2>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
                    isPaid 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-neutral-500/20 text-neutral-400 border border-neutral-500/30'
                  }`}>
                    {isPaid ? 'Pro Plan' : 'Free Plan'}
                  </span>
                  {isPaid && (
                    <span className="text-sm text-[#ccceda]">
                      {plan === 'yearly' ? 'Yearly Billing' : 'Monthly Billing'}
                    </span>
                  )}
                </div>
              </div>
              
              {isPaid && (
                <button
                  onClick={handleManageBilling}
                  disabled={billingLoading}
                  className="btn-ghost px-4 py-2 text-sm rounded-lg disabled:opacity-50"
                >
                  Manage Billing
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-white/10 bg-[#141522] p-4">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Status</div>
                <div className="text-white font-medium">
                  {isPaid ? 'Active' : 'Free Tier'}
                </div>
              </div>
              
              <div className="rounded-lg border border-white/10 bg-[#141522] p-4">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">
                  {isPaid ? 'Renewal Date' : 'Upgrade Available'}
                </div>
                <div className="text-white font-medium">
                  {isPaid ? formatDate(expiresAt) : 'Unlock all features'}
                </div>
              </div>
              
              <div className="rounded-lg border border-white/10 bg-[#141522] p-4">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">Plan</div>
                <div className="text-white font-medium">
                  {isPaid ? `${plan?.charAt(0).toUpperCase()}${plan?.slice(1)} Plan` : 'Free Plan'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Plans */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-6">Choose Your Plan</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <div className="rounded-2xl border border-white/10 panel p-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Free</h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-bold text-white">$0</span>
                  <span className="text-[#ccceda]">/month</span>
                </div>
                <p className="text-[#ccceda] text-sm">
                  Perfect for getting started with founder outreach
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[#ccceda]">Browse unlimited opportunities</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[#ccceda]">Save to opportunities dashboard</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[#ccceda]">Basic company information</span>
                </div>
              </div>

              <button
                disabled={!isPaid}
                className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  !isPaid 
                    ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed'
                    : 'btn-ghost'
                }`}
              >
                {!isPaid ? 'Current Plan' : 'Downgrade to Free'}
              </button>
            </div>

            {/* Pro Plan */}
            <div className="rounded-2xl border-2 panel p-6 relative overflow-hidden" style={{
              borderColor: 'var(--wisteria)',
              background: 'rgba(180,151,214,.08)'
            }}>
              <div className="absolute top-0 right-0 bg-gradient-to-r from-[var(--wisteria)] to-[var(--lavender-web)] text-[#0f1018] px-3 py-1 text-xs font-semibold rounded-bl-lg">
                RECOMMENDED
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-bold text-white">$3</span>
                  <span className="text-[#ccceda]">/month</span>
                </div>
                <p className="text-[#ccceda] text-sm">
                  Everything you need for professional outreach
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[#ccceda]">Everything in Free</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[#ccceda]">LinkedIn profiles & email addresses when available </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[#ccceda]">AI-powered outreach generation with context settings</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[#ccceda]">Outreach tracking & kanban boards</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-[#ccceda]">Message archive</span>
                </div>
              </div>

              <button
                onClick={handleSubscribe}
                disabled={billingLoading || isPaid}
                className={`w-full rounded-lg px-4 py-3 text-sm font-semibold ${
                  isPaid 
                    ? 'bg-neutral-600 text-neutral-400 cursor-not-allowed' 
                    : 'btn-primary'
                }`}
              >
                {billingLoading ? 'Loading...' : isPaid ? 'Current Plan' : 'Upgrade to Pro'}
              </button>
            </div>
          </div>
        </section>

        {/* Feature Comparison */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-6">Feature Comparison</h2>
          
          <div className="rounded-2xl border border-white/10 panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-6 text-white font-semibold">Feature</th>
                    <th className="text-center py-4 px-6 text-white font-semibold">Free</th>
                    <th className="text-center py-4 px-6 text-white font-semibold">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {planFeatures.map((feature, index) => (
                    <tr key={index} className={`border-b border-white/5 ${feature.highlight ? 'bg-[var(--wisteria)]/5' : ''}`}>
                      <td className="py-4 px-6 text-[#ccceda] font-medium">
                        {feature.name}
                        {feature.highlight && (
                          <svg className="inline w-4 h-4 ml-2 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {typeof feature.free === 'boolean' ? (
                          feature.free ? (
                            <svg className="w-5 h-5 text-green-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-neutral-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )
                        ) : (
                          <span className="text-[#ccceda] text-sm">{feature.free}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {typeof feature.pro === 'boolean' ? (
                          feature.pro ? (
                            <svg className="w-5 h-5 text-green-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-neutral-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )
                        ) : (
                          <span className="text-[#ccceda] text-sm">{feature.pro}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}