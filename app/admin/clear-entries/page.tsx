'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface EntryStats {
  estimatedCount: string | number;
  hasEntries: boolean;
  sampleSize: number;
}

interface DeleteResponse {
  success: boolean;
  message: string;
  deletedCount: number;
  hasMoreEntries: boolean;
  batchSize: number;
  error?: string;
}

export default function ClearEntriesPage() {
  const { isLoaded, userId } = useAuth();
  const [stats, setStats] = useState<EntryStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResults, setDeleteResults] = useState<DeleteResponse[]>([]);
  const [batchSize, setBatchSize] = useState(100);
  const [totalDeleted, setTotalDeleted] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load initial stats
  useEffect(() => {
    if (isLoaded && userId) {
      loadStats();
    }
  }, [isLoaded, userId]);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/clear-entries');
      const data = await response.json();
      
      if (data.success) {
        setStats(data);
        setError(null);
      } else {
        setError(data.error || 'Failed to load stats');
      }
    } catch (err) {
      setError('Network error loading stats');
      console.error(err);
    }
  };

  const deleteBatch = async () => {
    try {
      const response = await fetch('/api/admin/clear-entries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setDeleteResults(prev => [...prev, result]);
        setTotalDeleted(prev => prev + result.deletedCount);
        
        // If no more entries, reload stats
        if (!result.hasMoreEntries) {
          await loadStats();
        }
        
        return result;
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    }
  };

  const handleSingleBatch = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      await deleteBatch();
    } catch (err) {
      console.error('Delete batch failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAll = async () => {
    setIsDeleting(true);
    setError(null);
    setDeleteResults([]);
    setTotalDeleted(0);
    
    try {
      let hasMore = true;
      let batchCount = 0;
      const maxBatches = 50; // Safety limit
      
      while (hasMore && batchCount < maxBatches) {
        const result = await deleteBatch();
        hasMore = result.hasMoreEntries;
        batchCount++;
        
        // Add a small delay to avoid overwhelming Firebase
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (batchCount >= maxBatches) {
        setError(`Stopped after ${maxBatches} batches. Some entries may remain.`);
      }
      
    } catch (err) {
      console.error('Clear all failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetResults = () => {
    setDeleteResults([]);
    setTotalDeleted(0);
    setError(null);
    loadStats();
  };

  if (!isLoaded) {
    return <div className="p-8">Loading...</div>;
  }

  if (!userId) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Access Denied</h2>
          <p className="text-red-600">Please sign in to access admin features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="border-b pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin: Clear Entry Collection</h1>
            <p className="text-gray-600 mt-2">
              Batch delete entries from the database with Firebase Spark plan safe limits.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-red-800 font-semibold">Error</h3>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* Current Stats */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800">Estimated Entries</h3>
              <p className="text-2xl font-bold text-blue-600">
                {stats ? stats.estimatedCount : 'Loading...'}
              </p>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800">Total Deleted</h3>
              <p className="text-2xl font-bold text-green-600">{totalDeleted}</p>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-800">Batch Size</h3>
              <input
                type="number"
                min="1"
                max="200"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 100)}
                className="text-xl font-bold text-purple-600 bg-transparent border-none w-full focus:outline-none"
                disabled={isDeleting}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={handleSingleBatch}
              disabled={isDeleting || !stats?.hasEntries}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isDeleting ? 'Deleting...' : `Delete One Batch (${batchSize})`}
            </button>
            
            <button
              onClick={handleClearAll}
              disabled={isDeleting || !stats?.hasEntries}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isDeleting ? 'Clearing...' : 'Clear All Entries'}
            </button>
            
            <button
              onClick={loadStats}
              disabled={isDeleting}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Refresh Stats
            </button>
            
            <button
              onClick={resetResults}
              disabled={isDeleting}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Reset Results
            </button>
          </div>

          {/* Progress Indicator */}
          {isDeleting && (
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-blue-800 font-medium">Processing deletion...</span>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {deleteResults.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Deletion Results</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {deleteResults.map((result, index) => (
                  <div
                    key={index}
                    className="bg-white border rounded p-3 text-sm"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-gray-600">
                        Batch #{index + 1}: Deleted {result.deletedCount} entries
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        result.hasMoreEntries 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {result.hasMoreEntries ? 'More remaining' : 'Complete'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800">⚠️ Important Notes</h3>
            <ul className="text-yellow-700 text-sm mt-2 space-y-1">
              <li>• This permanently deletes entries from your database</li>
              <li>• Batch sizes are limited to respect Firebase Spark plan quotas</li>
              <li>• Large deletions may take several minutes</li>
              <li>• Only accessible by admin email configured in the API</li>
              <li>• Check your Firebase usage to avoid quota overruns</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}