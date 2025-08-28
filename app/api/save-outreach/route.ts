import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/firebase/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  // Save outreach API called
  
  try {
    const { jobData, outreachType, messageType, generatedMessage } = await request.json();
    // Request data processed
    
    // Get user from Clerk auth
    const { userId } = await auth();
    // User ID from auth processed
    
    if (!userId) {
      // No user ID found
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    if (!generatedMessage) {
      return NextResponse.json(
        { error: 'No message to save' },
        { status: 400 }
      );
    }

    try {
      const outreachRecord = {
        ownerUserId: userId,
        contactId: null, // No contact ID for dashboard-generated outreach
        founderName: jobData.name || '',
        company: jobData.company || '',
        linkedinUrl: jobData.linkedinurl || '',
        email: jobData.email || '',
        messageType,
        outreachType,
        generatedMessage,
        stage: messageType === 'email' ? 'sent' : 'sent', // Default first stage for both types
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        last_interaction_date: serverTimestamp(), // Track when the outreach was created
      };

      const outreachRecordsRef = collection(db, 'outreach_records');
      const docRef = await addDoc(outreachRecordsRef, outreachRecord);
      // Outreach record saved

      return NextResponse.json({ 
        success: true,
        outreachRecordId: docRef.id 
      });
    } catch (saveError) {
      console.error('Failed to save outreach record:', saveError);
      return NextResponse.json(
        { 
          error: 'Failed to save outreach to board',
          details: saveError instanceof Error ? saveError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in save outreach:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to save outreach',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}