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
  url: string; // careers/roles URL
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

export default function DataManagementPage() {
  const { isLoaded, userId } = useAuth();
  const [entries, setEntries] = useState<EntryItem[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<EntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<FilterStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteResults, setDeleteResults] = useState<string[]>([]);

  useEffect(() => {
    if (isLoaded && userId) {
      loadEntries();
    }
  }, [isLoaded, userId]);

  useEffect(() => {
    applyFilters();
  }, [entries, filterType, searchQuery]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/data-management');
      const data = await response.json();
      
      if (data.success) {
        setEntries(data.entries);
        setStats(data.stats);
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

  const applyFilters = () => {
    let filtered = [...entries];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        (typeof entry.name === 'string' && entry.name.toLowerCase().includes(query)) ||
        (typeof entry.company === 'string' && entry.company.toLowerCase().includes(query)) ||
        (typeof entry.role === 'string' && entry.role.toLowerCase().includes(query)) ||
        (typeof entry.company_info === 'string' && entry.company_info.toLowerCase().includes(query))
      );
    }

    // Apply filter type
    switch (filterType) {
      case 'no-email':
        filtered = filtered.filter(entry => 
          !entry.email || 
          entry.email === 'N/A' || 
          entry.email.trim() === ''
        );
        break;
      case 'no-linkedin':
        filtered = filtered.filter(entry => 
          !entry.linkedinurl || 
          entry.linkedinurl === 'N/A' || 
          entry.linkedinurl.trim() === ''
        );
        break;
      case 'no-company-url':
        filtered = filtered.filter(entry => 
          !entry.company_url || 
          entry.company_url === 'N/A' || 
          entry.company_url.trim() === ''
        );
        break;
      case 'invalid-names':
        filtered = filtered.filter(entry =>
          !entry.name ||
          (typeof entry.name === 'string' && ['n/a', 'na', 'unknown', ''].includes(entry.name.toLowerCase().trim()))
        );
        break;
      case 'invalid-companies':
        filtered = filtered.filter(entry =>
          !entry.company ||
          typeof entry.company !== 'string' ||
          ['n/a', 'na', 'unknown', ''].includes(entry.company.toLowerCase().trim())
        );
        break;
      case 'invalid-roles':
        filtered = filtered.filter(entry =>
          !entry.role ||
          (typeof entry.role === 'string' && ['n/a', 'na', 'unknown', ''].includes(entry.role.toLowerCase().trim()))
        );
        break;
      case 'incomplete':
        filtered = filtered.filter(entry => {
          const noEmail = !entry.email || entry.email === 'N/A' || entry.email.trim() === '';
          const noLinkedIn = !entry.linkedinurl || entry.linkedinurl === 'N/A' || entry.linkedinurl.trim() === '';
          const noCompanyUrl = !entry.company_url || entry.company_url === 'N/A' || entry.company_url.trim() === '';
          const invalidName = !entry.name || (typeof entry.name === 'string' && ['n/a', 'na', 'unknown', ''].includes(entry.name.toLowerCase().trim()));
          const invalidCompany = !entry.company || typeof entry.company !== 'string' || ['n/a', 'na', 'unknown', ''].includes(entry.company.toLowerCase().trim());
          const invalidRole = !entry.role || (typeof entry.role === 'string' && ['n/a', 'na', 'unknown', ''].includes(entry.role.toLowerCase().trim()));

          return noEmail && noLinkedIn && noCompanyUrl || invalidName || invalidCompany || invalidRole;
        });
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    setFilteredEntries(filtered);
  };

  const toggleSelectEntry = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredEntries.map(e => e.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const deleteSelectedEntries = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} selected entries? This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    setDeleteResults([]);

    try {
      const response = await fetch('/api/admin/data-management', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds: Array.from(selectedIds) })
      });

      const result = await response.json();

      if (result.success) {
        setDeleteResults([`Successfully deleted ${result.deletedCount} entries`]);
        setSelectedIds(new Set());
        // Reload entries to reflect changes
        await loadEntries();
      } else {
        setError(result.error || 'Delete failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  // Helper functions from opportunities page
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

  const getEmailInfo = (input?: string): { email: string; href: string } | null => {
    if (!input) return null;
    let raw = input.trim();
    if (raw.toLowerCase().startsWith('mailto:')) raw = raw.slice(7);
    if (!raw.includes('@')) return null;
    return { email: raw, href: `mailto:${raw}` };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return 'Unknown';
    try {
      // Handle the format from opportunities page: "Dec 15, 2024 • 3 days ago"
      const cleanDateStr = dateStr.split(' • ')[0];
      return cleanDateStr;
    } catch {
      return dateStr || 'N/A';
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
            <h1 className="text-2xl font-bold text-white">Admin: Data Management</h1>
            <p className="text-neutral-400 mt-2">
              Filter and selectively delete junk or incorrect data entries from the database.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <h3 className="text-red-200 font-semibold">Error</h3>
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                <h3 className="font-semibold text-blue-200 text-sm">Total</h3>
                <p className="text-xl font-bold text-blue-100">{stats.total}</p>
              </div>
              <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3">
                <h3 className="font-semibold text-orange-200 text-sm">No Email</h3>
                <p className="text-xl font-bold text-orange-100">{stats.withoutEmail}</p>
              </div>
              <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
                <h3 className="font-semibold text-purple-200 text-sm">No LinkedIn</h3>
                <p className="text-xl font-bold text-purple-100">{stats.withoutLinkedIn}</p>
              </div>
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                <h3 className="font-semibold text-green-200 text-sm">No Company URL</h3>
                <p className="text-xl font-bold text-green-100">{stats.withoutCompanyUrl}</p>
              </div>
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                <h3 className="font-semibold text-red-200 text-sm">Invalid Names</h3>
                <p className="text-xl font-bold text-red-100">{stats.invalidNames}</p>
              </div>
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
                <h3 className="font-semibold text-yellow-200 text-sm">Invalid Companies</h3>
                <p className="text-xl font-bold text-yellow-100">{stats.invalidCompanies}</p>
              </div>
              <div className="bg-pink-500/20 border border-pink-500/30 rounded-lg p-3">
                <h3 className="font-semibold text-pink-200 text-sm">Invalid Roles</h3>
                <p className="text-xl font-bold text-pink-100">{stats.invalidRoles}</p>
              </div>
            </div>
          )}

          {/* Filters and Controls */}
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <div className="flex-1 min-w-[300px]">
              <input
                type="text"
                placeholder="Search by name, company, role, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#18192a] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:border-white/30"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#18192a] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white/30"
            >
              <option value="all">All Entries</option>
              <option value="no-email">Missing Email</option>
              <option value="no-linkedin">Missing LinkedIn</option>
              <option value="no-company-url">Missing Company URL</option>
              <option value="invalid-names">Invalid Names</option>
              <option value="invalid-companies">Invalid Companies</option>
              <option value="invalid-roles">Invalid Roles</option>
              <option value="incomplete">Incomplete/Junk Data</option>
            </select>
          </div>

          {/* Selection Controls */}
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <span className="text-neutral-400">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'No selection'}
            </span>
            
            <button
              onClick={selectAll}
              disabled={filteredEntries.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              Select All ({filteredEntries.length})
            </button>
            
            <button
              onClick={clearSelection}
              disabled={selectedIds.size === 0}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-neutral-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              Clear Selection
            </button>
            
            <button
              onClick={deleteSelectedEntries}
              disabled={deleting || selectedIds.size === 0}
              className="bg-red-600 hover:bg-red-700 disabled:bg-neutral-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              {deleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
            </button>
          </div>

          {/* Results */}
          {deleteResults.length > 0 && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-200">Deletion Results</h3>
              {deleteResults.map((result, index) => (
                <p key={index} className="text-green-300">{result}</p>
              ))}
            </div>
          )}

          {/* Data Cards */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                <span className="text-white">Loading entries...</span>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredEntries.map((entry) => {
                const avatarInfo = getAvatarInfo(entry.name, entry.company, entry.company_url, entry.url);
                const emailInfo = getEmailInfo(entry.email);
                const lookingForTags = entry.looking_for ? entry.looking_for.split(',').map(tag => tag.trim()).filter(Boolean) : [];
                
                return (
                  <div 
                    key={entry.id} 
                    className={`bg-[#18192a] border rounded-xl p-4 hover:bg-white/5 transition-colors ${
                      selectedIds.has(entry.id) ? 'border-blue-400' : 'border-white/10'
                    }`}
                  >
                    {/* Selection checkbox and avatar */}
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(entry.id)}
                        onChange={() => toggleSelectEntry(entry.id)}
                        className="mt-1 rounded"
                      />
                      
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
                          {entry.company || <span className="text-red-400 italic">Unknown Company</span>}
                        </h3>
                        {entry.company_info && (
                          <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                            {entry.company_info}
                          </p>
                        )}
                      </div>
                    </div>

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
                        {entry.role ? (
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
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Founder
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="mb-3">
                      <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Contact Info</div>
                      <div className="flex flex-wrap gap-1">
                        {entry.linkedinurl && entry.linkedinurl !== 'N/A' && isValidActionableUrl(entry.linkedinurl, { context: 'linkedin_url' }) ? (
                          <a href={entry.linkedinurl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded border border-blue-500/30 bg-blue-500/20 px-1.5 py-0.5 hover:bg-blue-500/30 transition-colors text-[10px] text-blue-300">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                              <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v16H0zM8 8h4.8v2.2h.07c.67-1.2 2.3-2.46 4.74-2.46 5.07 0 6 3.34 6 7.68V24h-5V16.4c0-1.81-.03-4.14-2.52-4.14-2.52 0-2.91 1.97-2.91 4v7.74H8z"/>
                            </svg>
                            LinkedIn
                          </a>
                        ) : (
                          <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">No LinkedIn</span>
                        )}
                        
                        {emailInfo ? (
                          <a href={emailInfo.href} className="inline-flex items-center gap-1 rounded border border-green-500/30 bg-green-500/20 px-1.5 py-0.5 hover:bg-green-500/30 transition-colors text-[10px] text-green-300">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                              <path d="M2 6.75A2.75 2.75 0 0 1 4.75 4h14.5A2.75 2.75 0 0 1 22 6.75v10.5A2.75 2.75 0 0 1 19.25 20H4.75A2.75 2.75 0 0 1 2 17.25V6.75Z"/><path d="m4 6 8 6 8-6" opacity=".35"/>
                            </svg>
                            Email
                          </a>
                        ) : (
                          <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">No Email</span>
                        )}

                        {entry.company_url && entry.company_url !== 'N/A' && isValidActionableUrl(entry.company_url, { context: 'company_url' }) && (() => {
                          const domain = getDomainFromUrl(entry.company_url);
                          if (!domain) return null;
                          const href = entry.company_url.startsWith('http') ? entry.company_url : `https://${entry.company_url}`;
                          return (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded border border-neutral-500/30 bg-neutral-500/20 px-1.5 py-0.5 hover:bg-neutral-500/30 transition-colors text-[10px] text-neutral-300">
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

                    {/* Published Date and Actions */}
                    <div className="border-t border-white/10 pt-3 mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Published</span>
                          <div className="text-sm text-neutral-300">{formatDate(entry.published)}</div>
                        </div>
                        
                        {/* Apply URL button if available */}
                        {entry.apply_url && isValidActionableUrl(entry.apply_url, { context: 'apply_url' }) && (
                          <a 
                            href={entry.apply_url.startsWith('http') ? entry.apply_url : `https://${entry.apply_url}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-1 hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/10 dark:hover:bg-green-500/20 transition-colors text-xs text-green-700 dark:text-green-400 font-semibold"
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                              <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
                            </svg>
                            Apply
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredEntries.length === 0 && !loading && (
                <div className="col-span-full text-center py-12 text-neutral-400">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold mb-2">No entries found</h3>
                  <p>No entries match the current filter criteria.</p>
                </div>
              )}
            </div>
          )}

          {/* Warning */}
          <div className="mt-6 bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-200">⚠️ Important Notes</h3>
            <ul className="text-yellow-300 text-sm mt-2 space-y-1">
              <li>• This permanently deletes entries from your database</li>
              <li>• Use filters to identify and remove low-quality or incorrect data</li>
              <li>• Always review your selection before deleting</li>
              <li>• Consider exporting data before bulk deletions</li>
              <li>• Only accessible by admin email configured in the API</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}