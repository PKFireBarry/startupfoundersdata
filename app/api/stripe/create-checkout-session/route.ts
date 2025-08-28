import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '../../../../lib/stripe';

export async function POST(req: NextRequest) {
  try {
    // Stripe checkout session request started
    // Environment check completed
    
    if (!stripe) {
      console.error('❌ Stripe not configured - missing STRIPE_SECRET_KEY');
      return NextResponse.json({ error: 'Stripe not configured - missing API keys' }, { status: 500 });
    }

    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId, successUrl, cancelUrl } = await req.json();
    
    // Request data processed

    if (!priceId) {
      console.error('❌ No price ID provided');
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    // Create or retrieve Stripe customer
    const customers = await stripe.customers.list({
      limit: 100, // Increase limit to find existing customer
    });
    
    // Find customer by metadata manually
    const existingCustomer = customers.data.find(customer => 
      customer.metadata?.clerk_user_id === userId
    );

    let customerId: string;
    
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const customer = await stripe.customers.create({
        metadata: { clerk_user_id: userId },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${req.nextUrl.origin}/billing?success=true`,
      cancel_url: cancelUrl || `${req.nextUrl.origin}/billing?canceled=true`,
      metadata: {
        clerk_user_id: userId,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}