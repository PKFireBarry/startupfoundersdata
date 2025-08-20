import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, jobData, docId } = body;

    console.log('🚨 SAVED JOBS DEBUG:', {
      timestamp: new Date().toISOString(),
      action,
      userId,
      jobId: jobData?.id,
      company: jobData?.company,
      docId,
      stackTrace: new Error().stack?.split('\n').slice(1, 5)
    });

    if (action === 'create') {
      console.log('📝 Creating new saved_jobs document for:', {
        userId,
        jobId: jobData.id,
        company: jobData.company
      });
    } else if (action === 'delete') {
      console.log('🗑️ Deleting saved_jobs document:', {
        userId,
        docId,
        company: jobData?.company
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
