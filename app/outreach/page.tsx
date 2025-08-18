"use client";

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { clientDb } from '../../lib/firebase/client';
import Navigation from '../components/Navigation';
import { useToast } from '../hooks/useToast';

interface OutreachRecord {
  id: string;
  ownerUserId: string;
  contactId: string;
  founderName: string;
  company: string;
  linkedinUrl: string;
  email: string;
  messageType: 'email' | 'linkedin';
  outreachType: 'job' | 'collaboration' | 'friendship';
  generatedMessage: string;
  stage: string;
  createdAt: any;
  updatedAt: any;
  notes?: string;
}

// Stage definitions matching the design
const EMAIL_STAGES = ["Sent", "Responded", "In Talks", "Interviewing", "Rejected", "Hired"];
const LINKEDIN_STAGES = ["Sent", "Responded", "Connected", "Ghosted"];

// Seed demo data matching the design
const DEMO_DATA = [
  { 
    id: 'c1', 
    channel: 'email', 
    stage: 'Sent', 
    name: 'Alex Rivera', 
    initials: 'AR', 
    role: 'Founder', 
    type: 'Job Inquiry', 
    email: 'alex@acme.ai', 
    linkedin: 'https://linkedin.com/in/alex', 
    subject: 'Founding Engineer at Acme AI', 
    message: 'Hi Alex — I admire Acme AI. I would love to discuss a founding engineer role focused on agents and infra. Quick intro below and links to my work…' 
  },
  { 
    id: 'c2', 
    channel: 'email', 
    stage: 'Responded', 
    name: 'Priya Shah', 
    initials: 'PS', 
    role: 'CTO', 
    type: 'Collaboration', 
    email: 'pshah@vector.dev', 
    linkedin: 'https://linkedin.com/in/priya', 
    subject: 'Design Partner Collaboration', 
    message: 'Hi Priya — Loved your recent talk. We are building tooling for LLM evals and would love Vector as a design partner. Are you open to a 20-min chat this week?' 
  },
  { 
    id: 'c3', 
    channel: 'linkedin', 
    stage: 'Sent', 
    name: 'Ben Lee', 
    initials: 'BL', 
    role: 'Founder', 
    type: 'Friendship', 
    email: '', 
    linkedin: 'https://linkedin.com/in/ben', 
    subject: 'Big fan of your work', 
    message: 'Hey Ben — huge fan of your work on agents. Would love to connect and swap notes on evaluation and long-context strategies.' 
  },
  { 
    id: 'c4', 
    channel: 'linkedin', 
    stage: 'Connected', 
    name: 'Mina Okafor', 
    initials: 'MO', 
    role: 'Head of Eng', 
    type: 'Job Inquiry', 
    email: 'mina@atlas.so', 
    linkedin: 'https://linkedin.com/in/mina', 
    subject: 'Thanks for connecting!', 
    message: 'Appreciate the connection, Mina. Quick question about Atlas eng roles and the stack you are building. Would love to see if my background could be a fit.' 
  },
];

