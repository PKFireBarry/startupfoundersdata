import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { 
  collection, 
  getDocs, 
  writeBatch, 
  query, 
  limit as firestoreLimit,
  orderBy 
} from 'firebase/firestore';
import { db } from '../../../../lib/firebase/server';

// Admin email - replace with your actual email
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'your-email@example.com'; // Set in environment variables

export async function DELETE(req: NextRequest) {
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
      console.log(`🚫 Unauthorized admin access attempt by: ${userEmail}`);
      return NextResponse.json({ error: 'Forbidden - Admin access only' }, { status: 403 });
    }

    const { batchSize = 100 } = await req.json().catch(() => ({}));
    
    // Validate batch size (Firebase Spark plan safe limits)
    const safeBatchSize = Math.min(Math.max(batchSize, 1), 200);
    
    console.log(`🗑️ Admin ${userEmail} initiating batch deletion of entries (batch size: ${safeBatchSize})`);

    // Get a batch of documents from the entry collection
    const entryCollection = collection(db, 'entry');
    const entryQuery = query(entryCollection, firestoreLimit(safeBatchSize));
    const snapshot = await getDocs(entryQuery);

    if (snapshot.empty) {
      return NextResponse.json({ 
        success: true,
        message: 'No more entries to delete',
        deletedCount: 0,
        remainingEstimate: 0
      });
    }

    // Create batch delete operation
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Execute the batch delete
    await batch.commit();
    
    const deletedCount = snapshot.docs.length;
    
    // Get remaining count estimate (this is approximate)
    const remainingSnapshot = await getDocs(query(entryCollection, firestoreLimit(1)));
    const hasMore = !remainingSnapshot.empty;

    console.log(`✅ Successfully deleted ${deletedCount} entries. More remaining: ${hasMore}`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} entries`,
      deletedCount,
      hasMoreEntries: hasMore,
      batchSize: safeBatchSize
    });

  } catch (error) {
    console.error('❌ Error deleting entries:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get entry count for admin dashboard
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

    // Get a sample to estimate total count (more efficient than counting all)
    const entryCollection = collection(db, 'entry');
    const sampleQuery = query(entryCollection, firestoreLimit(1000));
    const sampleSnapshot = await getDocs(sampleQuery);
    
    const hasMoreThan1000 = sampleSnapshot.docs.length === 1000;
    const estimatedCount = hasMoreThan1000 ? '1000+' : sampleSnapshot.docs.length;

    return NextResponse.json({
      success: true,
      estimatedCount,
      hasEntries: sampleSnapshot.docs.length > 0,
      sampleSize: sampleSnapshot.docs.length
    });

  } catch (error) {
    console.error('❌ Error getting entry count:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}