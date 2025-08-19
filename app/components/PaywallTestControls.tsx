"use client";

import { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';

export default function PaywallTestControls() {
  const { isPaid, loading } = useSubscription();
  const [updating, setUpdating] = useState(false);

  const toggleSubscription = async () => {
    setUpdating(true);
    try {
      if (isPaid) {
        // Cancel subscription
        await fetch('/api/subscription', { method: 'DELETE' });
      } else {
        // Create subscription
        await fetch('/api/subscription', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: 'pro', durationMonths: 1 })
        });
      }
      // Refresh the page to update subscription status
      window.location.reload();
    } catch (error) {
      console.error('Error toggling subscription:', error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-lg shadow-lg">
        <div className="text-sm">Loading subscription...</div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-lg shadow-lg border border-gray-600">
      <div className="text-xs text-gray-300 mb-2">Paywall Test Controls</div>
      <div className="flex items-center gap-3">
        <div className="text-sm">
          Status: <span className={isPaid ? 'text-green-400' : 'text-red-400'}>
            {isPaid ? 'PAID' : 'FREE'}
          </span>
        </div>
        <button
          onClick={toggleSubscription}
          disabled={updating}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            updating 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : isPaid 
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {updating ? 'Updating...' : isPaid ? 'Make Free' : 'Make Paid'}
        </button>
      </div>
    </div>
  );
}