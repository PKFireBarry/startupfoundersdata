"use client";

import { useState, type ChangeEvent } from 'react';
import { useToast } from '../hooks/useToast';

interface JobData {
  company?: string;
  name?: string;
  role?: string;
  looking_for?: string;
  company_url?: string;
  linkedinurl?: string;
  email?: string;
}

interface OutreachGeneratorPanelProps {
  jobData: JobData;
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
    <div className="flex-1 flex flex-col h-full text-neutral-100">
      {/* Configuration - Fixed Height */}
      <div className="p-6 border-b border-neutral-800 flex-shrink-0 bg-neutral-950">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
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
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setOutreachType(e.target.value as 'job' | 'collaboration' | 'friendship')
                    }
                    className="mr-2 accent-[var(--lavender-web)] focus-ring"
                  />
                  <span className="text-sm text-neutral-300">{label}</span>
                  
                  {/* Tooltip */}
                  {hoveredType === key && (
                    <div className="absolute left-full ml-4 top-0 z-10 w-80 p-3 bg-neutral-900 text-neutral-100 text-xs rounded-lg shadow-lg border border-neutral-800">
                      <div className="absolute left-0 top-2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-neutral-900 -ml-1"></div>
                      {outreachTypeDescriptions[key as keyof typeof outreachTypeDescriptions]}
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Message Type
            </label>
            <div className="segmented inline-flex overflow-hidden rounded-xl border border-white/10 text-sm panel">
              <input
                id="panel-ch-email"
                type="radio"
                name="panel-channel"
                checked={messageType === 'email'}
                onChange={() => setMessageType('email')}
              />
              <label htmlFor="panel-ch-email" className="px-3 py-1.5">Email</label>
              <input
                id="panel-ch-linkedin"
                type="radio"
                name="panel-channel"
                checked={messageType === 'linkedin'}
                onChange={() => setMessageType('linkedin')}
              />
              <label htmlFor="panel-ch-linkedin" className="px-3 py-1.5">LinkedIn</label>
            </div>
          </div>
        </div>

        <button
          onClick={generateOutreach}
          disabled={isGenerating}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl btn-primary focus-ring disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
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
      <div className="flex-1 p-6 overflow-y-auto bg-neutral-950">
        {error && (
          <div className="mb-4 p-3 bg-folly/10 border border-folly/40 rounded-lg">
            <div className="flex items-center gap-2 text-folly">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {generatedMessage ? (
          <div className="rounded-xl bg-white p-0 text-sm leading-6 text-neutral-800 shadow-sm dark:border-white/10 dark:bg-[#141522] dark:text-neutral-100">
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <h4 className="font-semibold">Generated Message</h4>
              <button
                onClick={copyToClipboard}
                className="btn-ghost inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-xl focus-ring"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed bg-neutral-950/60 p-4 rounded-lg border border-white/10">
                {generatedMessage}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-3 border border-neutral-800">
              <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-neutral-200 mb-2">Ready to Generate</h4>
            <p className="text-neutral-400 text-sm">
              Configure your outreach settings above and click &quot;Generate Outreach&quot; to create a personalized message.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}