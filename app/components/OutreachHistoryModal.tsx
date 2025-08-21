'use client';

import { useState } from 'react';

interface OutreachHistoryModalProps {
  record: any;
  onClose: () => void;
}

export default function OutreachHistoryModal({ record, onClose }: OutreachHistoryModalProps) {
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

  const formatDate = (date: any) => {
    if (!date) return 'Unknown date';
    const d = date?.toDate?.() || new Date(date);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChannelIcon = (channel: string) => {
    if (channel === 'email') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 bg-[#0f1015] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
              {record.initials}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{record.name}</h2>
              <p className="text-sm text-neutral-400">{record.company}</p>
              {/* Contact Info */}
              <div className="flex items-center gap-3 mt-2">
                {record.email && record.email !== 'n/a' && (
                  <a
                    href={`mailto:${record.email}`}
                    className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
                    title={`Send email to ${record.email}`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {record.email.length > 20 ? record.email.substring(0, 17) + '...' : record.email}
                  </a>
                )}
                {record.linkedin && (
                  <a
                    href={record.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
                    title="View LinkedIn Profile"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">Outreach History</h3>
            <p className="text-sm text-neutral-400">
              {record.outreachHistory?.length || 1} message{(record.outreachHistory?.length || 1) > 1 ? 's' : ''} sent
            </p>
          </div>

          <div className="space-y-4">
            {(record.outreachHistory || [record]).map((outreach: any, index: number) => (
              <div key={outreach.id || index} className="border border-white/10 rounded-xl p-4 bg-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-neutral-400">
                      {getChannelIcon(outreach.channel)}
                      <span className="text-sm capitalize">{outreach.channel}</span>
                    </div>
                    <span className="text-xs text-neutral-500">•</span>
                    <span className="text-xs text-neutral-400">{formatDate(outreach.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400">
                      {outreach.type}
                    </span>
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400">
                      {outreach.stage}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <h4 className="text-sm font-medium text-white mb-1">
                    {outreach.subject || 'No subject'}
                  </h4>
                </div>

                <div className="relative">
                  <div 
                    className={`text-sm text-neutral-300 leading-relaxed ${
                      expandedMessage === outreach.id ? '' : 'line-clamp-3'
                    }`}
                  >
                    {outreach.message}
                  </div>
                  {outreach.message && outreach.message.length > 200 && (
                    <button
                      onClick={() => setExpandedMessage(
                        expandedMessage === outreach.id ? null : outreach.id
                      )}
                      className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {expandedMessage === outreach.id ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
