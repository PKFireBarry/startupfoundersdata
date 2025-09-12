"use client";

import { useState, useEffect } from 'react';

export interface UserProfileStatus {
  hasProfile: boolean;
  hasResume: boolean;
  isLoading: boolean;
  error: string | null;
  profileData: any;
}

export function useUserProfile(): UserProfileStatus {
  const [status, setStatus] = useState<UserProfileStatus>({
    hasProfile: false,
    hasResume: false,
    isLoading: true,
    error: null,
    profileData: null
  });

  useEffect(() => {
    const checkUserProfile = async () => {
      try {
        const response = await fetch('/api/user-profile', {
          method: 'GET',
        });

        if (response.ok) {
          const profileData = await response.json();
          const hasResume = !!(profileData.resumePdfBase64 || profileData.resumeText);
          
          setStatus({
            hasProfile: true,
            hasResume,
            isLoading: false,
            error: null,
            profileData
          });
        } else if (response.status === 404) {
          setStatus({
            hasProfile: false,
            hasResume: false,
            isLoading: false,
            error: null,
            profileData: null
          });
        } else {
          throw new Error('Failed to check profile');
        }
      } catch (error) {
        setStatus({
          hasProfile: false,
          hasResume: false,
          isLoading: false,
          error: 'Failed to check profile status',
          profileData: null
        });
      }
    };

    checkUserProfile();
  }, []);

  return status;
}

export function validateProfileForOutreach(profileStatus: UserProfileStatus): {
  canGenerate: boolean;
  missingItems: string[];
  errorMessage: string | null;
} {
  const missingItems: string[] = [];
  
  if (!profileStatus.hasProfile) {
    missingItems.push('User profile');
  }
  
  if (!profileStatus.hasResume) {
    missingItems.push('Resume (PDF or text)');
  }

  const canGenerate = missingItems.length === 0 && !profileStatus.error;
  
  let errorMessage = null;
  if (missingItems.length > 0) {
    errorMessage = `Please set up your ${missingItems.join(' and ')} to generate outreach messages.`;
  } else if (profileStatus.error) {
    errorMessage = profileStatus.error;
  }

  return {
    canGenerate,
    missingItems,
    errorMessage
  };
}