export default function OutreachBoard() {
  const { isSignedIn, user } = useUser();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('email');
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const { success, error, ToastContainer } = useToast();

  useEffect(() => {
    // Load demo data for now - in production this would load from Firebase
    const storedData = localStorage.getItem('kanban-demo-v2');
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        setRecords(Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEMO_DATA]);
      } catch {
        setRecords([...DEMO_DATA]);
      }
    } else {
      setRecords([...DEMO_DATA]);
      localStorage.setItem('kanban-demo-v2', JSON.stringify(DEMO_DATA));
    }
    setLoading(false);
  }, []);

  const saveToStorage = (data: any[]) => {
    try {
      localStorage.setItem('kanban-demo-v2', JSON.stringify(data));
      setRecords(data);
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: any) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem(item);
    (e.target as HTMLElement).classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('dragging');
    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('drop-highlight');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('drop-highlight');
  };

  const handleDrop = (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drop-highlight');
    
    const itemId = e.dataTransfer.getData('text/plain');
    const updatedRecords = records.map(item => {
      if (item.id === itemId && item.channel === currentTab) {
        return { ...item, stage: newStage };
      }
      return item;
    });
    
    saveToStorage(updatedRecords);
  };

  const getStageColor = (stage: string) => {
    const colorMap: Record<string, string> = {
      'Sent': 'bg-[#7f8bb3]',
      'Responded': 'bg-[#b497d6]',
      'In Talks': 'bg-[#c7a8e6]',
      'Interviewing': 'bg-[#e1e2ef]',
      'Rejected': 'bg-[#9b4444]',
      'Hired': 'bg-[#62c98d]',
      'Connected': 'bg-[#7fb3a6]',
      'Ghosted': 'bg-[#8b7f7f]'
    };
    return colorMap[stage] || 'bg-[#a6a7b4]';
  };

  const countByStage = (channel: string) => {
    const stages = channel === 'email' ? EMAIL_STAGES : LINKEDIN_STAGES;
    const counts = Object.fromEntries(stages.map(s => [s, 0]));
    records.filter(x => x.channel === channel).forEach(x => {
      counts[x.stage] = (counts[x.stage] || 0) + 1;
    });
    return counts;
  };

  const renderStatsBar = (channel: string) => {
    const stages = channel === 'email' ? EMAIL_STAGES : LINKEDIN_STAGES;
    const counts = countByStage(channel);
    
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {stages.map(stage => (
          <div key={stage} className="stat-pill rounded-xl px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`stat-dot ${getStageColor(stage)}`}></span>
              <span className="text-[12px] text-neutral-300">{stage}</span>
            </div>
            <span className="text-[12px] font-semibold text-white">{counts[stage] || 0}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderKanbanBoard = (channel: string) => {
    const stages = channel === 'email' ? EMAIL_STAGES : LINKEDIN_STAGES;
    const channelRecords = records.filter(r => r.channel === channel);
    
    return (
      <div className={`kanban-board ${channel === 'linkedin' ? 'columns-4' : ''}`} aria-live="polite">
        {stages.map(stage => (
          <div key={stage} className="kanban-col rounded-2xl" data-stage={stage} data-channel={channel}>
            <div className="kanban-col-header flex items-center justify-between rounded-t-2xl px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md brand-badge text-[11px] font-bold">
                  {stage[0]}
                </span>
                <span className="text-[13px] font-semibold text-white">{stage}</span>
              </div>
              <span className="text-[11px] text-neutral-400">
                <span className="count">{channelRecords.filter(r => r.stage === stage).length}</span>
              </span>
            </div>
            <div 
              className="p-2 grid gap-2 min-h-[100px]"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
            >
              {channelRecords
                .filter(record => record.stage === stage)
                .map(record => (
                  <article
                    key={record.id}
                    className="kanban-card rounded-xl p-3 text-sm select-none"
                    draggable
                    onDragStart={(e) => handleDragStart(e, record)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-start gap-2">
                      <div className="card-initials flex h-9 w-9 items-center justify-center rounded-lg brand-badge">
                        {record.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate text-[13px] font-semibold">{record.name}</h3>
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide role-badge-founder">
                            {record.role}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span className="tag inline-flex items-center rounded-full px-2 py-0.5 text-[11px]">
                            {record.type}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            • {record.channel === 'email' ? 'Email' : 'LinkedIn'}
                          </span>
                        </div>
                        <button 
                          className="mt-2 w-full text-left rounded-lg panel px-2 py-2 hover:bg-[#18192a]"
                          onClick={() => {
                            setSelectedMessage(record);
                            setShowModal(true);
                          }}
                        >
                          <div className="truncate text-[12px] font-semibold text-white">
                            {record.subject || 'Message'}
                          </div>
                          <div className="mt-0.5 line-clamp-2 text-[12px] text-neutral-300">
                            {record.message?.length > 140 ? record.message.slice(0, 139) + '…' : record.message}
                          </div>
                        </button>
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-neutral-400">
                          {record.email && (
                            <a 
                              href={`mailto:${record.email}`} 
                              className="rounded-lg px-2 py-1 panel hover:bg-[#18192a]" 
                              title="Email"
                            >
                              Email
                            </a>
                          )}
                          {record.linkedin && (
                            <a 
                              href={record.linkedin} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="rounded-lg px-2 py-1 panel hover:bg-[#18192a]" 
                              title="LinkedIn"
                            >
                              LinkedIn
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white mb-2">Welcome to Founder Flow</h1>
            <p className="text-[#ccceda] mb-6">Sign in to access your outreach board</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Page header */}
      <header className="mx-auto max-w-7xl px-4 pt-5 sm:pt-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-white">Outreach Board</h1>
            <p className="text-sm text-[#ccceda]">Track the full life cycle of your conversations with founders across Email and LinkedIn.</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:pt-6">
        <div role="tablist" aria-label="Outreach channels" className="inline-flex rounded-xl border border-white/10 panel p-1 text-sm">
          <button 
            id="tab-email-btn" 
            role="tab" 
            aria-selected={currentTab === 'email'} 
            aria-controls="tab-email" 
            className={`tab-btn focus-ring rounded-lg px-3 py-1.5 text-neutral-200 ${
              currentTab === 'email' ? 'bg-[var(--lavender-web)] text-[#0f1018]' : ''
            }`}
            onClick={() => setCurrentTab('email')}
          >
            Email
          </button>
          <button 
            id="tab-linkedin-btn" 
            role="tab" 
            aria-selected={currentTab === 'linkedin'} 
            aria-controls="tab-linkedin" 
            className={`tab-btn focus-ring rounded-lg px-3 py-1.5 text-neutral-200 ${
              currentTab === 'linkedin' ? 'bg-[var(--lavender-web)] text-[#0f1018]' : ''
            }`}
            onClick={() => setCurrentTab('linkedin')}
          >
            LinkedIn
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mx-auto max-w-7xl px-4 pt-4">
        {renderStatsBar(currentTab)}
      </div>

      {/* Boards */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {currentTab === 'email' && (
          <section id="tab-email" role="tabpanel" aria-labelledby="tab-email-btn">
            {renderKanbanBoard('email')}
          </section>
        )}
        {currentTab === 'linkedin' && (
          <section id="tab-linkedin" role="tabpanel" aria-labelledby="tab-linkedin-btn">
            {renderKanbanBoard('linkedin')}
          </section>
        )}
      </main>

      {/* Message Modal */}
      {showModal && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)}></div>
          <div className="relative z-10 w-[min(720px,92vw)] rounded-2xl panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 shrink-0 rounded-xl brand-badge flex items-center justify-center font-semibold">
                  {selectedMessage.initials}
                </div>
                <div>
                  <div className="text-base font-semibold text-white">{selectedMessage.name}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                    <span>{selectedMessage.role}</span>
                    <span>•</span>
                    <span>{selectedMessage.channel === 'email' ? 'Email' : 'LinkedIn'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="tag inline-flex items-center rounded-full px-2 py-0.5 text-[11px]">
                  {selectedMessage.type}
                </span>
                <button 
                  className="focus-ring rounded-lg px-2.5 py-1 text-xs font-semibold btn-primary"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              {selectedMessage.email && (
                <a 
                  href={`mailto:${selectedMessage.email}`} 
                  className="rounded-lg px-2 py-1 panel hover:bg-[#18192a] flex items-center gap-1"
                >
                  <svg viewBox="0 0 24 24" fill="#e8e9f1" className="h-3.5 w-3.5">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z"/>
                  </svg>
                  <span>{selectedMessage.email}</span>
                </a>
              )}
              {selectedMessage.linkedin && (
                <a 
                  href={selectedMessage.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="rounded-lg px-2 py-1 panel hover:bg-[#18192a] flex items-center gap-1"
                >
                  <svg viewBox="0 0 24 24" fill="#e8e9f1" className="h-3.5 w-3.5">
                    <path d="M6 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM4 8h4v12H4V8Zm6 0h4v2.5c.6-1.1 2.1-2.5 4.7-2.5 5 0 5.3 3.3 5.3 7.6V20h-4v-5.3c0-2.1 0-4.7-2.9-4.7s-3.4 2.2-3.4 4.6V20h-4V8Z"/>
                  </svg>
                  <span>linkedin.com/in/{selectedMessage.name.toLowerCase().replace(' ', '')}</span>
                </a>
              )}
            </div>
            <div className="mt-4 grid gap-2">
              <div className="text-sm font-semibold text-white">{selectedMessage.subject || 'Subject'}</div>
              <div className="rounded-xl panel p-3 text-[13px] leading-6 text-neutral-200 whitespace-pre-wrap">
                {selectedMessage.message}
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}