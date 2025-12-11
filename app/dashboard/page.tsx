"use client";

import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import Link from 'next/link';
import { clientDb } from '../../lib/firebase/client';
import Navigation from '../components/Navigation';
import { useToast } from '../hooks/useToast';
import IntegratedOutreachModal from '../components/IntegratedOutreachModal';
import ProfileEditor from '../components/ProfileEditor';
import ArchiveTab from '../components/ArchiveTab';
import ConfirmationModal from '../components/ConfirmationModal';
import ContactInfoGate from '../components/ContactInfoGate';
import NotificationSettings from '../components/NotificationSettings';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from '../components/PaywallModal';
import { isValidActionableUrl } from '../../lib/url-validation';

interface SavedJob {
  id: string;
  userId: string;
  jobId: string;
  savedAt?: Timestamp | null;
  // Job data
  company: string;
  company_info?: string;
  name?: string;
  role?: string;
  looking_for?: string;
  company_url?: string;
  url?: string;
  apply_url?: string;
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
  const [activeTab, setActiveTab] = useState<'contacts' | 'context' | 'archive'>('contacts');
  const [sortBy, setSortBy] = useState('most_recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(8);
  const [selectedJobForOutreach, setSelectedJobForOutreach] = useState<SavedJob | null>(null);
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<SavedJob | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const { ToastContainer } = useToast();
  const [, setUserProfile] = useState<UserProfile | null>(null);
  const { isPaid } = useSubscription();

  // Memoize the profile update callback to prevent unnecessary re-renders
  const handleProfileUpdate = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
  }, []);

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

  const confirmDeleteJob = () => {
    if (jobToDelete) {
      removeSavedJob(jobToDelete.id);
      setJobToDelete(null);
    }
  };

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

  // Fetch outreach records to get the latest stage for each contact
  const [outreachRecords, setOutreachRecords] = useState<any[]>([]);

  useEffect(() => {
    if (!isSignedIn || !user?.id) return;

    const loadOutreachRecords = async () => {
      try {
        const q = query(
          collection(clientDb, "outreach_records"),
          where("ownerUserId", "==", user.id)
        );
        const snapshot = await getDocs(q);

        const records = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setOutreachRecords(records);
      } catch (error) {
        console.error("Error loading outreach records:", error);
      }
    };

    loadOutreachRecords();
  }, [isSignedIn, user?.id]);

  // Get the latest outreach info for a specific contact
  const getLatestOutreachInfo = (founderName: string, company: string) => {
    // Find all outreach records for this founder/company combination
    const contactRecords = outreachRecords.filter(record =>
      record.founderName === founderName && record.company === company
    );

    if (contactRecords.length === 0) {
      return { lastOutreach: 'never', stage: null, stageDisplay: null };
    }

    // Sort by creation date to get the most recent
    const sortedRecords = contactRecords.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

    const latestRecord = sortedRecords[0];
    const createdDate = latestRecord.createdAt?.toDate?.() || new Date(latestRecord.createdAt || 0);

    // Calculate time ago
    const now = new Date();
    const diffMs = now.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);

    let lastOutreach;
    if (diffDays < 1) lastOutreach = 'today';
    else if (diffDays === 1) lastOutreach = '1 day ago';
    else if (diffDays < 7) lastOutreach = `${diffDays} days ago`;
    else if (diffWeeks === 1) lastOutreach = '1 week ago';
    else lastOutreach = `${diffWeeks} weeks ago`;

    // Stage display names
    const stageDisplayNames: Record<string, string> = {
      sent: "Sent",
      responded: "Responded",
      in_talks: "In Talks",
      interviewing: "Interviewing",
      rejected: "Rejected",
      connected: "Connected",
      ghosted: "Ghosted"
    };

    return {
      lastOutreach,
      stage: latestRecord.stage,
      stageDisplay: stageDisplayNames[latestRecord.stage] || latestRecord.stage,
      messageType: latestRecord.messageType
    };
  };

  const getTags = (job: SavedJob) => {
    const tags = [];
    if (job.looking_for) {
      // Split by common delimiters and clean up
      const lookingForItems = job.looking_for.split(/[,;\n]/).map(item => item.trim()).filter(item => item.length > 0);
      // Add all items (no limit since we have full width now)
      tags.push(...lookingForItems);
    }
    return tags;
  };

  const filteredJobs = savedJobs.filter(job => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.company?.toLowerCase().includes(query) ||
      job.company_info?.toLowerCase().includes(query) ||
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
        // Sort by most recent outreach activity
        const aOutreach = getLatestOutreachInfo(a.name || '', a.company || '');
        const bOutreach = getLatestOutreachInfo(b.name || '', b.company || '');

        // If neither has outreach, sort by saved date
        if (aOutreach.lastOutreach === 'never' && bOutreach.lastOutreach === 'never') {
          return tsToMs(b.savedAt) - tsToMs(a.savedAt);
        }

        // If one has outreach and other doesn't, prioritize the one with outreach
        if (aOutreach.lastOutreach === 'never') return 1;
        if (bOutreach.lastOutreach === 'never') return -1;

        // Both have outreach, get the actual records to compare dates
        const aRecords = outreachRecords.filter(record =>
          record.founderName === (a.name || '') && record.company === (a.company || '')
        );
        const bRecords = outreachRecords.filter(record =>
          record.founderName === (b.name || '') && record.company === (b.company || '')
        );

        const aLatest = aRecords.sort((x, y) => {
          const dateX = x.createdAt?.toDate?.() || new Date(x.createdAt || 0);
          const dateY = y.createdAt?.toDate?.() || new Date(y.createdAt || 0);
          return dateY.getTime() - dateX.getTime();
        })[0];

        const bLatest = bRecords.sort((x, y) => {
          const dateX = x.createdAt?.toDate?.() || new Date(x.createdAt || 0);
          const dateY = y.createdAt?.toDate?.() || new Date(y.createdAt || 0);
          return dateY.getTime() - dateX.getTime();
        })[0];

        const aDate = aLatest?.createdAt?.toDate?.() || new Date(aLatest?.createdAt || 0);
        const bDate = bLatest?.createdAt?.toDate?.() || new Date(bLatest?.createdAt || 0);

        return bDate.getTime() - aDate.getTime();
      default:
        return 0;
    }
  });

  // Pagination
  const totalEntries = sortedJobs.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedJobs = sortedJobs.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, entriesPerPage]);

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
            className={`tab-btn focus-ring rounded-lg px-3 py-1.5 ${activeTab === 'contacts' ? 'bg-[var(--lavender-web)] text-[#0f1018]' : 'text-neutral-200'
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
            className={`tab-btn focus-ring rounded-lg px-3 py-1.5 ${activeTab === 'context' ? 'bg-[var(--lavender-web)] text-[#0f1018]' : 'text-neutral-200'
              } ${!isPaid ? 'relative' : ''}`}
            onClick={() => {
              if (isPaid) {
                setActiveTab('context');
              } else {
                setShowPaywall(true);
              }
            }}
          >
            <span className="flex items-center gap-1.5">
              Context Settings
              {!isPaid && (
                <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </span>
          </button>
          <button
            id="tab-archive-btn"
            role="tab"
            aria-selected={activeTab === 'archive'}
            aria-controls="tab-archive"
            className={`tab-btn focus-ring rounded-lg px-3 py-1.5 ${activeTab === 'archive' ? 'bg-[var(--lavender-web)] text-[#0f1018]' : 'text-neutral-200'
              } ${!isPaid ? 'relative' : ''}`}
            onClick={() => {
              if (isPaid) {
                setActiveTab('archive');
              } else {
                setShowPaywall(true);
              }
            }}
          >
            <span className="flex items-center gap-1.5">
              Archive
              {!isPaid && (
                <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <section id="tab-contacts" role="tabpanel" aria-labelledby="tab-contacts-btn" className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
          {/* Page title and meta */}
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-semibold text-white">Saved Founder Contacts</h1>
            <span className="hidden sm:inline text-sm text-[#ccceda]">Showing {paginatedJobs.length} of {totalEntries}</span>
          </div>

          {/* Controls above cards: Sort + keyword search */}
          <div className="mb-4 grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-3 flex flex-wrap items-center gap-2">
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
            <div className="lg:col-span-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by keywords"
                  className="w-full rounded-xl border border-white/10 panel px-3.5 py-2 text-sm text-white placeholder-[#a9abb6] focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": "var(--lavender-web)" } as React.CSSProperties}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#a9abb6]">⌘K</span>
              </div>
            </div>
            <div className="lg:col-span-3 flex items-center justify-end gap-2">
              <label className="text-sm text-[#ccceda]">
                Per page
                <select
                  value={entriesPerPage}
                  onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                  className="ml-2 rounded-lg border border-white/10 panel px-2 py-1 text-sm text-white"
                >
                  <option value="8">8</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </label>
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
            ) : paginatedJobs.length === 0 ? (
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
                    href="/opportunities"
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
              paginatedJobs.map((job) => {
                const tags = getTags(job);
                const outreachInfo = getLatestOutreachInfo(job.name || '', job.company || '');
                const avatarInfo = getAvatarInfo(job.name, job.company, job.company_url, job.url);
                const roleBadgeClass = getRoleBadgeClass(job.role);

                return (
                  <article
                    key={job.id}
                    className="rounded-2xl bg-neutral-50 text-neutral-900 shadow-card ring-1 ring-black/10 overflow-hidden dark:bg-[#11121b] dark:text-neutral-100 dark:ring-white/10 cursor-pointer hover:ring-2 hover:ring-[var(--lavender-web)]/30 transition-all"
                    onClick={() => {
                      if (isPaid) {
                        setSelectedJobForOutreach(job);
                        setShowOutreachModal(true);
                      } else {
                        setShowPaywall(true);
                      }
                    }}
                  >
                    <div className="p-4 h-[520px] flex flex-col">
                      {/* Header with Avatar and Company Info - Fixed Height */}
                      <div className="flex items-start gap-3 h-[80px]">
                        <div className="card-initials flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden flex-shrink-0">
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
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg font-semibold text-white mb-1 truncate">{job.company}</h3>
                              <div className="text-xs text-neutral-300 mb-1 h-8 overflow-hidden">
                                <div className="line-clamp-2">
                                  {job.company_info && job.company_info.length > 0
                                    ? (job.company_info.length > 80 ? `${job.company_info.substring(0, 80)}...` : job.company_info)
                                    : 'Technology company'
                                  }
                                </div>
                              </div>
                              <div className="text-xs text-neutral-400">
                                {job.published && job.published.toDate ? (
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
                                ) : 'Recently'}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setJobToDelete(job);
                              }}
                              aria-label="Remove saved contact"
                              className="focus-ring inline-flex items-center justify-center rounded-lg border border-white/10 p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white flex-shrink-0"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M9 3h6a1 1 0 0 1 1 1v2h4v2h-1v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8H4V6h4V4a1 1 0 0 1 1-1Zm2 5h2v10h-2V8Z" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Contact Name - Fixed Height */}
                      <div className="h-[40px] mt-3">
                        <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Contact</span>
                        <div className="text-sm font-medium text-neutral-900 dark:text-white truncate mt-1">
                          {job.name && job.name !== job.company ? job.name : (job.name || "Unknown")}
                        </div>
                      </div>

                      {/* Role - Fixed Height */}
                      <div className="h-[50px] mt-3">
                        <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Role</span>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {job.role ? (
                            job.role.split(',').slice(0, 2).map((role, index) => {
                              const trimmedRole = role.trim();
                              const truncatedRole = trimmedRole.length > 18 ? trimmedRole.substring(0, 18) + '...' : trimmedRole;
                              return (
                                <span
                                  key={index}
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleBadgeClass}`}
                                  title={trimmedRole} // Show full text on hover
                                >
                                  {truncatedRole}
                                </span>
                              );
                            })
                          ) : (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleBadgeClass}`}>
                              Founder
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Contact Info - Fixed Height */}
                      <div className="h-[60px] mt-3">
                        <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Contact Info</div>
                        <div className="flex flex-wrap gap-1">
                          {job.linkedinurl && isValidActionableUrl(job.linkedinurl, { context: 'linkedin_url' }) && (
                            <ContactInfoGate
                              feature="LinkedIn Profiles"
                              description="Upgrade to access LinkedIn profiles and generate personalized outreach messages."
                              fallback={
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowPaywall(true);
                                  }}
                                  className="inline-flex items-center gap-1 rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 hover:bg-yellow-500/20 transition-colors text-[10px] text-yellow-400"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                  LinkedIn
                                </button>
                              }
                            >
                              <a href={job.linkedinurl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-1.5 py-0.5 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a] transition-colors text-[10px]" aria-label="LinkedIn profile">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-blue-600"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v16H0zM8 8h4.8v2.2h.07c.67-1.2 2.3-2.46 4.74-2.46 5.07 0 6 3.34 6 7.68V24h-5V16.4c0-1.81-.03-4.14-2.52-4.14-2.52 0-2.91 1.97-2.91 4v7.74H8z" /></svg>
                                LinkedIn
                              </a>
                            </ContactInfoGate>
                          )}
                          {(() => {
                            const info = getEmailInfo(job.email);
                            if (!info) return null;
                            return (
                              <ContactInfoGate
                                feature="Email Addresses"
                                description="Upgrade to access email addresses and generate personalized outreach messages."
                                fallback={
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowPaywall(true);
                                    }}
                                    className="inline-flex items-center gap-1 rounded border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 hover:bg-yellow-500/20 transition-colors text-[10px] text-yellow-400"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Email
                                  </button>
                                }
                              >
                                <a href={info.href} className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-1.5 py-0.5 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a] transition-colors text-[10px]" aria-label="Email">
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-green-600"><path d="M2 6.75A2.75 2.75 0 0 1 4.75 4h14.5A2.75 2.75 0 0 1 22 6.75v10.5A2.75 2.75 0 0 1 19.25 20H4.75A2.75 2.75 0 0 1 2 17.25V6.75Z" /><path d="m4 6 8 6 8-6" opacity=".35" /></svg>
                                  Email
                                </a>
                              </ContactInfoGate>
                            );
                          })()}
                          {/* Roles/Careers URL */}
                          {job.url && job.url !== job.apply_url && isValidActionableUrl(job.url, { context: 'careers_url' }) && (
                            <a href={job.url.startsWith('http') ? job.url : `https://${job.url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 hover:bg-purple-100 dark:border-purple-500/30 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 transition-colors text-[10px] text-purple-700 dark:text-purple-400" aria-label="Careers">
                              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3"><path d="M10 6h4a2 2 0 0 1 2 2v1h-8V8a2 2 0 0 1 2-2Zm-4 5h12a2 2 0 0 1 2 2v6H4v-6a2 2 0 0 1 2-2Z" /></svg>
                              Careers
                            </a>
                          )}
                          {/* Company Website */}
                          {job.company_url && job.company_url !== job.apply_url && job.company_url !== job.url && isValidActionableUrl(job.company_url, { context: 'company_url' }) && (() => {
                            const domain = getDomainFromUrl(job.company_url);
                            if (!domain) return null;
                            const href = job.company_url.startsWith('http') ? job.company_url : `https://${job.company_url}`;
                            return (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-1.5 py-0.5 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a] transition-colors text-[10px]" aria-label="Website">
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
                      </div>

                      {/* Looking For - Fixed Height */}
                      <div className="h-[50px] mt-3">
                        <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Looking for</div>
                        <div className="flex flex-wrap gap-1 overflow-hidden">
                          {tags.length > 0 ? (
                            tags.slice(0, 3).map((tag, index) => (
                              <span key={index} className="tag inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] leading-tight">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="tag inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] leading-tight">
                              Open to opportunities
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Spacer */}
                      <div className="flex-1"></div>

                      {/* Action footer */}
                      <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2">
                        <div className="grid grid-cols-2 gap-1.5 text-xs text-neutral-400 mb-2">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-medium uppercase tracking-wider mb-0.5">Added</span>
                            <span className="text-neutral-600 dark:text-neutral-300">{job.savedAt && job.savedAt.toDate ? new Date(job.savedAt.toDate()).toLocaleDateString() : 'Unknown'}</span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-[9px] font-medium uppercase tracking-wider mb-0.5">Last Outreach</span>
                            <span className="text-neutral-600 dark:text-neutral-300">{outreachInfo.lastOutreach}</span>
                          </div>
                          {outreachInfo.stage && (
                            <>
                              <div className="flex flex-col">
                                <span className="text-[9px] font-medium uppercase tracking-wider mb-0.5">Current Stage</span>
                                <div className="flex items-center gap-1">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${outreachInfo.stage === 'sent' ? 'bg-[#7f8bb3]/20 text-[#7f8bb3]' :
                                      outreachInfo.stage === 'responded' ? 'bg-[#b497d6]/20 text-[#b497d6]' :
                                        outreachInfo.stage === 'in_talks' ? 'bg-[#c7a8e6]/20 text-[#c7a8e6]' :
                                          outreachInfo.stage === 'interviewing' ? 'bg-[#e1e2ef]/20 text-[#e1e2ef]' :
                                            outreachInfo.stage === 'rejected' ? 'bg-[#9b4444]/20 text-[#9b4444]' :
                                              outreachInfo.stage === 'connected' ? 'bg-[#7fb3a6]/20 text-[#7fb3a6]' :
                                                outreachInfo.stage === 'ghosted' ? 'bg-[#8b7f7f]/20 text-[#8b7f7f]' :
                                                  'bg-neutral-500/20 text-neutral-400'
                                    }`}>
                                    {outreachInfo.stageDisplay}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col text-right">
                                <span className="text-[9px] font-medium uppercase tracking-wider mb-0.5">Channel</span>
                                <span className="text-neutral-600 dark:text-neutral-300 capitalize">
                                  {outreachInfo.messageType === 'email' ? 'Email' : 'LinkedIn'}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        <div className={`grid gap-2 ${job.apply_url && isValidActionableUrl(job.apply_url, { context: 'apply_url' }) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {/* Apply URL button - only show if available and valid */}
                          {job.apply_url && isValidActionableUrl(job.apply_url, { context: 'apply_url' }) && (
                            <a
                              href={job.apply_url.startsWith('http') ? job.apply_url : `https://${job.apply_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm justify-center border border-green-200 bg-green-50 hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:hover:bg-green-500/20 transition-colors text-green-700 dark:text-green-400 font-semibold"
                              aria-label="Apply"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                              </svg>
                              Apply
                            </a>
                          )}
                          {/* Generate Outreach button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPaid) {
                                setSelectedJobForOutreach(job);
                                setShowOutreachModal(true);
                              } else {
                                setShowPaywall(true);
                              }
                            }}
                            className={`focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm justify-center ${isPaid
                                ? 'btn-primary'
                                : 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 hover:from-yellow-500/30 hover:to-amber-500/30 border border-yellow-500/30 text-yellow-400'
                              }`}
                          >
                            {isPaid ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            )}
                            {isPaid ? 'Generate Outreach' : 'Generate Outreach'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-6 flex items-center justify-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${currentPage === 1
                    ? 'opacity-50 cursor-not-allowed text-[#ccceda]'
                    : 'text-[#ccceda] hover:text-white hover:bg-white/5'
                  }`}
              >
                Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${currentPage === pageNum
                        ? 'bg-[var(--lavender-web)] text-black'
                        : 'text-[#ccceda] hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${currentPage === totalPages
                    ? 'opacity-50 cursor-not-allowed text-[#ccceda]'
                    : 'text-[#ccceda] hover:text-white hover:bg-white/5'
                  }`}
              >
                Next
              </button>
            </nav>
          )}
        </section>
      )}

      {/* Context Settings Tab */}
      {activeTab === 'context' && (
        <section id="tab-context" role="tabpanel" aria-labelledby="tab-context-btn" className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
          <div className="mb-4">
            <h1 className="text-lg sm:text-xl font-semibold text-white">Outreach Context Settings</h1>
            <p className="text-sm text-[#ccceda]">Configure your personal details, AI context, and notification preferences.</p>
          </div>
          <div className="grid gap-8">
            <div className="rounded-xl border border-white/10 bg-[#141522] p-6">
              <ProfileEditor onProfileUpdate={handleProfileUpdate} />
            </div>
            <div className="rounded-xl border border-white/10 bg-[#141522] p-6">
              <NotificationSettings />
            </div>
          </div>
        </section>
      )}

      {/* Archive Tab */}
      {activeTab === 'archive' && (
        <section id="tab-archive" role="tabpanel" aria-labelledby="tab-archive-btn" className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
          <ArchiveTab />
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

      {/* Delete Contact Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!jobToDelete}
        onClose={() => setJobToDelete(null)}
        onConfirm={confirmDeleteJob}
        title="Remove Contact"
        message={`Are you sure you want to remove ${jobToDelete?.name || jobToDelete?.company} from your saved contacts? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        icon={
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
        }
      />

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="Premium Features"
        description="Upgrade to access outreach generation, context settings, message archive, and all contact information including LinkedIn profiles and email addresses."
      />
    </div>
  );
}