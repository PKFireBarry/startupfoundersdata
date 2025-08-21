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

    console.log('🔄 Manual subscription refresh for user:', userId);

    // Get existing subscription document
    const subscriptionDoc = await getDoc(doc(clientDb, 'user_subscriptions', userId));
    
    if (!subscriptionDoc.exists()) {
      console.log('❌ No existing subscription document found');
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const data = subscriptionDoc.data();
    const stripeSubscriptionId = data.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      console.log('❌ No Stripe subscription ID found');
      return NextResponse.json({ error: 'No Stripe subscription ID' }, { status: 404 });
    }

    // Fetch latest subscription data from Stripe
    console.log('🔄 Fetching subscription from Stripe:', stripeSubscriptionId);
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['latest_invoice', 'items.data.price']
    });

    console.log('📊 Latest Stripe subscription data:', {
      id: subscription.id,
      status: subscription.status,
      full_object_keys: Object.keys(subscription),
      current_period_start: (subscription as any).current_period_start,
      current_period_end: (subscription as any).current_period_end,
      billing_cycle_anchor: subscription.billing_cycle_anchor,
      created: subscription.created,
      current_period_start_date: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000) : 'undefined',
      current_period_end_date: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000) : 'undefined'
    });

    // Calculate subscription periods
    const { start: currentPeriodStart, end: currentPeriodEnd } = calculateSubscriptionPeriods(subscription);
    
    console.log('📅 Calculated period dates:', {
      billingAnchor: subscription.billing_cycle_anchor,
      created: subscription.created,
      interval: subscription.items.data[0].price.recurring?.interval,
      intervalCount: subscription.items.data[0].price.recurring?.interval_count,
      calculatedStart: currentPeriodStart,
      calculatedEnd: currentPeriodEnd
    });

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

    console.log('💾 Updating Firestore with fresh data:', updatedData);
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