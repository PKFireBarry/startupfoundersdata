"use client";

import { useState, type ChangeEvent } from 'react';

interface JobData {
  company?: string;
  company_info?: string;
  name?: string;
  role?: string;
  looking_for?: string;
  company_url?: string;
  url?: string;
  apply_url?: string;
  linkedinurl?: string;
  email?: string;
  published?: any;
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
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white text-neutral-900 dark:bg-[#11121b] dark:text-neutral-100 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
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
            {/* Header with Avatar and Company Info */}
            <div className="flex items-start gap-3">
              <div className="card-initials flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden flex-shrink-0" style={{
                background: 'rgba(5,32,74,.20)',
                color: 'var(--lavender-web)',
                border: '1px solid var(--oxford-blue)'
              }}>
                <span className="font-semibold">{getInitials()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-lg font-semibold text-white mb-1 truncate">{jobData.company || "Unknown Company"}</h4>
                {jobData.company_info && (
                  <div className="text-xs text-neutral-300 mb-2 line-clamp-2" title={jobData.company_info}>
                    {jobData.company_info.length > 80 ? `${jobData.company_info.substring(0, 80)}...` : jobData.company_info}
                  </div>
                )}
                <div className="text-xs text-neutral-400">
                  {jobData.published && jobData.published.toDate ? (
                    <span>{new Date(jobData.published.toDate()).toLocaleDateString()} • {(() => {
                      const now = new Date();
                      const published = jobData.published.toDate();
                      const diffMs = now.getTime() - published.getTime();
                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                      const diffWeeks = Math.floor(diffDays / 7);
                      const diffMonths = Math.floor(diffDays / 30);
                      
                      if (diffDays < 1) return 'today';
                      if (diffDays === 1) return '1 day ago';
                      if (diffDays < 7) return `${diffDays} days ago`;
                      if (diffWeeks === 1) return '1 week ago';
                      if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
                      if (diffMonths === 1) return '1 month ago';
                      return `${diffMonths} months ago`;
                    })()}</span>
                  ) : 'Recently'}
                </div>
              </div>
            </div>

            {/* Contact Name */}
            {jobData.name && jobData.name !== jobData.company && (
              <div>
                <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Contact</span>
                <div className="text-sm font-medium text-neutral-100 truncate mt-1">{jobData.name}</div>
              </div>
            )}

            {/* Role */}
            <div>
              <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Role</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {jobData.role ? (
                  jobData.role.split(',').slice(0, 2).map((singleRole, index) => {
                    const trimmedRole = singleRole.trim();
                    const truncatedRole = trimmedRole.length > 18 ? trimmedRole.substring(0, 18) + '...' : trimmedRole;
                    return (
                      <span 
                        key={index} 
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" 
                        style={{
                          border: '1px solid rgba(180,151,214,.3)',
                          background: 'rgba(180,151,214,.12)',
                          color: 'var(--wisteria)'
                        }}
                        title={trimmedRole}
                      >
                        {truncatedRole}
                      </span>
                    );
                  })
                ) : (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{
                    border: '1px solid rgba(180,151,214,.3)',
                    background: 'rgba(180,151,214,.12)',
                    color: 'var(--wisteria)'
                  }}>
                    Founder
                  </span>
                )}
              </div>
            </div>
            
            {/* Contact Info */}
            <div>
              <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Contact Info</div>
              <div className="flex flex-wrap gap-1">
                {jobData.linkedinurl && (
                  <a href={jobData.linkedinurl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a] transition-colors text-xs" aria-label="LinkedIn profile">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-blue-600"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v16H0zM8 8h4.8v2.2h.07c.67-1.2 2.3-2.46 4.74-2.46 5.07 0 6 3.34 6 7.68V24h-5V16.4c0-1.81-.03-4.14-2.52-4.14-2.52 0-2.91 1.97-2.91 4v7.74H8z"/></svg>
                    LinkedIn
                  </a>
                )}
                {jobData.email && jobData.email !== 'n/a' && (
                  <a href={`mailto:${jobData.email}`} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a] transition-colors text-xs" aria-label="Email">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-green-600"><path d="M2 6.75A2.75 2.75 0 0 1 4.75 4h14.5A2.75 2.75 0 0 1 22 6.75v10.5A2.75 2.75 0 0 1 19.25 20H4.75A2.75 2.75 0 0 1 2 17.25V6.75Z"/><path d="m4 6 8 6 8-6" opacity=".35"/></svg>
                    Email
                  </a>
                )}
                {/* Roles/Careers URL */}
                {jobData.url && jobData.url !== jobData.apply_url && (
                  <a href={jobData.url.startsWith('http') ? jobData.url : `https://${jobData.url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 py-1 hover:bg-purple-100 dark:border-purple-500/30 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 transition-colors text-xs text-purple-700 dark:text-purple-400" aria-label="Careers">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3"><path d="M10 6h4a2 2 0 0 1 2 2v1h-8V8a2 2 0 0 1 2-2Zm-4 5h12a2 2 0 0 1 2 2v6H4v-6a2 2 0 0 1 2-2Z"/></svg>
                    Careers
                  </a>
                )}
                {/* Company Website */}
                {jobData.company_url && (
                  <a href={jobData.company_url.startsWith('http') ? jobData.company_url : `https://${jobData.company_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a] transition-colors text-xs" aria-label="Website">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-neutral-600">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    Website
                  </a>
                )}
                {/* Apply URL */}
                {jobData.apply_url && (
                  <a href={jobData.apply_url.startsWith('http') ? jobData.apply_url : `https://${jobData.apply_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1 hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:hover:bg-green-500/20 transition-colors text-xs text-green-700 dark:text-green-400" aria-label="Apply">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                      <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
                    </svg>
                    Apply
                  </a>
                )}
              </div>
            </div>

            {/* Looking For */}
            {jobData.looking_for && (
              <div>
                <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Looking for</div>
                <div className="flex flex-wrap gap-1">
                  {String(jobData.looking_for)
                    .split(/[,;]/)
                    .map(t => t.trim())
                    .filter(Boolean)
                    .map((t, i) => (
                      <span key={i} className="tag inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] leading-tight">{t}</span>
                    ))}
                </div>
              </div>
            )}
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