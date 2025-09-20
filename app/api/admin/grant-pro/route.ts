import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase/server';
import { findOrCreateStripeCustomer } from '../../../../lib/stripe-utils';

// Admin email - replace with your actual email
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'barry0719@gmail.com';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user to check email
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;

    // Check if user is admin
    if (userEmail !== ADMIN_EMAIL) {
      console.log(`🚫 Unauthorized pro grant attempt by: ${userEmail}`);
      return NextResponse.json({ error: 'Forbidden - Admin access only' }, { status: 403 });
    }

    const { targetUserId, durationDays = 365 } = await req.json();
    const userIdToGrant = targetUserId || userId; // Default to self if no target specified

    console.log(`👑 Admin ${userEmail} granting Pro access to user: ${userIdToGrant} for ${durationDays} days`);

    const now = new Date();
    const expirationDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Create or find Stripe customer for the user - this ensures they can pay later
    let stripeCustomerId: string;
    try {
      stripeCustomerId = await findOrCreateStripeCustomer(userIdToGrant);
      console.log(`✅ Stripe customer ready for user ${userIdToGrant}: ${stripeCustomerId}`);
    } catch (error) {
      console.error(`⚠️ Could not create Stripe customer for ${userIdToGrant}:`, error);
      // Fallback to old method if Stripe fails, but user will need customer creation later
      stripeCustomerId = "admin_grant_override";
    }

    // Create subscription document
    const subscriptionData = {
      stripeCustomerId,
      stripeSubscriptionId: `admin_grant_${userIdToGrant}_${Date.now()}`,
      status: "active",
      priceId: process.env.STRIPE_PRICE_ID || "price_1Ry0zJIszj5smTofbmHpCaSZ",
      plan: "monthly",
      currentPeriodStart: now,
      currentPeriodEnd: expirationDate,
      expiresAt: expirationDate,
      updatedAt: now,
      grantedBy: "admin",
      grantedAt: now,
      grantedByEmail: userEmail,
      hasRealStripeCustomer: stripeCustomerId !== "admin_grant_override"
    };

    await setDoc(doc(db, 'user_subscriptions', userIdToGrant), subscriptionData);

    console.log(`✅ Successfully granted Pro access to ${userIdToGrant} until ${expirationDate}`);

    return NextResponse.json({
      success: true,
      message: `Pro access granted until ${expirationDate.toLocaleDateString()}`,
      subscription: {
        userId: userIdToGrant,
        status: 'active',
        expiresAt: expirationDate,
        grantedBy: userEmail
      }
    });

  } catch (error) {
    console.error('❌ Error granting Pro access:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Check current subscription status
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;

    if (userEmail !== ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Forbidden - Admin access only' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: "Use POST request to grant Pro access",
      instructions: {
        self: "POST /api/admin/grant-pro with no body",
        other: "POST /api/admin/grant-pro with {\"targetUserId\": \"user_xxx\"}",
        duration: "POST /api/admin/grant-pro with {\"durationDays\": 90}"
      }
    });

  } catch (error) {
    console.error('❌ Error in grant-pro endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}