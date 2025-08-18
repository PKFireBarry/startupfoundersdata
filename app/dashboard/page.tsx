"use client";

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { clientDb } from '../../lib/firebase/client';
import Navigation from '../components/Navigation';
import { useToast } from '../hooks/useToast';
import OutreachGeneratorPanel from '../components/OutreachGeneratorPanel';
import ProfileEditor from '../components/ProfileEditor';

interface SavedJob {
  id: string;
  userId: string;
  jobId: string;
  savedAt?: Timestamp | null;
  // Job data
  company: string;
  name?: string;
  role?: string;
  looking_for?: string;
  company_url?: string;
  url?: string;
  linkedinurl?: string;
  email?: string;
  published?: Timestamp | null;
}

interface UserProfile {
  resumeText: string;
  goals: string;
  resumePdfBase64: string;
  resumeFilename: string;
}

export default function Dashboard() {
  const { isSignedIn, user } = useUser();
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contacts' | 'context'>('contacts');
  const [sortBy, setSortBy] = useState('most_recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobForOutreach, setSelectedJobForOutreach] = useState<SavedJob | null>(null);
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const { success, error, ToastContainer } = useToast();
  const [, setUserProfile] = useState<UserProfile | null>(null);

  const tsToMs = (ts?: Timestamp | null): number => {
    if (!ts) return 0;
    return ts.toMillis();
  };

  useEffect(() => {
    if (!isSignedIn || !user?.id) {
      setLoading(false);
      return;
    }

    const loadSavedJobs = async () => {
      try {
        const q = query(
          collection(clientDb, "saved_jobs"),
          where("userId", "==", user.id)
        );
        const snapshot = await getDocs(q);
        const jobs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SavedJob[];
        setSavedJobs(jobs);
      } catch (error) {
        console.error("Error loading saved jobs:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSavedJobs();
  }, [isSignedIn, user?.id]);

  // Removed unused removeSavedJob to satisfy lint and keep this page minimal

  const getRoleBadgeClass = (role?: string) => {
    if (!role) return 'role-badge-founder';
    const roleStr = role.toLowerCase();
    if (roleStr.includes('founder') || roleStr.includes('ceo') || roleStr.includes('co-founder')) {
      return 'role-badge-founder';
    } else if (roleStr.includes('eng') || roleStr.includes('tech') || roleStr.includes('dev')) {
      return 'role-badge-eng';
    } else if (roleStr.includes('gtm') || roleStr.includes('marketing') || roleStr.includes('growth')) {
      return 'role-badge-gtm';
    }
    return 'role-badge-founder';
  };

  const getInitials = (name?: string, company?: string) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (company) {
      const parts = company.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    return 'XX';
  };

  const getLastOutreachText = () => {
    // This would normally query outreach records, but for now return placeholder
    const options = ['never', '2 weeks ago', '4 days ago', '1 week ago'];
    return options[Math.floor(Math.random() * options.length)];
  };

  const getTags = (job: SavedJob) => {
    const tags = [];
    if (job.looking_for) {
      // Extract key phrases from looking_for text
      const lookingFor = job.looking_for.toLowerCase();
      if (lookingFor.includes('design partner')) tags.push('Design partners');
      if (lookingFor.includes('seed') || lookingFor.includes('funding')) tags.push('Seed funding');
      if (lookingFor.includes('hire') || lookingFor.includes('hiring')) {
        if (lookingFor.includes('gtm')) tags.push('Hiring GTM');
        else tags.push('Hiring');
      }
      if (lookingFor.includes('beta') || lookingFor.includes('user')) tags.push('Beta users');
      if (lookingFor.includes('advice') || lookingFor.includes('mentor')) tags.push('Advice');
      if (lookingFor.includes('customer') || lookingFor.includes('client')) tags.push('Customer');
    }
    return tags.slice(0, 2); // Max 2 tags per card
  };

  const filteredJobs = savedJobs.filter(job => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.company?.toLowerCase().includes(query) ||
      job.name?.toLowerCase().includes(query) ||
      job.role?.toLowerCase().includes(query) ||
      job.looking_for?.toLowerCase().includes(query)
    );
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case 'most_recent':
        return tsToMs(b.savedAt) - tsToMs(a.savedAt);
      case 'a_to_z':
        return (a.name || a.company || '').localeCompare(b.name || b.company || '');
      case 'last_outreach':
        // Would implement based on actual outreach data
        return 0;
      default:
        return 0;
    }
  });

  if (!isSignedIn) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white mb-2">Welcome to Founder Flow</h1>
            <p className="text-[#ccceda] mb-6">Sign in to save opportunities and manage your outreach</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen antialiased">
      <Navigation />
      
      {/* Tabs */}
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:pt-6">
        <div role="tablist" aria-label="Page sections" className="inline-flex rounded-xl border border-white/10 panel p-1 text-sm">
          <button 
            id="tab-contacts-btn" 
            role="tab" 
            aria-selected={activeTab === 'contacts'} 
            aria-controls="tab-contacts" 
            className={`tab-btn focus-ring rounded-lg px-3 py-1.5 text-neutral-200 ${
              activeTab === 'contacts' ? 'bg-[var(--lavender-web)] text-[#0f1018]' : ''
            }`}
            onClick={() => setActiveTab('contacts')}
          >
            Contacts
          </button>
          <button 
            id="tab-context-btn" 
            role="tab" 
            aria-selected={activeTab === 'context'} 
            aria-controls="tab-context" 
            className={`tab-btn focus-ring rounded-lg px-3 py-1.5 text-neutral-200 ${
              activeTab === 'context' ? 'bg-[var(--lavender-web)] text-[#0f1018]' : ''
            }`}
            onClick={() => setActiveTab('context')}
          >
            Context Settings
          </button>
        </div>
      </div>

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <section id="tab-contacts" role="tabpanel" aria-labelledby="tab-contacts-btn" className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
          {/* Page title and meta */}
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-semibold text-white">Saved Founder Contacts</h1>
            <span className="hidden sm:inline text-sm text-[#ccceda]">{savedJobs.length} saved</span>
          </div>

          {/* Controls above cards: Sort + keyword search */}
          <div className="mb-4 grid gap-3 sm:flex sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-[#ccceda]">Sort</label>
              <select 
                className="focus-ring rounded-xl border border-white/10 panel px-3 py-2 text-sm text-white"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option className="text-neutral-900" value="most_recent">Most Recent</option>
                <option className="text-neutral-900" value="last_outreach">Last Outreach</option>
                <option className="text-neutral-900" value="a_to_z">A → Z</option>
              </select>
            </div>
            <div className="flex-1 sm:max-w-sm">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search by keywords (e.g., seed, design partners, GTM)" 
                  className="w-full rounded-xl border border-white/10 panel px-3.5 py-2 text-sm text-white placeholder-[#a9abb6] focus:outline-none focus:ring-2" 
                  style={{"--tw-ring-color": "var(--lavender-web)"} as React.CSSProperties} 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#a9abb6]">⌘K</span>
              </div>
            </div>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <article key={i} className="rounded-2xl bg-[#11121b] border border-white/10 overflow-hidden animate-pulse">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 bg-white/10 rounded-xl"></div>
                      <div className="min-w-0 flex-1">
                        <div className="h-4 bg-white/10 rounded mb-2"></div>
                        <div className="h-3 bg-white/10 rounded w-2/3"></div>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : sortedJobs.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <div className="w-16 h-16 panel rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No contacts found</h3>
                <p className="text-[#ccceda] mb-6 max-w-sm mx-auto">
                  {searchQuery ? 'Try adjusting your search terms.' : 'Browse opportunities and save contacts to start building your network.'}
                </p>
                {!searchQuery && (
                  <Link 
                    href="/entry"
                    className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Browse Opportunities
                  </Link>
                )}
              </div>
            ) : (
              sortedJobs.map((job) => {
                const tags = getTags(job);
                const lastOutreach = getLastOutreachText();
                const initials = getInitials(job.name, job.company);
                const roleBadgeClass = getRoleBadgeClass(job.role);
                
                return (
                  <article key={job.id} className="rounded-2xl bg-neutral-50 text-neutral-900 shadow-card ring-1 ring-black/10 overflow-hidden dark:bg-[#11121b] dark:text-neutral-100 dark:ring-white/10">
                    <div className="flex items-start gap-3 p-4">
                      <div className="card-initials flex h-12 w-12 items-center justify-center rounded-xl">
                        <span className="font-semibold">{initials}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate text-base font-semibold">{job.name || job.company}</h3>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleBadgeClass}`}>
                            {job.role || 'Founder'}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          {job.linkedinurl && (
                            <a href={job.linkedinurl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a]" aria-label="LinkedIn profile">
                              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-neutral-400"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v16H0zM8 8h4.8v2.2h.07c.67-1.2 2.3-2.46 4.74-2.46 5.07 0 6 3.34 6 7.68V24h-5V16.4c0-1.81-.03-4.14-2.52-4.14-2.52 0-2.91 1.97-2.91 4v7.74H8z"/></svg>
                              <span className="truncate">LinkedIn</span>
                            </a>
                          )}
                          {job.email && job.email !== 'n/a' && (
                            <a href={`mailto:${job.email}`} className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a]" aria-label="Email">
                              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-neutral-400"><path d="M2 6.75A2.75 2.75 0 0 1 4.75 4h14.5A2.75 2.75 0 0 1 22 6.75v10.5A2.75 2.75 0 0 1 19.25 20H4.75A2.75 2.75 0 0 1 2 17.25V6.75Z"/><path d="m4 6 8 6 8-6" opacity=".35"/></svg>
                              <span className="truncate">{job.email.split('@')[0]}@...</span>
                            </a>
                          )}
                          {job.company_url && (
                            <a href={job.company_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a]" aria-label="Website">
                              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-neutral-400"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 0c-2.5 0-4 4.477-4 10s1.5 10 4 10 4-4.477 4-10-1.5-10-4-10Z"/><path d="M2 12h20" opacity=".35"/></svg>
                              <span className="truncate">{job.company_url.replace(/https?:\/\/(www\.)?/, '').split('/')[0]}</span>
                            </a>
                          )}
                        </div>
                        {tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {tags.map((tag, index) => (
                              <span key={index} className="tag inline-flex items-center rounded-full px-2 py-0.5 text-[11px]">{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-neutral-500">Last outreach: {lastOutreach}</span>
                          <button
                            onClick={() => {
                              setSelectedJobForOutreach(job);
                              setShowOutreachModal(true);
                            }}
                            className="focus-ring inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs btn-primary"
                          >
                            Outreach
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* Context Settings Tab */}
      {activeTab === 'context' && (
        <section id="tab-context" role="tabpanel" aria-labelledby="tab-context-btn" className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
          <div className="mb-4">
            <h1 className="text-lg sm:text-xl font-semibold text-white">Outreach Context Settings</h1>
            <p className="text-sm text-[#ccceda]">Configure your personal details and AI context for personalized outreach messages.</p>
          </div>
          <div className="grid gap-6">
            <ProfileEditor onProfileUpdate={(p) => setUserProfile(p)} />
          </div>
        </section>
      )}

      {/* AI Outreach Modal */}
      {showOutreachModal && selectedJobForOutreach && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#11121b] rounded-2xl border border-white/10 shadow-sm overflow-hidden w-full max-w-6xl h-[calc(100vh-2rem)]">
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-50/10 to-blue-100/10 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">AI Outreach Generator</h2>
                  <p className="text-[#ccceda]">
                    Generate personalized outreach for <strong className="text-white">{selectedJobForOutreach.company || 'this opportunity'}</strong>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowOutreachModal(false);
                    setSelectedJobForOutreach(null);
                  }}
                  className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </button>
              </div>
            </div>

            <div className="flex h-full">
              {/* Left Panel - Opportunity Details */}
              <div className="w-1/3 border-r border-white/10 bg-white/5 overflow-y-auto">
                <div className="p-6">
                  <h3 className="font-semibold text-white mb-4">Opportunity Details</h3>
                  
                  {/* Company Info Card */}
                  <div className="panel rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 brand-badge rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H7m5 0v-5a2 2 0 00-2-2H8a2 2 0 00-2 2v5m5 0V9a2 2 0 00-2-2H8a2 2 0 00-2 2v10" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">{selectedJobForOutreach.company || 'Unknown Company'}</h4>
                        {selectedJobForOutreach.name && <p className="text-sm text-[#ccceda]">{selectedJobForOutreach.name}</p>}
                      </div>
                    </div>
                    
                    {selectedJobForOutreach.role && (
                      <div className="mb-3">
                        <span className="text-xs font-medium text-[#ccceda] uppercase tracking-wide">Role</span>
                        <p className="text-sm text-white mt-1">{selectedJobForOutreach.role}</p>
                      </div>
                    )}
                    
                    {selectedJobForOutreach.looking_for && (
                      <div className="mb-3">
                        <span className="text-xs font-medium text-[#ccceda] uppercase tracking-wide">Looking for</span>
                        <p className="text-sm text-white mt-1">{selectedJobForOutreach.looking_for}</p>
                      </div>
                    )}
                  </div>

                  {/* Contact Links */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-white text-sm">Contact Information</h4>
                    {selectedJobForOutreach.company_url && (
                      <a
                        href={selectedJobForOutreach.company_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 text-sm text-[#ccceda] panel rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                        </svg>
                        Company Website
                      </a>
                    )}
                    {selectedJobForOutreach.linkedinurl && (
                      <a
                        href={selectedJobForOutreach.linkedinurl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 text-sm panel rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        LinkedIn Profile
                      </a>
                    )}
                    {selectedJobForOutreach.email && selectedJobForOutreach.email !== 'n/a' && (
                      <a
                        href={`mailto:${selectedJobForOutreach.email}`}
                        className="flex items-center gap-2 p-2 text-sm panel rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v10a2 2 0 002 2z" />
                        </svg>
                        {selectedJobForOutreach.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Panel - Outreach Generator */}
              <div className="flex-1">
                <OutreachGeneratorPanel jobData={selectedJobForOutreach} contactId={selectedJobForOutreach?.id} />
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}