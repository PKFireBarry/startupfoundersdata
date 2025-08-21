import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clientDb } from '../../../../lib/firebase/client';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(_req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Debug subscription for user:', userId);

    // Get subscription document
    const subscriptionDoc = await getDoc(doc(clientDb, 'user_subscriptions', userId));
    
    if (!subscriptionDoc.exists()) {
      return NextResponse.json({ 
        message: 'No subscription document found',
        userId 
      });
    }

    const data = subscriptionDoc.data();
    
    // Debug the raw data
    console.log('📊 Raw Firestore data:', data);
    
    // Process the data like the useSubscription hook does
    const expiresAt = data.expiresAt?.toDate() || null;
    const isActive = data.status === 'active' || data.status === 'trialing';
    const isNotExpired = expiresAt ? expiresAt > new Date() : false;
    const isPaid = isActive && (isNotExpired || data.status === 'active');

    return NextResponse.json({
      rawData: {
        ...data,
        expiresAt: data.expiresAt,
        currentPeriodEnd: data.currentPeriodEnd,
        currentPeriodStart: data.currentPeriodStart,
      },
      processed: {
        expiresAt,
        isActive,
        isNotExpired,
        isPaid,
        status: data.status,
        plan: data.plan,
      },
      timestamps: {
        expiresAtString: expiresAt?.toString(),
        currentTime: new Date().toString(),
        expiresAtTime: expiresAt?.getTime(),
        currentTimeTime: new Date().getTime(),
      }
    });
  } catch (error) {
    console.error('❌ Error debugging subscription:', error);
    return NextResponse.json(
      { error: 'Failed to debug subscription' },
      { status: 500 }
    );
  }
}