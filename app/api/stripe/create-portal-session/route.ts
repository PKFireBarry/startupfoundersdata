import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '../../../../lib/stripe';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the Stripe customer for this user
    const customers = await stripe.customers.list({
      metadata: { clerk_user_id: userId },
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const customerId = customers.data[0].id;

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.nextUrl.origin}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}