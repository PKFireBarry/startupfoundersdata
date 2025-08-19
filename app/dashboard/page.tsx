"use client";

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import Link from 'next/link';
import { clientDb } from '../../lib/firebase/client';
import Navigation from '../components/Navigation';
import { useToast } from '../hooks/useToast';
import IntegratedOutreachModal from '../components/IntegratedOutreachModal';
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
  const { ToastContainer } = useToast();
  const [, setUserProfile] = useState<UserProfile | null>(null);

  const tsToMs = (ts?: Timestamp | null): number => {
    if (!ts) return 0;
    return ts.toMillis();
  };

  // Normalize email display and href
  const getEmailInfo = (input?: string): { email: string; href: string } | null => {
    if (!input) return null;
    let raw = input.trim();
    if (raw.toLowerCase().startsWith('mailto:')) raw = raw.slice(7);
    if (!raw.includes('@')) return null;
    return { email: raw, href: `mailto:${raw}` };
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
        
        const jobs = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log("🔍 Loading document:", { 
            docId: doc.id, 
            company: data.company, 
            jobId: data.jobId,
            userId: data.userId,
            savedAt: data.savedAt?.toDate?.() || data.savedAt
          });
          return {
            id: doc.id,
            ...data
          };
        }) as SavedJob[];
        console.log("📋 Total loaded saved jobs:", jobs.length);
        setSavedJobs(jobs);
      } catch (error) {
        console.error("Error loading saved jobs:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSavedJobs();
  }, [isSignedIn, user?.id]);

  // Remove a saved contact from user's saved list
  const removeSavedJob = async (savedJobDocId: string) => {
    try {
      const jobToDelete = savedJobs.find(j => j.id === savedJobDocId);
      
      // Delete by querying for the jobId instead of using document ID
      if (jobToDelete?.jobId) {
        const q = query(
          collection(clientDb, "saved_jobs"),
          where("userId", "==", user?.id),
          where("jobId", "==", jobToDelete.jobId)
        );
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        // Log to server console
        await fetch('/api/debug-saved-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete_by_jobId',
            jobId: jobToDelete.jobId,
            jobData: { company: jobToDelete?.company },
            deletedDocs: snapshot.docs.length
          })
        });
      } else {
        // Fallback to document ID deletion
        await deleteDoc(doc(clientDb, "saved_jobs", savedJobDocId));
        
        await fetch('/api/debug-saved-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete_by_docId',
            docId: savedJobDocId,
            jobData: { company: jobToDelete?.company }
          })
        });
      }
      
      // Update local state immediately
      setSavedJobs(prev => prev.filter(j => j.id !== savedJobDocId));
      
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete contact. Error: " + (error as Error).message);
    }
  };

  const getRoleBadgeClass = (role?: string) => {
    return 'role-badge-founder';
  };

  const getAvatarInfo = (name?: string, company?: string, companyUrl?: string, url?: string) => {
    // Try to get favicon from website URL
    const websiteUrl = companyUrl || url;
    let faviconUrl = null;
    
    if (websiteUrl) {
      const domain = getDomainFromUrl(websiteUrl);
      if (domain) {
        faviconUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
      }
    }
    
    // Get initials as fallback
    let initials = 'UN';
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[1][0]).toUpperCase();
      } else {
        initials = parts[0].slice(0, 2).toUpperCase();
      }
    } else if (company) {
      const parts = company.split(' ');
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[1][0]).toUpperCase();
      } else {
        initials = parts[0].slice(0, 2).toUpperCase();
      }
    }
    
    return { faviconUrl, initials, displayName: name || company || 'Unknown' };
  };

  // Extract a clean domain from various possible inputs (url, bare host, or email)
  const getDomainFromUrl = (input?: string): string | null => {
    if (!input) return null;
    let str = input.trim();
    // Handle mailto or plain email
    if (str.toLowerCase().startsWith('mailto:')) {
      const email = str.slice(7);
      const parts = email.split('@');
      return parts[1] ? parts[1].toLowerCase() : null;
    }
    if (str.includes('@') && !/^https?:\/\//i.test(str)) {
      const parts = str.split('@');
      return parts[1] ? parts[1].toLowerCase() : null;
    }
    // Ensure we can parse with URL
    try {
      if (!/^https?:\/\//i.test(str)) {
        str = `https://${str}`;
      }
      const u = new URL(str);
      return u.hostname.replace(/^www\./i, '').toLowerCase();
    } catch {
      // Fallback: strip protocol and path
      const host = str.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0];
      return host ? host.toLowerCase() : null;
    }
  };

  const getLastOutreachText = () => {
    // This would normally query outreach records, but for now return placeholder
    const options = ['never', '2 weeks ago', '4 days ago', '1 week ago'];
    return options[Math.floor(Math.random() * options.length)];
  };

  const getTags = (job: SavedJob) => {
    const tags = [];
    if (job.looking_for) {
      // Split by common delimiters and clean up
      const lookingForItems = job.looking_for.split(/[,;\n]/).map(item => item.trim()).filter(item => item.length > 0);
      // Take first 2 items directly
      tags.push(...lookingForItems.slice(0, 2));
    }
    return tags;
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
                  placeholder="Search by keywords" 
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
                const avatarInfo = getAvatarInfo(job.name, job.company, job.company_url, job.url);
                const roleBadgeClass = getRoleBadgeClass(job.role);
                
                return (
                  <article key={job.id} className="rounded-2xl bg-neutral-50 text-neutral-900 shadow-card ring-1 ring-black/10 overflow-hidden dark:bg-[#11121b] dark:text-neutral-100 dark:ring-white/10">
                    <div className="p-4 h-[450px] grid grid-cols-[48px_1fr] gap-3 grid-rows-[auto_50px_auto_80px_1fr_auto]">
                      {/* Avatar */}
                      <div className="card-initials flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden">
                        {avatarInfo.faviconUrl ? (
                          <img 
                            src={avatarInfo.faviconUrl} 
                            alt={`${avatarInfo.displayName} favicon`}
                            className="w-8 h-8 rounded-sm"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              target.style.display = 'none';
                              const nextElement = target.nextElementSibling as HTMLElement;
                              if (nextElement) {
                                nextElement.style.display = 'block';
                              }
                            }}
                          />
                        ) : null}
                        <span 
                          className={`font-semibold ${avatarInfo.faviconUrl ? 'hidden' : 'block'}`}
                        >
                          {avatarInfo.initials}
                        </span>
                      </div>
                      
                      {/* Header - Row 1 */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1 truncate">{job.company}</h3>
                          <div className="text-xs text-neutral-400">
                            {job.published && job.published.toDate && (
                              <span>{new Date(job.published.toDate()).toLocaleDateString()} • {(() => {
                                const now = new Date();
                                const published = job.published.toDate();
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
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('Remove this saved contact?')) {
                              void removeSavedJob(job.id);
                            }
                          }}
                          aria-label="Remove saved contact"
                          className="focus-ring inline-flex items-center justify-center rounded-lg border border-white/10 p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white flex-shrink-0"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M9 3h6a1 1 0 0 1 1 1v2h4v2h-1v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8H4V6h4V4a1 1 0 0 1 1-1Zm2 5h2v10h-2V8Z"/></svg>
                        </button>
                      </div>
                      
                      {/* Empty cell for avatar column */}
                      <div></div>
                      
                      {/* Person and role - Row 2 */}
                      <div className="flex flex-col justify-center h-full">
                        {job.name && job.name !== job.company ? (
                          <>
                            <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Contact</span>
                            <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">{job.name}</span>
                          </>
                        ) : (
                          <div className="h-6"></div>
                        )}
                      </div>
                      
                      {/* Empty cell for avatar column */}
                      <div></div>
                      
                      {/* Role - Row 3 */}
                      <div className="flex flex-col justify-center h-full">
                        <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Role</span>
                        {job.role ? (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide truncate max-w-[200px] ${roleBadgeClass}`}>
                            {job.role}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleBadgeClass}`}>
                            Founder
                          </span>
                        )}
                      </div>
                      
                      {/* Empty cell for avatar column */}
                      <div></div>
                      
                      {/* Contact & Looking for - Row 4 */}
                      <div className="flex flex-col justify-start h-full">
                        <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider mb-2">Contact Info</div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {job.linkedinurl && (
                            <a href={job.linkedinurl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a] transition-colors text-xs" aria-label="LinkedIn profile">
                              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-blue-600"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v16H0zM8 8h4.8v2.2h.07c.67-1.2 2.3-2.46 4.74-2.46 5.07 0 6 3.34 6 7.68V24h-5V16.4c0-1.81-.03-4.14-2.52-4.14-2.52 0-2.91 1.97-2.91 4v7.74H8z"/></svg>
                              LinkedIn
                            </a>
                          )}
                          {(() => {
                            const info = getEmailInfo(job.email);
                            if (!info) return null;
                            return (
                              <a href={info.href} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a] transition-colors text-xs" aria-label="Email">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-green-600"><path d="M2 6.75A2.75 2.75 0 0 1 4.75 4h14.5A2.75 2.75 0 0 1 22 6.75v10.5A2.75 2.75 0 0 1 19.25 20H4.75A2.75 2.75 0 0 1 2 17.25V6.75Z"/><path d="m4 6 8 6 8-6" opacity=".35"/></svg>
                                Email
                              </a>
                            );
                          })()}
                          {(() => {
                            const raw = job.company_url || job.url || '';
                            if (!raw) return null;
                            const domain = getDomainFromUrl(raw);
                            if (!domain) return null;
                            const href = `https://${domain}`;
                            return (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a] transition-colors text-xs" aria-label="Website">
                                <img
                                  src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
                                  alt=""
                                  className="h-3 w-3 rounded-sm"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/globe.svg'; }}
                                />
                                Website
                              </a>
                            );
                          })()}
                        </div>
                        {tags.length > 0 && (
                          <>
                            <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider mb-2">Looking for</div>
                            <div className="flex flex-wrap gap-1.5">
                              {tags.slice(0, 2).map((tag, index) => (
                                <span key={index} className="tag inline-flex items-center rounded-full px-2 py-0.5 text-[10px] truncate max-w-[120px]">{tag}</span>
                              ))}
                              {tags.length > 2 && (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                                  +{tags.length - 2} more
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Spacer - Row 5 (flexible) */}
                      <div></div>
                      <div></div>
                      
                      {/* Action footer - Row 6 */}
                      <div></div>
                      <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3">
                        <div className="flex items-center justify-between text-xs text-neutral-400 mb-3">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-medium uppercase tracking-wider mb-0.5">Added</span>
                            <span className="text-neutral-600 dark:text-neutral-300">{job.savedAt && job.savedAt.toDate ? new Date(job.savedAt.toDate()).toLocaleDateString() : 'Unknown'}</span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-[9px] font-medium uppercase tracking-wider mb-0.5">Last Outreach</span>
                            <span className="text-neutral-600 dark:text-neutral-300">{lastOutreach}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedJobForOutreach(job);
                            setShowOutreachModal(true);
                          }}
                          className="focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm btn-primary w-full justify-center"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Generate Outreach
                        </button>
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
        <IntegratedOutreachModal
          jobData={selectedJobForOutreach}
          userProfile={null}
          onClose={() => {
            setShowOutreachModal(false);
            setSelectedJobForOutreach(null);
          }}
        />
      )}

      <ToastContainer />
    </div>
  );
}