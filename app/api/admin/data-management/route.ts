import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { 
  collection, 
  getDocs, 
  doc,
  deleteDoc,
  query, 
  limit as firestoreLimit,
  orderBy 
} from 'firebase/firestore';
import { db } from '../../../../lib/firebase/server';

// Admin email - replace with your actual email
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'barry0719@gmail.com'; // Set in environment variables

interface EntryItem {
  id: string;
  name: string;
  company: string;
  role: string;
  company_info: string;
  published: string;
  linkedinurl: string;
  email: string;
  company_url: string;
  apply_url: string;
  url: string;
  looking_for: string;
  [key: string]: any;
}

interface FilterStats {
  total: number;
  withoutEmail: number;
  withoutLinkedIn: number;
  withoutCompanyUrl: number;
  invalidNames: number;
  invalidCompanies: number;
  invalidRoles: number;
}

async function checkAdminAccess() {
  const { userId } = await auth();
  
  if (!userId) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;

  if (userEmail !== ADMIN_EMAIL) {
    console.log(`🚫 Unauthorized admin access attempt by: ${userEmail}`);
    return { authorized: false, error: 'Forbidden - Admin access only', status: 403 };
  }

  return { authorized: true, userEmail };
}

function calculateStats(entries: EntryItem[]): FilterStats {
  const stats: FilterStats = {
    total: entries.length,
    withoutEmail: 0,
    withoutLinkedIn: 0,
    withoutCompanyUrl: 0,
    invalidNames: 0,
    invalidCompanies: 0,
    invalidRoles: 0
  };

  entries.forEach(entry => {
    // Count missing contact info
    if (!entry.email || entry.email === 'N/A' || entry.email.trim() === '') {
      stats.withoutEmail++;
    }
    
    if (!entry.linkedinurl || entry.linkedinurl === 'N/A' || entry.linkedinurl.trim() === '') {
      stats.withoutLinkedIn++;
    }
    
    if (!entry.company_url || entry.company_url === 'N/A' || entry.company_url.trim() === '') {
      stats.withoutCompanyUrl++;
    }

    // Count invalid data
    if (!entry.name || ['n/a', 'na', 'unknown', ''].includes(entry.name?.toLowerCase().trim())) {
      stats.invalidNames++;
    }
    
    if (!entry.company || ['n/a', 'na', 'unknown', ''].includes(entry.company?.toLowerCase().trim())) {
      stats.invalidCompanies++;
    }
    
    if (!entry.role || ['n/a', 'na', 'unknown', ''].includes(entry.role?.toLowerCase().trim())) {
      stats.invalidRoles++;
    }
  });

  return stats;
}

// GET - Fetch entries for admin review
export async function GET(req: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    console.log(`📊 Admin ${adminCheck.userEmail} fetching entries for data management`);

    // Get entries from the database - limit to reasonable number for UI
    const entryCollection = collection(db, 'entry');
    const entryQuery = query(
      entryCollection, 
      orderBy('published', 'desc'),
      firestoreLimit(1000) // Limit for performance
    );
    const snapshot = await getDocs(entryQuery);

    const entries: EntryItem[] = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Handle Firebase Timestamp objects properly
      let publishedStr = '';
      if (data.published) {
        if (data.published.toDate && typeof data.published.toDate === 'function') {
          // It's a Firebase Timestamp
          try {
            publishedStr = data.published.toDate().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
          } catch (e) {
            console.warn('Failed to convert Timestamp to date:', e);
            publishedStr = 'Unknown';
          }
        } else if (typeof data.published === 'string') {
          // It's already a string
          publishedStr = data.published;
        } else {
          // Try to convert to string
          publishedStr = String(data.published);
        }
      } else {
        publishedStr = 'Unknown';
      }
      
      return {
        id: doc.id,
        name: data.name || '',
        company: data.company || '',
        role: data.role || '',
        company_info: data.company_info || '',
        published: publishedStr,
        linkedinurl: data.linkedinurl || '',
        email: data.email || '',
        company_url: data.company_url || '',
        apply_url: data.apply_url || '',
        url: data.url || '',
        looking_for: data.looking_for || ''
      };
    });

    const stats = calculateStats(entries);

    console.log(`✅ Retrieved ${entries.length} entries for admin review`);

    return NextResponse.json({
      success: true,
      entries,
      stats
    });

  } catch (error) {
    console.error('❌ Error fetching entries for admin:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Delete selected entries by ID
export async function DELETE(req: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { entryIds } = await req.json().catch(() => ({}));
    
    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No entry IDs provided' 
      }, { status: 400 });
    }

    // Validate number of entries (safety limit)
    if (entryIds.length > 100) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot delete more than 100 entries at once' 
      }, { status: 400 });
    }

    console.log(`🗑️ Admin ${adminCheck.userEmail} deleting ${entryIds.length} selected entries`);

    let deletedCount = 0;
    const errors: string[] = [];

    // Delete each entry individually
    // We could use batch operations, but individual deletes give better error handling
    for (const entryId of entryIds) {
      try {
        const entryDoc = doc(db, 'entry', entryId);
        await deleteDoc(entryDoc);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Failed to delete entry ${entryId}:`, error);
        errors.push(`Failed to delete entry ${entryId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const message = `Successfully deleted ${deletedCount} out of ${entryIds.length} entries`;
    console.log(`✅ ${message}`);

    if (errors.length > 0) {
      console.log(`⚠️ Errors encountered:`, errors);
    }

    return NextResponse.json({
      success: true,
      message,
      deletedCount,
      requestedCount: entryIds.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Error in selective delete operation:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}