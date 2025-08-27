'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import Navigation from '../components/Navigation';

export default function AdminDashboard() {
  const { isLoaded, userId } = useAuth();

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

          <div className="grid md:grid-cols-2 gap-6">
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
              <p>• Always backup critical data before performing bulk operations</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}