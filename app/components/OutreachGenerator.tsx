"use client";

import { useState } from 'react';

interface OutreachGeneratorProps {
  jobData: any;
  userProfile: any;
  onClose: () => void;
}

export default function OutreachGenerator({ jobData, userProfile, onClose }: OutreachGeneratorProps) {
  const [outreachType, setOutreachType] = useState<'job' | 'collaboration' | 'friendship'>('job');
  const [messageType, setMessageType] = useState<'email' | 'linkedin'>('email');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const generateOutreach = async () => {
    setIsGenerating(true);
    setError('');
    
    try {
      const response = await fetch('/api/generate-outreach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobData,
          outreachType,
          messageType
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate outreach message');
      }

      const data = await response.json();
      setGeneratedMessage(data.message);
    } catch (err) {
      setError('Failed to generate message. Please try again.');
      console.error('Error generating outreach:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
  };

  const outreachTypeLabels = {
    job: 'Job Application',
    collaboration: 'Collaboration/Partnership',
    friendship: 'Networking/Friendship'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">AI Outreach Generator</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-600 mt-2">
            Generate personalized outreach messages for <strong>{jobData.company}</strong>
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Company/Job Info Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Target Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Company:</span> {jobData.company || 'Unknown'}
              </div>
              {jobData.name && (
                <div>
                  <span className="font-medium text-gray-700">Person:</span> {jobData.name}
                </div>
              )}
              {jobData.role && (
                <div>
                  <span className="font-medium text-gray-700">Role:</span> {jobData.role}
                </div>
              )}
              {jobData.looking_for && (
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700">Looking for:</span> {jobData.looking_for}
                </div>
              )}
            </div>
          </div>

          {/* Outreach Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Outreach Purpose
              </label>
              <div className="space-y-2">
                {Object.entries(outreachTypeLabels).map(([key, label]) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="radio"
                      name="outreachType"
                      value={key}
                      checked={outreachType === key}
                      onChange={(e) => setOutreachType(e.target.value as any)}
                      className="mr-3 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Message Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="messageType"
                    value="email"
                    checked={messageType === 'email'}
                    onChange={(e) => setMessageType(e.target.value as any)}
                    className="mr-3 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Email</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="messageType"
                    value="linkedin"
                    checked={messageType === 'linkedin'}
                    onChange={(e) => setMessageType(e.target.value as any)}
                    className="mr-3 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">LinkedIn Message</span>
                </label>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center">
            <button
              onClick={generateOutreach}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Outreach
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Generated Message */}
          {generatedMessage && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-green-800">Generated Message</h4>
                <button
                  onClick={copyToClipboard}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              </div>
              <div className="bg-white rounded-md p-4 border border-green-100">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {generatedMessage}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
