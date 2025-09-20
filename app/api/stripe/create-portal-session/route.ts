import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '../../../../lib/stripe';
import { findOrCreateStripeCustomer } from '../../../../lib/stripe-utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase/server';

export async function POST(req: NextRequest) {
  try {
    // Creating portal session
    
    if (!stripe) {
      console.error('❌ Stripe not configured');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const { userId } = await auth();
    
    if (!userId) {
      console.error('❌ User not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Looking for customer for user - create if needed for retroactive support
    let customerId: string;

    try {
      // This will find existing customer or create a new one
      customerId = await findOrCreateStripeCustomer(userId);
      console.log(`✅ Portal session customer ready: ${customerId}`);

      // Update user's subscription record if they had admin_grant_override
      try {
        await updateDoc(doc(db, 'user_subscriptions', userId), {
          stripeCustomerId: customerId,
          hasRealStripeCustomer: true,
          updatedAt: new Date()
        });
        console.log(`✅ Updated subscription record for user ${userId} with real Stripe customer`);
      } catch (updateError) {
        // This is fine - user may not have a subscription record yet
        console.log(`ℹ️ No existing subscription to update for user ${userId}`);
      }

    } catch (error) {
      console.error('❌ Failed to create/find customer for user:', userId, error);
      return NextResponse.json({
        error: 'Unable to access billing portal. Please contact support.',
        details: 'Customer creation failed'
      }, { status: 500 });
    }

    // Create portal session
    // Creating portal session for customer
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.nextUrl.origin}/billing`,
    });

    // Portal session created
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('❌ Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}