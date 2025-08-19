"use client";

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy, Timestamp } from 'firebase/firestore';
import { clientDb } from '../../lib/firebase/client';

interface OutreachRecord {
  id: string;
  ownerUserId: string;
  contactId?: string;
  founderName: string;
  company: string;
  linkedinUrl?: string;
  email?: string;
  messageType: 'email' | 'linkedin';
  outreachType: 'job' | 'collaboration' | 'friendship';
  generatedMessage: string;
  stage: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface GroupedRecords {
  [key: string]: OutreachRecord[];
}

export default function ArchiveTab() {
  const { user } = useUser();
  const [outreachRecords, setOutreachRecords] = useState<OutreachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<OutreachRecord | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const loadOutreachRecords = async () => {
      try {
        const q = query(
          collection(clientDb, "outreach_records"),
          where("ownerUserId", "==", user.id),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        
        const records = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as OutreachRecord[];
        
        setOutreachRecords(records);
      } catch (error) {
        console.error("Error loading outreach records:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOutreachRecords();
  }, [user?.id]);

  const deleteRecord = async (recordId: string) => {
    try {
      await deleteDoc(doc(clientDb, "outreach_records", recordId));
      setOutreachRecords(prev => prev.filter(record => record.id !== recordId));
      setSelectedRecord(null);
    } catch (error) {
      console.error("Error deleting record:", error);
      alert("Failed to delete record. Please try again.");
    }
  };

  // Filter records based on search
  const filteredRecords = outreachRecords.filter(record => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.founderName.toLowerCase().includes(query) ||
      record.company.toLowerCase().includes(query) ||
      record.generatedMessage.toLowerCase().includes(query)
    );
  });

  // Group records by contact (founder + company)
  const groupedRecords: GroupedRecords = filteredRecords.reduce((acc, record) => {
    const key = `${record.founderName}-${record.company}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(record);
    return acc;
  }, {} as GroupedRecords);

  const formatDate = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate();
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageTypeIcon = (type: string) => {
    if (type === 'email') {
      return (
        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2 6.75A2.75 2.75 0 0 1 4.75 4h14.5A2.75 2.75 0 0 1 22 6.75v10.5A2.75 2.75 0 0 1 19.25 20H4.75A2.75 2.75 0 0 1 2 17.25V6.75Z"/>
          <path d="m4 6 8 6 8-6" opacity=".35"/>
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v16H0zM8 8h4.8v2.2h.07c.67-1.2 2.3-2.46 4.74-2.46 5.07 0 6 3.34 6 7.68V24h-5V16.4c0-1.81-.03-4.14-2.52-4.14-2.52 0-2.91 1.97-2.91 4v7.74H8z"/>
      </svg>
    );
  };

  const getOutreachTypeBadge = (type: string) => {
    const badges = {
      job: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      collaboration: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      friendship: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    };
    return badges[type as keyof typeof badges] || badges.job;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="panel rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-white/10 rounded mb-2"></div>
            <div className="h-3 bg-white/10 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Generated Content Archive</h2>
          <p className="text-sm text-[#ccceda] mt-1">
            All your generated outreach messages, organized by contact
          </p>
        </div>
        <span className="text-sm text-[#ccceda]">
          {filteredRecords.length} message{filteredRecords.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <input 
          type="text" 
          placeholder="Search messages by contact or content..." 
          className="w-full rounded-xl border border-white/10 panel px-3.5 py-2 text-sm text-white placeholder-[#a9abb6] focus:outline-none focus:ring-2" 
          style={{"--tw-ring-color": "var(--lavender-web)"} as React.CSSProperties} 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a9abb6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Content */}
      {Object.keys(groupedRecords).length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 panel rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No messages found</h3>
          <p className="text-[#ccceda] max-w-sm mx-auto">
            {searchQuery ? 'Try adjusting your search terms.' : 'Generate some outreach messages to see them here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRecords).map(([contactKey, records]) => {
            const contact = records[0]; // Get contact info from first record
            return (
              <div key={contactKey} className="panel rounded-xl p-4">
                {/* Contact Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white">
                      {contact.founderName || 'Unknown Contact'}
                    </h3>
                    <p className="text-sm text-[#ccceda]">{contact.company}</p>
                  </div>
                  <span className="text-xs text-[#a9abb6]">
                    {records.length} message{records.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Messages */}
                <div className="space-y-3">
                  {records.map((record) => (
                    <div 
                      key={record.id} 
                      className="border border-white/10 rounded-lg p-3 hover:border-white/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getMessageTypeIcon(record.messageType)}
                          <span className="text-sm font-medium text-white capitalize">
                            {record.messageType}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getOutreachTypeBadge(record.outreachType)}`}>
                            {record.outreachType}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#a9abb6]">
                            {formatDate(record.createdAt)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this message from your archive?')) {
                                deleteRecord(record.id);
                              }
                            }}
                            className="text-red-400 hover:text-red-300 p-1"
                            aria-label="Delete message"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-[#ccceda] line-clamp-2">
                        {record.generatedMessage.substring(0, 150)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Message Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="panel rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {selectedRecord.founderName} - {selectedRecord.company}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getMessageTypeIcon(selectedRecord.messageType)}
                    <span className="text-sm text-[#ccceda] capitalize">
                      {selectedRecord.messageType}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getOutreachTypeBadge(selectedRecord.outreachType)}`}>
                      {selectedRecord.outreachType}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-[#a9abb6] hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Message Content */}
              <div className="bg-white/5 rounded-lg p-4 mb-4">
                <pre className="text-sm text-white whitespace-pre-wrap font-sans">
                  {selectedRecord.generatedMessage}
                </pre>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-[#a9abb6]">
                <span>Generated on {formatDate(selectedRecord.createdAt)}</span>
                <button
                  onClick={() => {
                    if (confirm('Delete this message from your archive?')) {
                      deleteRecord(selectedRecord.id);
                    }
                  }}
                  className="text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}