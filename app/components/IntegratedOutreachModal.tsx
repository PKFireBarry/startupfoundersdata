"use client";

import { useState, type ChangeEvent } from 'react';

interface JobData {
  company?: string;
  name?: string;
  role?: string;
  looking_for?: string;
  company_url?: string;
  linkedinurl?: string;
  email?: string;
}

interface IntegratedOutreachModalProps {
  jobData: JobData;
  userProfile: unknown;
  onClose: () => void;
}

export default function IntegratedOutreachModal({ jobData, onClose }: IntegratedOutreachModalProps) {
  const [outreachType, setOutreachType] = useState<'job' | 'collaboration' | 'friendship'>('job');
  const [messageType, setMessageType] = useState<'email' | 'linkedin'>('email');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Helper to derive initials for the card avatar
  const getInitials = () => {
    const source = (jobData.name || jobData.company || '').trim();
    if (!source) return '';
    const parts = source.split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() ?? '').join('');
  };

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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white text-neutral-900 dark:bg-[#11121b] dark:text-neutral-100 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="text-base font-semibold">Create Outreach</h3>
          <button
            onClick={onClose}
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-[#141522]"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M6.225 4.811 4.811 6.225 10.586 12l-5.775 5.775 1.414 1.414L12 13.414l5.775 5.775 1.414-1.414L13.414 12l5.775-5.775-1.414-1.414L12 10.586 6.225 4.811Z"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 grid gap-5 overflow-y-auto max-h-[calc(90vh-64px)]">
          {/* Contact summary */}
          <section className="grid grid-cols-1 gap-4 rounded-xl border border-white/10 bg-[#141522] p-4">
            <div className="flex items-start gap-3">
              <div className="card-initials flex h-12 w-12 items-center justify-center rounded-xl">
                <span className="font-semibold">{getInitials()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-base font-semibold">{jobData.name || jobData.company || 'Contact'}</h4>
                    {(jobData.role || jobData.company) && (
                      <p className="mt-0.5 text-xs text-neutral-400">{jobData.role || 'Founder'}</p>
                    )}
                  </div>
                  <div className="hidden sm:flex gap-2 text-xs">
                    {jobData.linkedinurl && (
                      <a href={jobData.linkedinurl} target="_blank" rel="noopener noreferrer" className="rounded-lg px-2 py-1 border border-white/10 bg-[#141522] hover:bg-[#18192a]">LinkedIn</a>
                    )}
                    {jobData.email && jobData.email !== 'n/a' && (
                      <a href={`mailto:${jobData.email}`} className="rounded-lg px-2 py-1 border border-white/10 bg-[#141522] hover:bg-[#18192a]">{jobData.email}</a>
                    )}
                    {jobData.company_url && (
                      <a href={jobData.company_url} target="_blank" rel="noopener noreferrer" className="rounded-lg px-2 py-1 border border-white/10 bg-[#141522] hover:bg-[#18192a]">{(jobData.company_url || '').replace(/^https?:\/\//, '')}</a>
                    )}
                  </div>
                </div>
                {jobData.looking_for && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {String(jobData.looking_for)
                      .split(/[,;]/)
                      .map(t => t.trim())
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((t, i) => (
                        <span key={i} className="tag inline-flex items-center rounded-full px-2 py-0.5 text-[11px]">{i === 0 ? `Looking for: ${t}` : t}</span>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Outreach type radios (panel style) */}
          <section className="grid gap-2">
            <label className="text-sm font-medium">Outreach type</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {Object.entries(outreachTypeLabels).map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm panel hover:bg-[#18192a]">
                  <input
                    type="radio"
                    name="outreachType"
                    value={key}
                    checked={outreachType === key}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setOutreachType(e.target.value as 'job' | 'collaboration' | 'friendship')}
                    className="text-[var(--lavender-web)] focus:ring-[var(--lavender-web)]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          {/* Channel segmented control */}
          <section className="grid gap-2">
            <label className="text-sm font-medium">Channel</label>
            <div className="segmented inline-flex overflow-hidden rounded-xl border border-white/10 text-sm bg-[#141522]">
              <input
                id="ch-email"
                type="radio"
                name="channel"
                checked={messageType === 'email'}
                onChange={() => setMessageType('email')}
              />
              <label htmlFor="ch-email" className="px-3 py-1.5">Email</label>
              <input
                id="ch-linkedin"
                type="radio"
                name="channel"
                checked={messageType === 'linkedin'}
                onChange={() => setMessageType('linkedin')}
              />
              <label htmlFor="ch-linkedin" className="px-3 py-1.5">LinkedIn</label>
            </div>
          </section>

          {/* Error (shown even when no preview) */}
          {error && (
            <div className="p-3 bg-folly/10 border border-folly/40 rounded-lg">
              <div className="flex items-center gap-2 text-folly text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Message preview (only after message is generated) */}
          {generatedMessage && (
            <section className="grid gap-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Message preview</h4>
              </div>
              <div className="rounded-xl bg-white p-4 text-sm leading-6 text-neutral-800 shadow-sm dark:border-white/10 dark:bg-[#141522] dark:text-neutral-100">
                {messageType === 'email' && (
                  <div className="mb-2 grid gap-1 text-xs text-neutral-600 dark:text-neutral-300">
                    <div><span className="font-semibold">To:</span> <span>{jobData.email || '—'}</span></div>
                    <div><span className="font-semibold">Subject:</span> Personalized outreach</div>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{generatedMessage}</div>
              </div>
            </section>
          )}

          {/* Modal actions */}
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="focus-ring rounded-xl btn-ghost px-3 py-2 text-sm font-medium">Close</button>
            <div className="flex items-center gap-2">
              <button
                onClick={generateOutreach}
                disabled={isGenerating}
                className="focus-ring rounded-xl px-3.5 py-2 text-sm font-semibold btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Generating…' : 'Generate'}
              </button>
              <button
                onClick={copyToClipboard}
                disabled={!generatedMessage}
                className="focus-ring rounded-xl px-3.5 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ border: '1px solid rgba(225,226,239,.30)', background: 'rgba(225,226,239,.12)', color: 'var(--lavender-web)' }}
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}