'use client';

import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import Link from 'next/link';
import Navigation from '../components/Navigation';

export default function AdminDashboard() {
  const { isLoaded, userId } = useAuth();
  const [grantProForm, setGrantProForm] = useState({
    targetUserId: '',
    durationDays: 365,
    loading: false,
    message: ''
  });

  const handleGrantPro = async (e: React.FormEvent) => {
    e.preventDefault();
    setGrantProForm(prev => ({ ...prev, loading: true, message: '' }));

    try {
      // If granting to another user (targetUserId is provided), force 30 days
      const isGrantingToOther = grantProForm.targetUserId.trim() !== '';
      const finalDurationDays = isGrantingToOther ? 30 : grantProForm.durationDays;

      const response = await fetch('/api/admin/grant-pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: grantProForm.targetUserId || undefined, // Empty string becomes undefined for self-grant
          durationDays: finalDurationDays
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const durationText = isGrantingToOther ? ' (limited to 30 days for other users)' : '';
        setGrantProForm(prev => ({ 
          ...prev, 
          message: `✅ ${result.message}${durationText}`,
          targetUserId: '',
        }));
      } else {
        setGrantProForm(prev => ({ 
          ...prev, 
          message: `❌ Error: ${result.error || 'Failed to grant Pro access'}` 
        }));
      }
    } catch (error) {
      setGrantProForm(prev => ({ 
        ...prev, 
        message: `❌ Error: ${error instanceof Error ? error.message : 'Network error'}` 
      }));
    } finally {
      setGrantProForm(prev => ({ ...prev, loading: false }));
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
      
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-[#11121b] rounded-xl border border-white/10 p-6">
          <div className="border-b border-white/10 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-neutral-400 mt-2">
              Manage and maintain the application data and settings.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6">
            {/* LinkedIn Post Generator */}
            <Link href="/admin/linkedin-posts" className="group">
              <div className="bg-[#18192a] border border-white/10 rounded-lg p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-green-300 transition-colors">
                      LinkedIn Posts
                    </h3>
                    <p className="text-neutral-400 text-sm">
                      Generate LinkedIn posts from startup data
                    </p>
                  </div>
                </div>
                <div className="text-neutral-300 text-sm">
                  • Select startups from database<br/>
                  • Generate copy-paste ready posts<br/>
                  • Promote Founder Flow organically<br/>
                  • Customizable website links
                </div>
              </div>
            </Link>

            {/* Data Management */}
            <Link href="/admin/data-management" className="group">
              <div className="bg-[#18192a] border border-white/10 rounded-lg p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                      Data Management
                    </h3>
                    <p className="text-neutral-400 text-sm">
                      Filter and delete incorrect or junk data entries
                    </p>
                  </div>
                </div>
                <div className="text-neutral-300 text-sm">
                  • Filter by missing contact info<br/>
                  • Identify invalid entries<br/>
                  • Selective bulk deletion<br/>
                  • Data quality statistics
                </div>
              </div>
            </Link>

            {/* Clear Entries */}
            <Link href="/admin/clear-entries" className="group">
              <div className="bg-[#18192a] border border-white/10 rounded-lg p-6 hover:bg-white/5 transition-colors">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-red-300 transition-colors">
                      Clear All Entries
                    </h3>
                    <p className="text-neutral-400 text-sm">
                      Bulk delete all entries from the database
                    </p>
                  </div>
                </div>
                <div className="text-neutral-300 text-sm">
                  • Batch deletion with safe limits<br/>
                  • Progress tracking<br/>
                  • Firebase Spark plan optimized<br/>
                  • Complete database clearing
                </div>
              </div>
            </Link>

            {/* Grant Pro Subscription */}
            <div className="bg-[#18192a] border border-white/10 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Grant Pro Access
                  </h3>
                  <p className="text-neutral-400 text-sm">
                    Grant Pro access (1 month for others, flexible for admin)
                  </p>
                </div>
              </div>

              <form onSubmit={handleGrantPro} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    User ID (leave empty for yourself)
                  </label>
                  <input
                    type="text"
                    value={grantProForm.targetUserId}
                    onChange={(e) => setGrantProForm(prev => ({ ...prev, targetUserId: e.target.value }))}
                    placeholder="user_2xxxxx... (optional)"
                    className="w-full px-3 py-2 bg-[#0f1015] border border-white/10 rounded-lg text-white placeholder-neutral-400 focus:border-purple-400 focus:outline-none"
                    disabled={grantProForm.loading}
                  />
                  {grantProForm.targetUserId.trim() && (
                    <p className="text-xs text-orange-400 mt-1">
                      ⚠️ Other users limited to 30 days max
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Duration (days) {grantProForm.targetUserId.trim() && <span className="text-orange-400">(fixed at 30 days for others)</span>}
                  </label>
                  <select
                    value={grantProForm.targetUserId.trim() ? 30 : grantProForm.durationDays}
                    onChange={(e) => setGrantProForm(prev => ({ ...prev, durationDays: parseInt(e.target.value) }))}
                    className={`w-full px-3 py-2 bg-[#0f1015] border border-white/10 rounded-lg text-white focus:border-purple-400 focus:outline-none ${
                      grantProForm.targetUserId.trim() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={grantProForm.loading || grantProForm.targetUserId.trim() !== ''}
                  >
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={365}>1 year</option>
                  </select>
                  {grantProForm.targetUserId.trim() && (
                    <p className="text-xs text-neutral-400 mt-1">
                      Duration selector disabled when granting to other users
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={grantProForm.loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  {grantProForm.loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Granting...
                    </>
                  ) : (
                    'Grant Pro Access'
                  )}
                </button>

                {grantProForm.message && (
                  <div className={`p-3 rounded-lg text-sm ${
                    grantProForm.message.includes('✅') 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {grantProForm.message}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Warning */}
          <div className="mt-8 bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-200 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Admin Access Notice
            </h3>
            <div className="text-yellow-300 text-sm mt-2 space-y-1">
              <p>• Admin features are restricted to authorized users only</p>
              <p>• All admin actions are logged and monitored</p>
              <p>• Data deletion operations are permanent and cannot be undone</p>
              <p>• Pro access grants bypass Stripe billing (1 month max for others)</p>
              <p>• Always backup critical data before performing bulk operations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}