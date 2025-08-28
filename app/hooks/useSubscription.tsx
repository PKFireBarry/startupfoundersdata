"use client";

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { clientDb } from '../../lib/firebase/client';

interface SubscriptionData {
  isPaid: boolean;
  plan: string | null;
  expiresAt: Date | null;
}

export function useSubscription() {
  const { user, isSignedIn } = useUser();
  const [subscription, setSubscription] = useState<SubscriptionData>({
    isPaid: false,
    plan: null,
    expiresAt: null
  });
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    if (!isSignedIn || !user?.id) {
      setSubscription({ isPaid: false, plan: null, expiresAt: null });
      setLoading(false);
      return;
    }

    try {
      const userDocRef = doc(clientDb, 'user_subscriptions', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        const expiresAt = data.expiresAt?.toDate() || null;
        const isActive = data.status === 'active' || data.status === 'trialing';
        const isNotExpired = expiresAt ? expiresAt > new Date() : false;
        const isPaid = isActive && (isNotExpired || data.status === 'active');
        
        // Subscription check completed
        
        setSubscription({
          isPaid,
          plan: data.plan || null,
          expiresAt
        });
      } else {
        // No subscription document = free user
        setSubscription({ isPaid: false, plan: null, expiresAt: null });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription({ isPaid: false, plan: null, expiresAt: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [isSignedIn, user?.id]);

  const refresh = async () => {
    setLoading(true);
    try {
      // First try to refresh from Stripe
      const response = await fetch('/api/stripe/refresh-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Successfully refreshed subscription from Stripe
      } else {
        // Stripe refresh failed, falling back to Firestore check
      }
    } catch (error) {
      console.error('❌ Error refreshing from Stripe:', error);
    }
    
    // Always check Firestore after attempting Stripe refresh
    await checkSubscription();
  };

  return {
    ...subscription,
    loading,
    isSignedIn,
    refresh
  };
}