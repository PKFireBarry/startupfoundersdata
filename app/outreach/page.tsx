"use client";

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { clientDb } from '../../lib/firebase/client';
import Navigation from '../components/Navigation';
import OutreachHistoryModal from '../components/OutreachHistoryModal';
import { useToast } from '../hooks/useToast';

interface OutreachRecord {
  id: string;
  ownerUserId: string;
  contactId: string | null;
  founderName: string;
  company: string;
  linkedinUrl: string;
  email: string;
  messageType: 'email' | 'linkedin';
  outreachType: 'job' | 'collaboration' | 'friendship';
  generatedMessage: string;
  stage: string;
  createdAt: any;
  updatedAt: any;
  notes?: string;
}

// Stage definitions matching the design
const EMAIL_STAGES = ["sent", "responded", "in_talks", "interviewing", "rejected", "hired"];
const LINKEDIN_STAGES = ["sent", "responded", "connected", "ghosted"];

// Display names for stages
const STAGE_DISPLAY_NAMES: Record<string, string> = {
  sent: "Sent",
  responded: "Responded",
  in_talks: "In Talks",
  interviewing: "Interviewing",
  rejected: "Rejected",
  hired: "Hired",
  connected: "Connected",
  ghosted: "Ghosted"
};

// Helper functions
const getInitials = (name: string, company: string): string => {
  if (name) {
    const nameParts = name.split(' ');
    return nameParts.map(part => part.charAt(0).toUpperCase()).join('').slice(0, 2);
  }
  if (company) {
    return company.charAt(0).toUpperCase() + (company.charAt(1) || '').toUpperCase();
  }
  return 'UN';
};

const getOutreachTypeDisplay = (type: string): string => {
  switch (type) {
    case 'job': return 'Job Opportunity';
    case 'collaboration': return 'Collaboration';
    case 'friendship': return 'Networking';
    default: return 'General';
  }
};

const getSubjectFromMessage = (message: string): string => {
  if (!message) return 'No subject';

  // Try to extract subject from email format
  const subjectMatch = message.match(/Subject:\s*(.+)/i);
  if (subjectMatch) {
    return subjectMatch[1].trim();
  }

  // Fallback to first line or truncated message
  const firstLine = message.split('\n')[0];
  return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
};

