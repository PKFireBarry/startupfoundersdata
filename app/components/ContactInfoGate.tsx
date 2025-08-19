"use client";

import { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from './PaywallModal';

interface ContactInfoGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  feature?: string;
  description?: string;
}

export default function ContactInfoGate({ 
  children, 
  fallback,
  feature = "Contact Information",
  description = "Upgrade to see LinkedIn profiles, email addresses, and generate personalized outreach messages."
}: ContactInfoGateProps) {
  const { isPaid, loading } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-white/10 rounded w-20"></div>
      </div>
    );
  }

  if (isPaid) {
    return <>{children}</>;
  }

  const defaultFallback = (
    <button
      onClick={() => setShowPaywall(true)}
      className="inline-flex items-center gap-1 rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 hover:bg-yellow-500/20 transition-colors text-[10px] text-yellow-400"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      Upgrade to View
    </button>
  );

  return (
    <>
      {fallback || defaultFallback}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature={feature}
        description={description}
      />
    </>
  );
}