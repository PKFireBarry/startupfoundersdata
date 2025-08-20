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

  useEffect(() => {
    if (!isSignedIn || !user?.id) {
      setSubscription({ isPaid: false, plan: null, expiresAt: null });
      setLoading(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        console.log('🔍 Checking subscription for user:', user.id);
        const userDocRef = doc(clientDb, 'user_subscriptions', user.id);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          const expiresAt = data.expiresAt?.toDate() || null;
          const isPaid = expiresAt ? expiresAt > new Date() : false;
          
          console.log('📋 Subscription data found:', {
            userId: user.id,
            status: data.status,
            plan: data.plan,
            expiresAt,
            isPaid,
            currentTime: new Date()
          });
          
          setSubscription({
            isPaid,
            plan: data.plan || null,
            expiresAt
          });
        } else {
          console.log('❌ No subscription document found for user:', user.id);
          // No subscription document = free user
          setSubscription({ isPaid: false, plan: null, expiresAt: null });
        }
      } catch (error) {
        console.error('❌ Error checking subscription:', error);
        setSubscription({ isPaid: false, plan: null, expiresAt: null });
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [isSignedIn, user?.id]);

  const refreshSubscription = async () => {
    if (!isSignedIn || !user?.id) return;
    
    setLoading(true);
    try {
      console.log('🔄 Manually refreshing subscription for user:', user.id);
      const userDocRef = doc(clientDb, 'user_subscriptions', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        const expiresAt = data.expiresAt?.toDate() || null;
        const isPaid = expiresAt ? expiresAt > new Date() : false;
        
        console.log('📋 Refreshed subscription data:', {
          userId: user.id,
          status: data.status,
          plan: data.plan,
          expiresAt,
          isPaid,
          currentTime: new Date()
        });
        
        setSubscription({
          isPaid,
          plan: data.plan || null,
          expiresAt
        });
      } else {
        console.log('❌ No subscription document found during refresh for user:', user.id);
        setSubscription({ isPaid: false, plan: null, expiresAt: null });
      }
    } catch (error) {
      console.error('❌ Error refreshing subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    ...subscription,
    loading,
    isSignedIn,
    refreshSubscription
  };
}