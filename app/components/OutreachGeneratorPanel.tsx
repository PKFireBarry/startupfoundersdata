"use client";

import { useState } from 'react';
import { useToast } from '../hooks/useToast';

interface OutreachGeneratorPanelProps {
  jobData: any;
  contactId?: string;
}

export default function OutreachGeneratorPanel({ jobData, contactId }: OutreachGeneratorPanelProps) {
  const [outreachType, setOutreachType] = useState<'job' | 'collaboration' | 'friendship'>('job');
  const [messageType, setMessageType] = useState<'email' | 'linkedin'>('email');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [hoveredType, setHoveredType] = useState<string | null>(null);
  const { success, error: showError } = useToast();

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
          messageType,
          contactId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate outreach message');
      }

      const data = await response.json();
      setGeneratedMessage(data.message);
      success(`${messageType === 'email' ? 'Email' : 'LinkedIn message'} generated successfully!`);
    } catch (err) {
      const errorMessage = 'Failed to generate message. Please try again.';
      setError(errorMessage);
      showError(errorMessage);
      console.error('Error generating outreach:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    success('Message copied to clipboard!');
  };

  const outreachTypeLabels = {
    job: 'Job Application',
    collaboration: 'Collaboration/Partnership',
    friendship: 'Networking/Friendship'
  };

  const outreachTypeDescriptions = {
    job: 'Creates professional outreach for job opportunities. Focuses on your relevant experience, shows genuine interest in the role, and includes a clear call-to-action. Perfect for reaching out to hiring managers or founders about open positions.',
    collaboration: 'Generates partnership-focused messages between founders and builders. Emphasizes mutual value creation, proposes specific collaboration ideas, and maintains a peer-to-peer tone. Great for exploring business partnerships or joint ventures.',
    friendship: 'Crafts casual networking messages to build authentic professional relationships. Focuses on shared interests, offers value, and suggests staying connected. Ideal for expanding your professional network without immediate asks.'
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Configuration - Fixed Height */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Outreach Purpose
            </label>
            <div className="space-y-1 relative">
              {Object.entries(outreachTypeLabels).map(([key, label]) => (
                <label 
                  key={key} 
                  className="flex items-center relative cursor-pointer"
                  onMouseEnter={() => setHoveredType(key)}
                  onMouseLeave={() => setHoveredType(null)}
                >
                  <input
                    type="radio"
                    name="outreachType"
                    value={key}
                    checked={outreachType === key}
                    onChange={(e) => setOutreachType(e.target.value as any)}
                    className="mr-2 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                  
                  {/* Tooltip */}
                  {hoveredType === key && (
                    <div className="absolute left-full ml-4 top-0 z-10 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                      <div className="absolute left-0 top-2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900 -ml-1"></div>
                      {outreachTypeDescriptions[key as keyof typeof outreachTypeDescriptions]}
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message Type
            </label>
            <div className="space-y-1">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="messageType"
                  value="email"
                  checked={messageType === 'email'}
                  onChange={(e) => setMessageType(e.target.value as any)}
                  className="mr-2 text-blue-600"
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
                  className="mr-2 text-blue-600"
                />
                <span className="text-sm text-gray-700">LinkedIn Message</span>
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={generateOutreach}
          disabled={isGenerating}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Outreach
            </>
          )}
        </button>
      </div>

      {/* Generated Message - Scrollable Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {generatedMessage ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white">
              <h4 className="font-semibold text-gray-900">Generated Message</h4>
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                {generatedMessage}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Ready to Generate</h4>
            <p className="text-gray-600 text-sm">
              Configure your outreach settings above and click "Generate Outreach" to create a personalized message.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}