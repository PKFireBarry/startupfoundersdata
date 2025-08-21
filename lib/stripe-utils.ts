import type Stripe from 'stripe';

export function calculateSubscriptionPeriods(subscription: Stripe.Subscription) {
  // If current_period_start/end exist, use them
  const currentPeriodStart = (subscription as any).current_period_start;
  const currentPeriodEnd = (subscription as any).current_period_end;
  
  if (currentPeriodStart && currentPeriodEnd) {
    return {
      start: new Date(currentPeriodStart * 1000),
      end: new Date(currentPeriodEnd * 1000)
    };
  }

  // Get the billing cycle anchor (when the subscription was created/last billed)
  const billingAnchor = subscription.billing_cycle_anchor || subscription.created;
  const anchorDate = new Date(billingAnchor * 1000);
  
  // Get the plan interval (monthly, yearly, etc.)
  const interval = subscription.items.data[0].price.recurring?.interval || 'month';
  const intervalCount = subscription.items.data[0].price.recurring?.interval_count || 1;
  
  // Calculate current period based on interval
  const now = new Date();
  let periodStart = new Date(anchorDate);
  
  // Find the current billing period by advancing from the anchor date
  while (periodStart < now) {
    const nextPeriod = new Date(periodStart);
    
    if (interval === 'month') {
      nextPeriod.setMonth(nextPeriod.getMonth() + intervalCount);
    } else if (interval === 'year') {
      nextPeriod.setFullYear(nextPeriod.getFullYear() + intervalCount);
    } else if (interval === 'day') {
      nextPeriod.setDate(nextPeriod.getDate() + intervalCount);
    } else if (interval === 'week') {
      nextPeriod.setDate(nextPeriod.getDate() + (7 * intervalCount));
    }
    
    if (nextPeriod > now) {
      break;
    }
    
    periodStart = nextPeriod;
  }
  
  // Calculate period end
  const periodEnd = new Date(periodStart);
  if (interval === 'month') {
    periodEnd.setMonth(periodEnd.getMonth() + intervalCount);
  } else if (interval === 'year') {
    periodEnd.setFullYear(periodEnd.getFullYear() + intervalCount);
  } else if (interval === 'day') {
    periodEnd.setDate(periodEnd.getDate() + intervalCount);
  } else if (interval === 'week') {
    periodEnd.setDate(periodEnd.getDate() + (7 * intervalCount));
  }
  
  return { start: periodStart, end: periodEnd };
}