'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Navigation from '../../components/Navigation';
import { isValidActionableUrl } from '../../../lib/url-validation';

interface EntryItem {
  id: string;
  name: string;
  company: string;
  role: string;
  company_info: string;
  published: string;
  linkedinurl: string;
  email: string;
  company_url: string;
  apply_url: string;
  url: string;
  looking_for: string;
  [key: string]: any;
}

interface FilterStats {
  total: number;
  withoutEmail: number;
  withoutLinkedIn: number;
  withoutCompanyUrl: number;
  invalidNames: number;
  invalidCompanies: number;
  invalidRoles: number;
}

export default function LinkedInPostsPage() {
  const { isLoaded, userId } = useAuth();
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<EntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generatedPost, setGeneratedPost] = useState<string>('');
  const [websiteUrl, setWebsiteUrl] = useState('https://founderflow.space');
  const [showPostPreview, setShowPostPreview] = useState(false);

  // Preset opener sentences
  const openerOptions = [
    "These jobs weren't perfect for me, but maybe they'll work for you.",
    "Found some interesting startup opportunities this week.",
    "Sharing a few startup roles that caught my attention.",
    "Here are some early-stage opportunities worth checking out.",
    "Spotted these promising startup positions recently.",
    "Some startup roles that might be perfect for someone in my network."
  ];

  useEffect(() => {
    if (isLoaded && userId) {
      loadEntries();
    }
  }, [isLoaded, userId]);

  useEffect(() => {
    applyFilters();
  }, [entries, searchQuery]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/linkedin-posts');
      const data = await response.json();
      
      if (data.success) {
        setEntries(data.entries);
        setError(null);
      } else {
        setError(data.error || 'Failed to load entries');
      }
    } catch (err) {
      setError('Network error loading entries');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions from opportunities page
  const isNA = (value: any): boolean => {
    if (value == null) return true;
    const s = String(value)
      // trim common and zero-width spaces
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim()
      .toLowerCase();
    if (!s) return true;
    // Normalize separators and punctuation (/, \, ., -, long dash, fraction slash)
    const stripped = s.replace(/[\s\./\\_\-–⁄]/g, "");
    return (
      s === "n/a" ||
      s === "-" ||
      stripped === "na" ||
      stripped === "none" ||
      stripped === "null" ||
      stripped === "undefined" ||
      stripped === "tbd"
    );
  };

  const cleanEmail = (raw: any): string | null => {
    if (isNA(raw)) return null;
    let s = String(raw).trim();
    if (s.toLowerCase().startsWith("mailto:")) s = s.slice(7);
    // very light validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
    return s;
  };

  const mailtoHref = (email: string | null): string | null => {
    if (!email) return null;
    return `mailto:${email}`;
  };

  const asHttpUrl = (raw: any): string | null => {
    if (isNA(raw)) return null;
    let s = String(raw).trim();
    if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
    try {
      const u = new URL(s);
      return u.toString();
    } catch {
      return null;
    }
  };

  // Helper functions for URL processing (from opportunities page)
  const canonicalizeUrl = (url: string | null): string | null => {
    if (!url) return null;
    try {
      const u = new URL(url);
      // drop query/hash, normalize trailing slash, lowercase host
      const path = u.pathname.replace(/\/$/, "");
      return `${u.protocol}//${u.hostname.toLowerCase()}${path}`;
    } catch {
      return null;
    }
  };

  const isLinkedInUrl = (url: string | null): boolean => {
    if (!url) return false;
    try {
      const u = new URL(url);
      return /(^|\.)linkedin\.com$/i.test(u.hostname);
    } catch {
      return false;
    }
  };

  const isJobBoardUrl = (url: string | null): boolean => {
    if (!url) return false;
    try {
      const u = new URL(url);
      const h = u.hostname.toLowerCase();
      const p = u.pathname.toLowerCase();
      if (
        h.includes("greenhouse.io") ||
        h.includes("lever.co") ||
        h.includes("workable.com") ||
        h.includes("ashbyhq.com") ||
        h.includes("myworkdayjobs.com") ||
        h.includes("jobvite.com") ||
        h.includes("bamboohr.com")
      ) return true;
      return /careers|jobs|open-roles|apply|join-us/.test(p);
    } catch {
      return false;
    }
  };

  const isBadCompanyDomain = (url: string | null): boolean => {
    if (!url) return false;
    try {
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      return host === "gmail.com" || host === "mail.google.com";
    } catch {
      return false;
    }
  };

  // Full chooseLinks function from opportunities page
  const chooseLinks = (it: any) => {
    const used = new Set<string>();

    // accept many aliases commonly seen in scraped data
    const fromCompany = asHttpUrl(
      it?.company_url ?? it?.companyUrl ?? it?.website ?? it?.site ?? it?.homepage ?? it?.url_website
    );
    const fromLinkedIn = asHttpUrl(
      it?.linkedinurl ?? it?.linkedin_url ?? it?.linkedin ?? it?.li
    );
    const fromFlexUrl = asHttpUrl(
      it?.url ?? it?.roles_url ?? it?.careers ?? it?.jobs_url ?? it?.open_roles_url
    );
    const fromApplyUrl = asHttpUrl(it?.apply_url);
    const flexEmail = cleanEmail(it?.url);
    const email = cleanEmail(it?.email) || flexEmail;

    let linkedinUrl: string | null = null;
    let rolesUrl: string | null = null;
    let apply_url: string | null = null;
    let companyUrl: string | null = null;

    // 1) LinkedIn: prefer explicit linkedin field, else any URL pointing to LinkedIn
    for (const cand of [fromLinkedIn, fromCompany, fromFlexUrl, fromApplyUrl]) {
      if (cand && isLinkedInUrl(cand)) {
        const canon = canonicalizeUrl(cand)!;
        if (!used.has(canon)) {
          linkedinUrl = cand;
          used.add(canon);
          break;
        }
      }
    }

    // 2) Apply URL: prefer explicit apply_url if it's different from other URLs
    if (fromApplyUrl) {
      const canon = canonicalizeUrl(fromApplyUrl)!;
      if (!used.has(canon)) {
        apply_url = fromApplyUrl;
        used.add(canon);
      }
    }

    // 3) Roles/Jobs: prefer URLs that look like job boards or careers pages
    for (const cand of [fromFlexUrl, fromCompany]) {
      if (cand && isJobBoardUrl(cand)) {
        const canon = canonicalizeUrl(cand)!;
        if (!used.has(canon)) {
          rolesUrl = cand;
          used.add(canon);
          break;
        }
      }
    }

    // 4) Company: a generic website (non-LinkedIn, non-job-board, not gmail.com)
    for (const cand of [fromCompany, fromFlexUrl]) {
      if (cand && !isLinkedInUrl(cand) && !isJobBoardUrl(cand) && !isBadCompanyDomain(cand)) {
        const canon = canonicalizeUrl(cand)!;
        if (!used.has(canon)) {
          companyUrl = cand;
          used.add(canon);
          break;
        }
      }
    }

    const emailHref = mailtoHref(email);

    return {
      companyUrl,
      rolesUrl,
      apply_url,
      linkedinUrl,
      emailHref,
      email,
      hasEmail: !!email,
      hasLinkedIn: !!linkedinUrl,
      hasCompanyUrl: !!companyUrl,
      hasApplyUrl: !!apply_url
    };
  };

  const applyFilters = () => {
    let filtered = [...entries];

    // Apply the same filtering logic as opportunities page
    // Don't filter out entries with missing companies - let them through like opportunities page does
    // Only filter if no actionable links are available (like opportunities page)
    const hasActiveFilters = Boolean(searchQuery.trim());
    
    filtered = filtered.filter((entry) => {
      const { hasEmail, hasLinkedIn, hasCompanyUrl, hasApplyUrl } = chooseLinks(entry);
      
      // If no active search filters, require at least one actionable link to reduce noise
      if (!hasActiveFilters && !(hasCompanyUrl || hasApplyUrl || hasLinkedIn || hasEmail)) {
        return false;
      }
      
      return true;
    });

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        (typeof entry.name === 'string' && entry.name.toLowerCase().includes(query)) ||
        (typeof entry.company === 'string' && entry.company.toLowerCase().includes(query)) ||
        (typeof entry.role === 'string' && entry.role.toLowerCase().includes(query)) ||
        (typeof entry.company_info === 'string' && entry.company_info.toLowerCase().includes(query)) ||
        (typeof entry.looking_for === 'string' && entry.looking_for.toLowerCase().includes(query))
      );
    }

    // Sort by most recent
    filtered.sort((a, b) => {
      const dateA = new Date(a.published || '');
      const dateB = new Date(b.published || '');
      return dateB.getTime() - dateA.getTime();
    });

    setFilteredEntries(filtered);
  };

  const toggleSelectEntry = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (newSelected.size >= 3) {
        // Limit to 3 selections
        return;
      }
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setGeneratedPost('');
    setShowPostPreview(false);
  };

  const generatePost = () => {
    if (selectedIds.size === 0) return;

    const selectedEntries = Array.from(selectedIds).map(id => 
      entries.find(entry => entry.id === id)!
    );

    // Get current date info
    const currentDate = new Date();
    const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' } as const;
    const dateStr = currentDate.toLocaleDateString('en-US', dateOptions);

    // Randomly select an opener
    const randomOpenerIndex = Math.floor(Math.random() * openerOptions.length);
    const selectedOpenerText = openerOptions[randomOpenerIndex];
    let postContent = `${selectedOpenerText}\nHere are three jobs I found on FounderFlow.space (as of ${dateStr}):\n\n\n`;

    selectedEntries.forEach((entry, index) => {
      const companyName = isNA(entry.company) ? 'Stealth' : entry.company;
      const { hasEmail, hasLinkedIn, hasCompanyUrl, hasApplyUrl, companyUrl, apply_url } = chooseLinks(entry);
      
      // Build header: "Name @ Company (Role)" or variations
      let headerLine = '';
      const hasName = !isNA(entry.name) && entry.name !== entry.company;
      const hasRole = !isNA(entry.role);
      
      if (hasName && hasRole) {
        const roles = entry.role.split(',').slice(0, 2).map(role => role.trim()).join(' & ');
        headerLine = `${entry.name} @ ${companyName} (${roles})`;
      } else if (hasName && !hasRole) {
        headerLine = `${entry.name} @ ${companyName}`;
      } else if (!hasName && hasRole) {
        const roles = entry.role.split(',').slice(0, 2).map(role => role.trim()).join(' & ');
        headerLine = `${companyName} (${roles})`;
      } else {
        headerLine = companyName;
      }
      
      // Get first sentence of company description
      let companyDescription = '';
      if (!isNA(entry.company_info)) {
        // Split by sentence endings and take first sentence
        const firstSentence = entry.company_info.split(/[.!?]+/)[0];
        if (firstSentence && firstSentence.trim()) {
          companyDescription = firstSentence.trim();
        }
      }
      
      // Build the entry
      postContent += `${headerLine}\n`;
      
      if (companyDescription) {
        postContent += `About: ${companyDescription}\n`;
      }
      
      // Add looking_for if available
      if (!isNA(entry.looking_for)) {
        const roles = entry.looking_for.split(',').slice(0, 3).map(role => role.trim()).join(', ');
        postContent += `Looking for: ${roles}\n`;
      }

      // Add website (clean domain only)
      if (companyUrl) {
        try {
          const url = new URL(companyUrl);
          const cleanDomain = url.hostname.replace(/^www\./, '');
          postContent += `Website: ${cleanDomain}\n`;
        } catch {
          postContent += `Website: ${companyUrl}\n`;
        }
      }
      
      // Add apply link (clean version)
      if (apply_url) {
        try {
          const url = new URL(apply_url);
          const cleanDomain = url.hostname.replace(/^www\./, '') + url.pathname;
          postContent += `Apply: ${cleanDomain}\n`;
        } catch {
          postContent += `Apply: ${apply_url}\n`;
        }
      }

      // Add contact info availability
      if (hasEmail || hasLinkedIn) {
        postContent += `👉 Direct contact info available\n`;
      }

      // Add consistent spacing between entries
      if (index < selectedEntries.length - 1) {
        postContent += '\n\n\n';
      } else {
        postContent += '\n';
      }
    });

    postContent += `\n\nSee more early-stage startups and open roles each week at FounderFlow.space`;

    setGeneratedPost(postContent);
    setShowPostPreview(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedPost);
      alert('Post copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy. Please manually select and copy the text.');
    }
  };

  // Function to make URLs clickable in preview
  const renderPostWithClickableLinks = (postText: string) => {
    const lines = postText.split('\n');
    return lines.map((line, index) => {
      // Check if line contains URLs
      if (line.includes('Website: ') || line.includes('Apply: ') || line.includes('FounderFlow.space')) {
        const parts = line.split(/(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g);
        return (
          <div key={index}>
            {parts.map((part, partIndex) => {
              // Check if part looks like a URL or domain
              if (part.match(/^(https?:\/\/|www\.|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)) {
                const url = part.startsWith('http') ? part : `https://${part}`;
                return (
                  <a
                    key={partIndex}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    {part}
                  </a>
                );
              }
              return <span key={partIndex}>{part}</span>;
            })}
          </div>
        );
      }
      return <div key={index}>{line}</div>;
    });
  };

  const getDomainFromUrl = (input?: string): string | null => {
    if (!input) return null;
    let str = input.trim();
    if (str.toLowerCase().startsWith('mailto:')) {
      const email = str.slice(7);
      const parts = email.split('@');
      return parts[1] ? parts[1].toLowerCase() : null;
    }
    if (str.includes('@') && !/^https?:\/\//i.test(str)) {
      const parts = str.split('@');
      return parts[1] ? parts[1].toLowerCase() : null;
    }
    try {
      if (!/^https?:\/\//i.test(str)) {
        str = `https://${str}`;
      }
      const u = new URL(str);
      return u.hostname.replace(/^www\./i, '').toLowerCase();
    } catch {
      const host = str.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0];
      return host ? host.toLowerCase() : null;
    }
  };

  const getAvatarInfo = (name?: string, company?: string, companyUrl?: string, url?: string) => {
    const websiteUrl = companyUrl || url;
    let faviconUrl = null;
    
    if (websiteUrl) {
      const domain = getDomainFromUrl(websiteUrl);
      if (domain) {
        faviconUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
      }
    }
    
    let initials = 'UN';
    if (company) {
      const parts = company.split(' ');
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[1][0]).toUpperCase();
      } else {
        initials = parts[0].slice(0, 2).toUpperCase();
      }
    }
    
    return { faviconUrl, initials, displayName: company || 'Unknown' };
  };

  if (!isLoaded) {
    return <div className="p-8">Loading...</div>;
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#0f1015]">
        <Navigation />
        <div className="p-8">
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-white">
            <h2 className="font-semibold">Access Denied</h2>
            <p className="text-red-300">Please sign in to access admin features.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1015]">
      <Navigation />
      
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-[#11121b] rounded-xl border border-white/10 p-6">
          <div className="border-b border-white/10 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-white">LinkedIn Post Generator</h1>
            <p className="text-neutral-400 mt-2">
              Select up to 3 startup entries to create a LinkedIn post for promoting Founder Flow.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <h3 className="text-red-200 font-semibold">Error</h3>
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Post Preview */}
          {showPostPreview && (
            <div className="bg-[#18192a] border border-white/10 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Generated LinkedIn Post</h3>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Copy Post
                  </button>
                  <button
                    onClick={() => setShowPostPreview(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
              
              <div className="bg-[#0f1015] border border-white/10 rounded-lg p-4">
                <div className="text-white whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {renderPostWithClickableLinks(generatedPost)}
                </div>
              </div>
              
              <div className="mt-4 text-xs text-neutral-400">
                Character count: {generatedPost.length} (LinkedIn limit: ~3,000 characters)
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center mb-6">
            <div className="flex-1 min-w-[300px]">
              <input
                type="text"
                placeholder="Search startups, companies, roles, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#18192a] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                placeholder="Website URL"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="bg-[#18192a] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:border-white/30 text-sm"
              />
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <span className="text-neutral-400">
              {selectedIds.size}/3 selected
            </span>
            
            <button
              onClick={generatePost}
              disabled={selectedIds.size === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              Generate Post ({selectedIds.size})
            </button>
            
            <button
              onClick={clearSelection}
              disabled={selectedIds.size === 0}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-neutral-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              Clear Selection
            </button>
          </div>

          {/* Startup Cards */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                <span className="text-white">Loading startups...</span>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredEntries.map((entry) => {
                const avatarInfo = getAvatarInfo(entry.name, entry.company, entry.company_url, entry.url);
                const lookingForTags = entry.looking_for ? entry.looking_for.split(',').map(tag => tag.trim()).filter(Boolean) : [];
                const { hasEmail, hasLinkedIn, hasCompanyUrl, hasApplyUrl, companyUrl, linkedinUrl, apply_url } = chooseLinks(entry);
                const isSelected = selectedIds.has(entry.id);
                const canSelect = !isSelected && selectedIds.size < 3;
                
                return (
                  <div 
                    key={entry.id} 
                    className={`bg-[#18192a] border rounded-xl p-4 transition-colors cursor-pointer ${
                      isSelected 
                        ? 'border-blue-400 bg-blue-500/10' 
                        : canSelect 
                          ? 'border-white/10 hover:bg-white/5' 
                          : 'border-white/5 opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => canSelect || isSelected ? toggleSelectEntry(entry.id) : null}
                  >
                    {/* Selection indicator and avatar */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-white/30'
                      }`}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden bg-neutral-800">
                        {avatarInfo.faviconUrl ? (
                          <img 
                            src={avatarInfo.faviconUrl} 
                            alt={`${avatarInfo.displayName} favicon`}
                            className="w-10 h-10 rounded-sm"
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
                          className={`font-semibold text-sm text-neutral-300 ${avatarInfo.faviconUrl ? 'hidden' : 'block'}`}
                        >
                          {avatarInfo.initials}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Company</div>
                        <h3 className="text-lg font-semibold text-white truncate">
                          {isNA(entry.company) ? 'Stealth' : entry.company}
                        </h3>
                      </div>
                    </div>

                    {/* Company Description */}
                    {entry.company_info && (
                      <div className="mb-3">
                        <p className="text-sm text-neutral-300 line-clamp-3">
                          {entry.company_info}
                        </p>
                      </div>
                    )}

                    {/* Contact Name */}
                    <div className="mb-3">
                      <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Contact</span>
                      <div className="text-sm font-medium text-white">
                        {entry.name && entry.name !== entry.company ? entry.name : (entry.name || "Unknown")}
                      </div>
                    </div>

                    {/* Role */}
                    <div className="mb-3">
                      <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Role</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {!isNA(entry.role) ? (
                          entry.role.split(',').slice(0, 2).map((singleRole, index) => {
                            const trimmedRole = singleRole.trim();
                            return (
                              <span 
                                key={index} 
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                title={trimmedRole}
                              >
                                {trimmedRole.length > 15 ? trimmedRole.substring(0, 15) + '...' : trimmedRole}
                              </span>
                            );
                          })
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-neutral-500/20 text-neutral-400 border border-neutral-500/30">
                            Role not specified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="mb-3">
                      <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Contact Info</div>
                      <div className="flex flex-wrap gap-1">
                        {hasLinkedIn && isValidActionableUrl(entry.linkedinurl, { context: 'linkedin_url' }) ? (
                          <span className="inline-flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                              <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v16H0zM8 8h4.8v2.2h.07c.67-1.2 2.3-2.46 4.74-2.46 5.07 0 6 3.34 6 7.68V24h-5V16.4c0-1.81-.03-4.14-2.52-4.14-2.52 0-2.91 1.97-2.91 4v7.74H8z"/>
                            </svg>
                            LinkedIn
                          </span>
                        ) : (
                          <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">No LinkedIn</span>
                        )}
                        
                        {hasEmail ? (
                          <span className="inline-flex items-center gap-1 rounded border border-green-500/30 bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-300">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                              <path d="M2 6.75A2.75 2.75 0 0 1 4.75 4h14.5A2.75 2.75 0 0 1 22 6.75v10.5A2.75 2.75 0 0 1 19.25 20H4.75A2.75 2.75 0 0 1 2 17.25V6.75Z"/><path d="m4 6 8 6 8-6" opacity=".35"/>
                            </svg>
                            Email
                          </span>
                        ) : (
                          <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">No Email</span>
                        )}

                        {hasCompanyUrl && isValidActionableUrl(entry.company_url, { context: 'company_url' }) && (() => {
                          const domain = getDomainFromUrl(entry.company_url);
                          if (!domain) return null;
                          return (
                            <span className="inline-flex items-center gap-1 rounded border border-neutral-500/30 bg-neutral-500/20 px-1.5 py-0.5 text-[10px] text-neutral-300">
                              <img
                                src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
                                alt=""
                                className="h-3 w-3 rounded-sm"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/globe.svg'; }}
                              />
                              Website
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Looking For Tags */}
                    {lookingForTags.length > 0 && (
                      <div className="mb-3">
                        <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Looking for</div>
                        <div className="flex flex-wrap gap-1">
                          {lookingForTags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] bg-neutral-700 text-neutral-300 border border-neutral-600">
                              {tag}
                            </span>
                          ))}
                          {lookingForTags.length > 3 && (
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] bg-neutral-700 text-neutral-300 border border-neutral-600">
                              +{lookingForTags.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Apply URL if available */}
                    {hasApplyUrl && isValidActionableUrl(entry.apply_url, { context: 'apply_url' }) && (
                      <div className="mb-3">
                        <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Apply URL Available</div>
                        <span className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-1 dark:border-green-500/30 dark:bg-green-500/10 text-xs text-green-700 dark:text-green-400 font-semibold">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                            <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
                          </svg>
                          Apply Link
                        </span>
                      </div>
                    )}

                    {/* Published Date */}
                    <div className="border-t border-white/10 pt-3 mt-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Published</span>
                          <div className="text-sm text-neutral-300">
                            {entry.published ? entry.published.split(' • ')[0] : 'Unknown'}
                          </div>
                        </div>
                        
                        {!canSelect && !isSelected && (
                          <div className="text-xs text-neutral-500">
                            Max 3 selected
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredEntries.length === 0 && !loading && (
                <div className="col-span-full text-center py-12 text-neutral-400">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-semibold mb-2">No startups found</h3>
                  <p>No startups match the current search criteria. Try adjusting your search.</p>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
            <h3 className="font-semibold text-blue-200 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How to Use
            </h3>
            <div className="text-blue-300 text-sm mt-2 space-y-1">
              <p>• Browse and search through high-quality startup entries</p>
              <p>• Select up to 3 startups by clicking on their cards</p>
              <p>• Click "Generate Post" to create a LinkedIn post template with random opener</p>
              <p>• Copy the generated post and paste it directly into LinkedIn</p>
              <p>• Each post uses a different random opener for variety</p>
              <p>• Customize the website URL to track click-through traffic</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}