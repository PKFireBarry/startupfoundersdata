import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/firebase/server';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// GET - Check subscription status
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDocRef = doc(db, 'user_subscriptions', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      const expiresAt = data.expiresAt?.toDate() || null;
      const isPaid = expiresAt ? expiresAt > new Date() : false;
      
      return NextResponse.json({
        isPaid,
        plan: data.plan || null,
        expiresAt: expiresAt?.toISOString() || null
      });
    } else {
      return NextResponse.json({
        isPaid: false,
        plan: null,
        expiresAt: null
      });
    }
  } catch (error) {
    console.error('Error checking subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create/update subscription (for testing)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan, durationMonths = 1 } = await request.json();
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
    
    const userDocRef = doc(db, 'user_subscriptions', userId);
    await setDoc(userDocRef, {
      plan: plan || 'pro',
      expiresAt: expiresAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return NextResponse.json({
      success: true,
      isPaid: true,
      plan: plan || 'pro',
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Cancel subscription (for testing)
export async function DELETE() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDocRef = doc(db, 'user_subscriptions', userId);
    await setDoc(userDocRef, {
      plan: null,
      expiresAt: new Date(), // Set to past date to make it expired
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return NextResponse.json({
      success: true,
      isPaid: false,
      plan: null,
      expiresAt: null
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}