const groupOutreachByFounder = (records: any[]): any[] => {
  const grouped = new Map<string, any[]>();

  // Group records by founder name + company combination
  records.forEach(record => {
    const key = `${record.name}-${record.company}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(record);
  });

  // For each group, return only the most recent record but include all records in history
  const result: any[] = [];
  grouped.forEach((groupRecords) => {
    // Sort by creation date (most recent first)
    groupRecords.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    const mostRecent = groupRecords[0];
    // Add all records as history and count
    const groupedRecord = {
      ...mostRecent,
      outreachHistory: groupRecords,
      outreachCount: groupRecords.length
    };

    result.push(groupedRecord);
  });

  return result;
};



export default function OutreachBoard() {
  const { isSignedIn, user } = useUser();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentTab, setCurrentTab] = useState('email');
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const { success, error, ToastContainer } = useToast();

  const fetchOutreachData = async () => {
    if (!isSignedIn || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      const outreachQuery = query(
        collection(clientDb, "outreach_records"),
        where("ownerUserId", "==", user.id)
      );

      const querySnapshot = await getDocs(outreachQuery);
      const outreachRecords: any[] = [];

      console.log(`Found ${querySnapshot.size} outreach records for user ${user.id}`);

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Outreach record:', doc.id, data);

        const record = {
          id: doc.id,
          channel: data.messageType, // 'email' or 'linkedin'
          stage: data.stage,
          name: data.founderName,
          initials: getInitials(data.founderName, data.company),
          role: 'Founder', // Default role
          type: getOutreachTypeDisplay(data.outreachType),
          email: data.email,
          linkedin: data.linkedinUrl,
          subject: getSubjectFromMessage(data.generatedMessage),
          message: data.generatedMessage,
          company: data.company,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };
        outreachRecords.push(record);
      });

      // Group records by founder and keep only the most recent one for display
      const groupedRecords = groupOutreachByFounder(outreachRecords);
      setRecords(groupedRecords);
    } catch (err) {
      console.error('Error fetching outreach data:', err);
      error('Failed to load outreach data');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutreachData();
  }, [isSignedIn, user?.id]);

  // Auto-refresh every 30 seconds to keep data in sync
  useEffect(() => {
    if (!isSignedIn || !user?.id) return;

    const interval = setInterval(() => {
      fetchOutreachData();
    }, 30000);

    return () => clearInterval(interval);
  }, [isSignedIn, user?.id]);

  const updateStageInFirebase = async (recordId: string, newStage: string, allRecordIds: string[] = []) => {
    try {
      // If we have multiple records for the same founder, update all of them
      const idsToUpdate = allRecordIds.length > 0 ? allRecordIds : [recordId];

      const updatePromises = idsToUpdate.map(async (id) => {
        const docRef = doc(clientDb, "outreach_records", id);
        return updateDoc(docRef, {
          stage: newStage,
          updatedAt: new Date()
        });
      });

      await Promise.all(updatePromises);
      success(`Stage updated successfully for ${idsToUpdate.length} record(s)`);
    } catch (err) {
      console.error('Error updating stage:', err);
      error('Failed to update stage');
      throw err;
    }
  };

  const handleDragStart = (e: React.DragEvent, item: any) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem(item);
    (e.currentTarget as HTMLElement).classList.add('dragging');

    // Add visual feedback to valid drop zones
    const validStages = item.channel === 'email' ? EMAIL_STAGES : LINKEDIN_STAGES;
    validStages.forEach(stage => {
      if (stage !== item.stage) {
        const dropZone = document.querySelector(`[data-stage="${stage}"][data-channel="${item.channel}"] .flex-1`);
        if (dropZone) {
          dropZone.classList.add('drop-target');
        }
      }
    });
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('dragging');

    // Remove visual feedback from all drop zones
    document.querySelectorAll('.drop-target').forEach(el => {
      el.classList.remove('drop-target');
    });

    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('drop-highlight');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('drop-highlight');
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drop-highlight');

    const itemId = e.dataTransfer.getData('text/plain');

    if (draggedItem && draggedItem.id === itemId && draggedItem.stage !== newStage) {
      setUpdating(true);
      try {
        // Get all record IDs for this founder (if grouped)
        const allRecordIds = draggedItem.outreachHistory
          ? draggedItem.outreachHistory.map((record: any) => record.id)
          : [itemId];

        // Update in Firebase
        await updateStageInFirebase(itemId, newStage, allRecordIds);

        // Update local state immediately for better UX
        const updatedRecords = records.map(record => {
          if (record.id === itemId) {
            return {
              ...record,
              stage: newStage,
              // Update all records in history too
              outreachHistory: record.outreachHistory?.map((historyRecord: any) => ({
                ...historyRecord,
                stage: newStage
              }))
            };
          }
          return record;
        });
        setRecords(updatedRecords);

        // Refresh data from database after a short delay to ensure consistency
        setTimeout(() => {
          fetchOutreachData();
        }, 2000);

      } catch (err) {
        // Error already handled in updateStageInFirebase
        // Revert local state on error
        fetchOutreachData();
      } finally {
        setUpdating(false);
      }
    }

    setDraggedItem(null);
  };

  const getStageColor = (stage: string) => {
    const colorMap: Record<string, string> = {
      'sent': 'bg-[#7f8bb3]',
      'responded': 'bg-[#b497d6]',
      'in_talks': 'bg-[#c7a8e6]',
      'interviewing': 'bg-[#e1e2ef]',
      'rejected': 'bg-[#9b4444]',
      'hired': 'bg-[#62c98d]',
      'connected': 'bg-[#7fb3a6]',
      'ghosted': 'bg-[#8b7f7f]'
    };
    return colorMap[stage] || 'bg-[#a6a7b4]';
  };

  const countByStage = (channel: string) => {
    const stages = channel === 'email' ? EMAIL_STAGES : LINKEDIN_STAGES;
    const counts = Object.fromEntries(stages.map(s => [s, 0]));
    records.filter(x => x.channel === channel).forEach(x => {
      counts[x.stage] = (counts[x.stage] || 0) + 1;
    });
    return counts;
  };

  const renderStatsBar = (channel: string) => {
    const stages = channel === 'email' ? EMAIL_STAGES : LINKEDIN_STAGES;
    const counts = countByStage(channel);

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {stages.map(stage => (
          <div key={stage} className="stat-pill rounded-xl px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`stat-dot ${getStageColor(stage)}`}></span>
              <span className="text-[12px] text-neutral-300">{STAGE_DISPLAY_NAMES[stage] || stage}</span>
            </div>
            <span className="text-[12px] font-semibold text-white">{counts[stage] || 0}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderKanbanBoard = (channel: string) => {
    const stages = channel === 'email' ? EMAIL_STAGES : LINKEDIN_STAGES;
    const channelRecords = records.filter(r => r.channel === channel);

    return (
      <div className="kanban-container">
        <div className={`kanban-board ${channel === 'linkedin' ? 'columns-4' : ''}`} aria-live="polite">
          {stages.map(stage => (
            <div key={stage} className="kanban-col rounded-2xl" data-stage={stage} data-channel={channel}>
              <div className="kanban-col-header flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded brand-badge text-[10px] font-bold">
                    {stage[0]}
                  </span>
                  <span className="text-[12px] font-semibold text-white">{STAGE_DISPLAY_NAMES[stage] || stage}</span>
                </div>
                <span className="text-[10px] text-neutral-400">
                  <span className="count">{channelRecords.filter(r => r.stage === stage).length}</span>
                </span>
              </div>
              <div
                className="p-1.5 flex flex-col gap-2 flex-1"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage)}
              >
                {channelRecords
                  .filter(record => record.stage === stage)
                  .map(record => (
                    <article
                      key={record.id}
                      className="kanban-card rounded-xl text-sm select-none"
                      draggable
                      onDragStart={(e) => handleDragStart(e, record)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="flex items-start gap-2">
                        <div className="card-initials flex h-8 w-8 items-center justify-center rounded-lg brand-badge text-xs flex-shrink-0">
                          {record.initials}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <h3 className="truncate text-[12px] font-semibold leading-tight">{record.name}</h3>
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide role-badge-founder flex-shrink-0">
                              {record.role}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mb-2">
                            <span className="tag inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                              {record.type}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              • {record.channel === 'email' ? 'Email' : 'LinkedIn'}
                            </span>
                            {record.outreachCount > 1 && (
                              <span className="inline-flex items-center rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-blue-400">
                                {record.outreachCount}
                              </span>
                            )}
                          </div>
                          <button
                            className="w-full text-left rounded-lg panel px-2 py-1.5 hover:bg-[#18192a] mb-2"
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowHistoryModal(true);
                            }}
                          >
                            <div className="truncate text-[11px] font-semibold text-white leading-tight">
                              {record.subject || 'Message'}
                            </div>
                            <div className="mt-0.5 line-clamp-2 text-[10px] text-neutral-300 leading-tight">
                              {record.message?.length > 80 ? record.message.slice(0, 79) + '…' : record.message}
                            </div>
                          </button>
                          <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                            {record.email && (
                              <a
                                href={`mailto:${record.email}`}
                                className="rounded px-1.5 py-0.5 panel hover:bg-[#18192a] text-[9px]"
                                title="Email"
                              >
                                Email
                              </a>
                            )}
                            {record.linkedin && (
                              <a
                                href={record.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded px-1.5 py-0.5 panel hover:bg-[#18192a] text-[9px]"
                                title="LinkedIn"
                              >
                                LinkedIn
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white mb-2">Welcome to Founder Flow</h1>
            <p className="text-[#ccceda] mb-6">Sign in to access your outreach board</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Page header */}
      <header className="mx-auto max-w-6xl px-4 pt-5 sm:pt-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-white">
              Outreach Board
              {updating && (
                <span className="ml-2 inline-flex items-center text-sm text-[#ccceda]">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </span>
              )}
            </h1>
            <p className="text-sm text-[#ccceda]">Track the full life cycle of your conversations with founders across Email and LinkedIn.</p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchOutreachData();
            }}
            disabled={loading || updating}
            className="focus-ring rounded-lg px-3 py-2 text-sm font-semibold btn-ghost disabled:opacity-50"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:pt-6">
        <div role="tablist" aria-label="Outreach channels" className="inline-flex rounded-xl border border-white/10 panel p-1 text-sm">
          <button
            id="tab-email-btn"
            role="tab"
            aria-selected={currentTab === 'email'}
            aria-controls="tab-email"
            className={`tab-btn focus-ring rounded-lg px-3 py-1.5 text-neutral-200 ${currentTab === 'email' ? 'bg-[var(--lavender-web)] text-[#0f1018]' : ''
              }`}
            onClick={() => setCurrentTab('email')}
          >
            Email
          </button>
          <button
            id="tab-linkedin-btn"
            role="tab"
            aria-selected={currentTab === 'linkedin'}
            aria-controls="tab-linkedin"
            className={`tab-btn focus-ring rounded-lg px-3 py-1.5 text-neutral-200 ${currentTab === 'linkedin' ? 'bg-[var(--lavender-web)] text-[#0f1018]' : ''
              }`}
            onClick={() => setCurrentTab('linkedin')}
          >
            LinkedIn
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mx-auto max-w-6xl px-4 pt-4">
        {renderStatsBar(currentTab)}
      </div>

      {/* Boards */}
      <main className="w-full px-4 py-6 sm:py-8 overflow-x-auto">
        {currentTab === 'email' && (
          <section id="tab-email" role="tabpanel" aria-labelledby="tab-email-btn">
            {renderKanbanBoard('email')}
          </section>
        )}
        {currentTab === 'linkedin' && (
          <section id="tab-linkedin" role="tabpanel" aria-labelledby="tab-linkedin-btn">
            {renderKanbanBoard('linkedin')}
          </section>
        )}
      </main>

      {/* Message Modal */}
      {showModal && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowModal(false)}></div>
          <div className="relative z-10 w-[min(720px,92vw)] rounded-2xl panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 shrink-0 rounded-xl brand-badge flex items-center justify-center font-semibold">
                  {selectedMessage.initials}
                </div>
                <div>
                  <div className="text-base font-semibold text-white">{selectedMessage.name}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                    <span>{selectedMessage.role}</span>
                    <span>•</span>
                    <span>{selectedMessage.channel === 'email' ? 'Email' : 'LinkedIn'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="tag inline-flex items-center rounded-full px-2 py-0.5 text-[11px]">
                  {selectedMessage.type}
                </span>
                <button
                  className="focus-ring rounded-lg px-2.5 py-1 text-xs font-semibold btn-primary"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              {selectedMessage.email && (
                <a
                  href={`mailto:${selectedMessage.email}`}
                  className="rounded-lg px-2 py-1 panel hover:bg-[#18192a] flex items-center gap-1"
                >
                  <svg viewBox="0 0 24 24" fill="#e8e9f1" className="h-3.5 w-3.5">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z" />
                  </svg>
                  <span>{selectedMessage.email}</span>
                </a>
              )}
              {selectedMessage.linkedin && (
                <a
                  href={selectedMessage.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg px-2 py-1 panel hover:bg-[#18192a] flex items-center gap-1"
                >
                  <svg viewBox="0 0 24 24" fill="#e8e9f1" className="h-3.5 w-3.5">
                    <path d="M6 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4ZM4 8h4v12H4V8Zm6 0h4v2.5c.6-1.1 2.1-2.5 4.7-2.5 5 0 5.3 3.3 5.3 7.6V20h-4v-5.3c0-2.1 0-4.7-2.9-4.7s-3.4 2.2-3.4 4.6V20h-4V8Z" />
                  </svg>
                  <span>linkedin.com/in/{selectedMessage.name.toLowerCase().replace(' ', '')}</span>
                </a>
              )}
            </div>
            <div className="mt-4 grid gap-2">
              <div className="text-sm font-semibold text-white">{selectedMessage.subject || 'Subject'}</div>
              <div className="rounded-xl panel p-3 text-[13px] leading-6 text-neutral-200 whitespace-pre-wrap">
                {selectedMessage.message}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outreach History Modal */}
      {showHistoryModal && selectedRecord && (
        <OutreachHistoryModal
          record={selectedRecord}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedRecord(null);
          }}
        />
      )}

      <ToastContainer />
    </div>
  );
}