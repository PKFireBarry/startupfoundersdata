import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '../../../../lib/stripe';
import { clientDb } from '../../../../lib/firebase/client';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { calculateSubscriptionPeriods } from '../../../../lib/stripe-utils';

export async function POST(_req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Manual subscription refresh for user

    // Get existing subscription document
    const subscriptionDoc = await getDoc(doc(clientDb, 'user_subscriptions', userId));
    
    if (!subscriptionDoc.exists()) {
      // No existing subscription document found
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const data = subscriptionDoc.data();
    const stripeSubscriptionId = data.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      // No Stripe subscription ID found
      return NextResponse.json({ error: 'No Stripe subscription ID' }, { status: 404 });
    }

    // Fetch latest subscription data from Stripe
    // Fetching subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['latest_invoice', 'items.data.price']
    });

    // Latest Stripe subscription data processed

    // Calculate subscription periods
    const { start: currentPeriodStart, end: currentPeriodEnd } = calculateSubscriptionPeriods(subscription);
    
    // Calculated period dates

    const updatedData = {
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      priceId: subscription.items.data[0].price.id,
      plan: subscription.items.data[0].price.recurring?.interval || 'monthly',
      currentPeriodStart,
      currentPeriodEnd,
      expiresAt: currentPeriodEnd,
      updatedAt: new Date(),
    };

    // Updating Firestore with fresh data
    await setDoc(doc(clientDb, 'user_subscriptions', userId), updatedData);

    return NextResponse.json({ 
      success: true, 
      subscription: {
        status: subscription.status,
        currentPeriodEnd,
        plan: subscription.items.data[0].price.recurring?.interval || 'monthly'
      }
    });
  } catch (error) {
    console.error('❌ Error refreshing subscription:', error);
    return NextResponse.json(
      { error: 'Failed to refresh subscription' },
      { status: 500 }
    );
  }
}