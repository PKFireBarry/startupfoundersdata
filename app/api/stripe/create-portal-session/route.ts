import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '../../../../lib/stripe';

export async function POST(req: NextRequest) {
  try {
    console.log('🏪 Creating portal session');
    
    if (!stripe) {
      console.error('❌ Stripe not configured');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const { userId } = await auth();
    
    if (!userId) {
      console.error('❌ User not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Looking for customer for user:', userId);

    // Find the Stripe customer for this user
    const customers = await stripe.customers.list({
      limit: 100, // Get more customers to search through
    });

    console.log('👥 Found customers:', customers.data.length);

    const existingCustomer = customers.data.find(customer => {
      console.log('🔍 Checking customer:', customer.id, 'metadata:', customer.metadata);
      return customer.metadata?.clerk_user_id === userId;
    });

    if (!existingCustomer) {
      console.error('❌ No customer found for user:', userId);
      console.log('Available customers:', customers.data.map(c => ({ id: c.id, metadata: c.metadata })));
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    console.log('✅ Found customer:', existingCustomer.id);
    const customerId = existingCustomer.id;

    // Create portal session
    console.log('🚪 Creating portal session for customer:', customerId);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.nextUrl.origin}/billing`,
    });

    console.log('✅ Portal session created:', session.id);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('❌ Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}