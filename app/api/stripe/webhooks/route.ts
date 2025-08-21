import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '../../../../lib/stripe';
import { clientDb } from '../../../../lib/firebase/client';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { calculateSubscriptionPeriods } from '../../../../lib/stripe-utils';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  console.log('🔥 WEBHOOK CALLED - Starting webhook handler');
  
  if (!stripe) {
    console.error('❌ Stripe not configured');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const body = await req.text();
  const sig = (await headers()).get('stripe-signature');

  console.log('📝 Webhook details:', {
    bodyLength: body.length,
    hasSignature: !!sig,
    webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
  });

  if (!sig) {
    console.error('❌ No signature in webhook');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('❌ Webhook secret not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      webhookSecret
    );
    console.log('✅ Webhook signature verified successfully');
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    console.log(`🎯 Processing webhook event: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('💰 Processing checkout.session.completed');
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.clerk_user_id;

        console.log('📋 Session details:', {
          sessionId: session.id,
          userId,
          customer: session.customer,
          subscription: session.subscription,
          metadata: session.metadata
        });

        if (!userId) {
          console.error('❌ No user ID in session metadata:', session.metadata);
          break;
        }

        // Get the subscription details
        if (session.subscription && typeof session.subscription === 'string') {
          console.log('🔄 Retrieving subscription details:', session.subscription);
          const subscription = await stripe.subscriptions.retrieve(session.subscription, {
            expand: ['latest_invoice', 'items.data.price']
          });
          
          console.log('📊 Subscription details:', {
            id: subscription.id,
            status: subscription.status,
            priceId: subscription.items.data[0].price.id,
            interval: subscription.items.data[0].price.recurring?.interval,
            full_object_keys: Object.keys(subscription),
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            billing_cycle_anchor: subscription.billing_cycle_anchor,
            created: subscription.created,
            current_period_start_date: subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : 'undefined',
            current_period_end_date: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : 'undefined'
          });
          
          // Calculate subscription periods
          const { start: currentPeriodStart, end: currentPeriodEnd } = calculateSubscriptionPeriods(subscription);

          const docData = {
            stripeCustomerId: session.customer,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            priceId: subscription.items.data[0].price.id,
            plan: subscription.items.data[0].price.recurring?.interval || 'monthly',
            currentPeriodStart,
            currentPeriodEnd,
            expiresAt: currentPeriodEnd,
            updatedAt: new Date(),
          };
          
          console.log('💾 Saving to Firestore:', { userId, docData });
          
          await setDoc(doc(clientDb, 'user_subscriptions', userId), docData);
          console.log('✅ Successfully saved subscription to Firestore');
        } else {
          console.log('⚠️  No subscription in session:', session.subscription);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        if ('metadata' in customer) {
          const userId = customer.metadata?.clerk_user_id;
          
          if (userId) {
            // Calculate subscription periods
            const { start: currentPeriodStart, end: currentPeriodEnd } = calculateSubscriptionPeriods(subscription);

            await setDoc(doc(clientDb, 'user_subscriptions', userId), {
              stripeCustomerId: subscription.customer,
              stripeSubscriptionId: subscription.id,
              status: subscription.status,
              priceId: subscription.items.data[0].price.id,
              plan: subscription.items.data[0].price.recurring?.interval || 'monthly',
              currentPeriodStart,
              currentPeriodEnd,
              expiresAt: currentPeriodEnd,
              updatedAt: new Date(),
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        if ('metadata' in customer) {
          const userId = customer.metadata?.clerk_user_id;
          
          if (userId) {
            await deleteDoc(doc(clientDb, 'user_subscriptions', userId));
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if ((invoice as any).subscription) {
          const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          
          if ('metadata' in customer) {
            const userId = customer.metadata?.clerk_user_id;
            
            if (userId) {
              // Calculate subscription periods
              const { start: currentPeriodStart, end: currentPeriodEnd } = calculateSubscriptionPeriods(subscription);

              await setDoc(doc(clientDb, 'user_subscriptions', userId), {
                stripeCustomerId: subscription.customer,
                stripeSubscriptionId: subscription.id,
                status: subscription.status,
                priceId: subscription.items.data[0].price.id,
                plan: subscription.items.data[0].price.recurring?.interval || 'monthly',
                currentPeriodStart,
                currentPeriodEnd,
                expiresAt: currentPeriodEnd,
                updatedAt: new Date(),
              });
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        // Handle failed payments - could send email notification
        console.log('Payment failed for invoice:', event.data.object.id);
        break;
      }

      default:
        console.log(`⚪ Unhandled event type: ${event.type}`);
    }

    console.log('✅ Webhook processed successfully');
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}