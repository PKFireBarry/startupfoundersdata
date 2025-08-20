import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { clientDb } from '../../../lib/firebase/client';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Test writing to database
    const testData = {
      stripeCustomerId: 'test_customer',
      stripeSubscriptionId: 'test_subscription',
      status: 'active',
      priceId: 'test_price',
      plan: 'monthly',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    };

    console.log('🧪 Testing database write for user:', userId);
    await setDoc(doc(clientDb, 'user_subscriptions', userId), testData);
    
    // Verify the write
    const docRef = doc(clientDb, 'user_subscriptions', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log('✅ Database write/read test successful');
      return NextResponse.json({ 
        success: true, 
        message: 'Database test successful',
        data: docSnap.data()
      });
    } else {
      console.log('❌ Document not found after write');
      return NextResponse.json({ 
        success: false, 
        message: 'Document not found after write'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Database test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}