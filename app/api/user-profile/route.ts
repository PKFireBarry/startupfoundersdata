import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { clientDb } from '../../../lib/firebase/client';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userDocRef = doc(clientDb, 'user_profiles', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return NextResponse.json(userDoc.data());
    } else {
      // Return default empty profile
      return NextResponse.json({
        resume: '',
        name: '',
        title: '',
        skills: [],
        experience: '',
        projects: '',
        goals: ''
      });
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileData = await request.json();
    const userDocRef = doc(clientDb, 'user_profiles', userId);

    // Add timestamp
    const updatedProfile = {
      ...profileData,
      updatedAt: new Date(),
      userId
    };

    await setDoc(userDocRef, updatedProfile, { merge: true });

    return NextResponse.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error('Error saving user profile:', error);
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    );
  }
}
