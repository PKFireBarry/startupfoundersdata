"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

interface ProfileEditorProps {
  onProfileUpdate: (profile: UserProfile) => void;
}

interface UserProfile {
  resumeText: string;
  goals: string;
  resumePdfBase64: string;
  resumeFilename: string;
}

export default function ProfileEditor({ onProfileUpdate }: ProfileEditorProps) {
  const [profile, setProfile] = useState<UserProfile>({
    resumeText: '',
    goals: '',
    resumePdfBase64: '',
    resumeFilename: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch('/api/user-profile');
      if (response.ok) {
        const data = (await response.json()) as Partial<UserProfile>;
        setProfile({
          resumeText: data.resumeText || '',
          goals: data.goals || '',
          resumePdfBase64: data.resumePdfBase64 || '',
          resumeFilename: data.resumeFilename || ''
        });
        onProfileUpdate({
          resumeText: data.resumeText || '',
          goals: data.goals || '',
          resumePdfBase64: data.resumePdfBase64 || '',
          resumeFilename: data.resumeFilename || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onProfileUpdate]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('Profile saved successfully!');
        const updated: Partial<UserProfile> = data.profile || {};
        onProfileUpdate({
          resumeText: updated.resumeText || '',
          goals: updated.goals || '',
          resumePdfBase64: updated.resumePdfBase64 || '',
          resumeFilename: updated.resumeFilename || ''
        });
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setMessage('Please select a valid PDF file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setMessage('File size must be less than 10MB.');
      return;
    }

    setIsUploading(true);
    setMessage('');

    try {
      // Convert PDF to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      setProfile(prev => ({
        ...prev,
        resumePdfBase64: base64String,
        resumeFilename: file.name
      }));

      setMessage(`PDF "${file.name}" uploaded successfully! The AI can now read your resume directly.`);
      setTimeout(() => setMessage(''), 5000);

    } catch (error) {
      console.error('Error uploading PDF:', error);
      setMessage('Failed to upload PDF. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Your Profile & Resume</h2>
        <button
          onClick={saveProfile}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Save Profile
            </>
          )}
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes('successfully')
          ? 'bg-green-50 border border-green-200 text-green-800'
          : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {/* PDF Resume Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Upload Resume (PDF)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handlePdfUpload}
              className="hidden"
            />

            {profile.resumeFilename ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{profile.resumeFilename}</p>
                  <p className="text-xs text-gray-500">Resume uploaded - AI can read this directly</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Replace PDF
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Upload your resume</p>
                  <p className="text-xs text-gray-500">PDF files only, up to 10MB - AI will read directly</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                >
                  {isUploading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Choose PDF File
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Resume Text Input (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resume Text (Optional)
            <span className="text-xs text-gray-500 ml-2">- Only needed if you don&apos;t upload a PDF</span>
          </label>
          <textarea
            value={profile.resumeText}
            onChange={(e) => handleInputChange('resumeText', e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
            placeholder="If you prefer, you can paste your resume text here instead of uploading a PDF..."
          />
          <p className="text-xs text-gray-500 mt-1">
            This is optional if you&apos;ve uploaded a PDF above. The AI can read PDFs directly.
          </p>
        </div>

        {/* Career Goals & Interests */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Career Goals & Interests
            <span className="text-xs text-gray-500 ml-2">(What you&apos;re looking to outreach for)</span>
          </label>
          <textarea
            value={profile.goals}
            onChange={(e) => handleInputChange('goals', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            placeholder="What are you looking for? Job opportunities, collaboration projects, networking connections, specific roles or industries you&apos;re interested in..."
          />
          <p className="text-xs text-gray-500 mt-1">
            This helps the AI understand what type of opportunities and connections you&apos;re seeking.
          </p>
        </div>
      </div>
    </div>
  );
}
