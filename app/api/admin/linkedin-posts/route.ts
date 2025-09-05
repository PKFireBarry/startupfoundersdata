import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { 
  collection, 
  getDocs, 
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

async function checkAdminAccess() {
  const { userId } = await auth();
  
  if (!userId) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;

  if (userEmail !== ADMIN_EMAIL) {
    console.log(`🚫 Unauthorized LinkedIn post generator access attempt by: ${userEmail}`);
    return { authorized: false, error: 'Forbidden - Admin access only', status: 403 };
  }

  return { authorized: true, userEmail };
}

// GET - Fetch entries for LinkedIn post generation
export async function GET(req: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    console.log(`📊 Admin ${adminCheck.userEmail} fetching entries for LinkedIn post generation`);

    // Get entries from the database - focus on recent, high-quality entries
    const entryCollection = collection(db, 'entry');
    const entryQuery = query(
      entryCollection, 
      orderBy('published', 'desc'),
      firestoreLimit(500) // Get more recent entries for better post quality
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

    console.log(`✅ Retrieved ${entries.length} entries for LinkedIn post generation`);

    return NextResponse.json({
      success: true,
      entries
    });

  } catch (error) {
    console.error('❌ Error fetching entries for LinkedIn posts:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}