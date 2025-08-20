import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '../../../../lib/stripe';
import { clientDb } from '../../../../lib/firebase/client';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = (await headers()).get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.clerk_user_id;

        if (!userId) {
          console.error('No user ID in session metadata');
          break;
        }

        // Get the subscription details
        if (session.subscription && typeof session.subscription === 'string') {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          
          await setDoc(doc(clientDb, 'user_subscriptions', userId), {
            stripeCustomerId: session.customer,
            stripeSubscriptionId: subscription.id,
            status: subscription.status,
            priceId: subscription.items.data[0].price.id,
            plan: subscription.items.data[0].price.recurring?.interval || 'monthly',
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            expiresAt: new Date(subscription.current_period_end * 1000),
            updatedAt: new Date(),
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        if ('metadata' in customer) {
          const userId = customer.metadata?.clerk_user_id;
          
          if (userId) {
            await setDoc(doc(clientDb, 'user_subscriptions', userId), {
              stripeCustomerId: subscription.customer,
              stripeSubscriptionId: subscription.id,
              status: subscription.status,
              priceId: subscription.items.data[0].price.id,
              plan: subscription.items.data[0].price.recurring?.interval || 'monthly',
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              expiresAt: new Date(subscription.current_period_end * 1000),
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
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          
          if ('metadata' in customer) {
            const userId = customer.metadata?.clerk_user_id;
            
            if (userId) {
              await setDoc(doc(clientDb, 'user_subscriptions', userId), {
                stripeCustomerId: subscription.customer,
                stripeSubscriptionId: subscription.id,
                status: subscription.status,
                priceId: subscription.items.data[0].price.id,
                plan: subscription.items.data[0].price.recurring?.interval || 'monthly',
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                expiresAt: new Date(subscription.current_period_end * 1000),
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
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}