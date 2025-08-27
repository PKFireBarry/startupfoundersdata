'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Navigation from '../../components/Navigation';

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
        (entry.name?.toLowerCase().includes(query)) ||
        (entry.company?.toLowerCase().includes(query)) ||
        (entry.role?.toLowerCase().includes(query)) ||
        (entry.company_info?.toLowerCase().includes(query))
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
          ['n/a', 'na', 'unknown', ''].includes(entry.name?.toLowerCase().trim())
        );
        break;
      case 'invalid-companies':
        filtered = filtered.filter(entry => 
          !entry.company || 
          ['n/a', 'na', 'unknown', ''].includes(entry.company?.toLowerCase().trim())
        );
        break;
      case 'invalid-roles':
        filtered = filtered.filter(entry => 
          !entry.role || 
          ['n/a', 'na', 'unknown', ''].includes(entry.role?.toLowerCase().trim())
        );
        break;
      case 'incomplete':
        filtered = filtered.filter(entry => {
          const noEmail = !entry.email || entry.email === 'N/A' || entry.email.trim() === '';
          const noLinkedIn = !entry.linkedinurl || entry.linkedinurl === 'N/A' || entry.linkedinurl.trim() === '';
          const noCompanyUrl = !entry.company_url || entry.company_url === 'N/A' || entry.company_url.trim() === '';
          const invalidName = !entry.name || ['n/a', 'na', 'unknown', ''].includes(entry.name?.toLowerCase().trim());
          const invalidCompany = !entry.company || ['n/a', 'na', 'unknown', ''].includes(entry.company?.toLowerCase().trim());
          const invalidRole = !entry.role || ['n/a', 'na', 'unknown', ''].includes(entry.role?.toLowerCase().trim());
          
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

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr || 'N/A';
    }
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

          {/* Data Table */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                <span className="text-white">Loading entries...</span>
              </div>
            </div>
          ) : (
            <div className="bg-[#18192a] rounded-lg border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#1a1b2e] border-b border-white/10">
                    <tr>
                      <th className="text-left p-3 text-white font-semibold">
                        <input
                          type="checkbox"
                          checked={filteredEntries.length > 0 && selectedIds.size === filteredEntries.length}
                          onChange={() => selectedIds.size === filteredEntries.length ? clearSelection() : selectAll()}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left p-3 text-white font-semibold">Name</th>
                      <th className="text-left p-3 text-white font-semibold">Company</th>
                      <th className="text-left p-3 text-white font-semibold">Role</th>
                      <th className="text-left p-3 text-white font-semibold">Contact Info</th>
                      <th className="text-left p-3 text-white font-semibold">Published</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(entry.id)}
                            onChange={() => toggleSelectEntry(entry.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="p-3 text-white">
                          {entry.name || <span className="text-red-400 italic">N/A</span>}
                        </td>
                        <td className="p-3 text-neutral-300">
                          {entry.company || <span className="text-red-400 italic">N/A</span>}
                          {entry.company_info && (
                            <div className="text-xs text-neutral-500 mt-1 truncate" title={entry.company_info}>
                              {entry.company_info.length > 50 ? entry.company_info.substring(0, 50) + '...' : entry.company_info}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-neutral-300">
                          {entry.role || <span className="text-red-400 italic">N/A</span>}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {entry.email && entry.email !== 'N/A' ? (
                              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">Email</span>
                            ) : (
                              <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">No Email</span>
                            )}
                            {entry.linkedinurl && entry.linkedinurl !== 'N/A' ? (
                              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">LinkedIn</span>
                            ) : (
                              <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">No LinkedIn</span>
                            )}
                            {entry.company_url && entry.company_url !== 'N/A' ? (
                              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">Website</span>
                            ) : (
                              <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded">No Website</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-neutral-400 text-sm">
                          {formatDate(entry.published)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredEntries.length === 0 && !loading && (
                  <div className="text-center py-8 text-neutral-400">
                    No entries match the current filter criteria.
                  </div>
                )}
              </div>
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