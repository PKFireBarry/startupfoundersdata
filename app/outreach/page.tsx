"use client";

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { clientDb } from '../../lib/firebase/client';
import Navigation from '../components/Navigation';
import OutreachHistoryModal from '../components/OutreachHistoryModal';
import { useToast } from '../hooks/useToast';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from '../components/PaywallModal';
import { isValidActionableUrl } from '../../lib/url-validation';

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
const EMAIL_STAGES = ["sent", "responded", "in_talks", "interviewing", "rejected"];
const LINKEDIN_STAGES = ["sent", "responded", "connected", "ghosted"];

// Display names for stages
const STAGE_DISPLAY_NAMES: Record<string, string> = {
  sent: "Sent",
  responded: "Responded",
  in_talks: "In Talks",
  interviewing: "Interviewing",
  rejected: "Rejected",
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
  const { isPaid, loading: subscriptionLoading } = useSubscription();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentTab, setCurrentTab] = useState('email');
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [showPaywall, setShowPaywall] = useState(false);
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

      // Found outreach records for user

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Processing outreach record

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
    
    // Enhanced drag visual effects
    const target = e.currentTarget as HTMLElement;
    target.classList.add('dragging');
    target.style.opacity = '0.8';
    target.style.transform = 'rotate(2deg) scale(1.05)';
    target.style.zIndex = '1000';
    target.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';

    // Add visual feedback to valid drop zones with animation
    const validStages = item.channel === 'email' ? EMAIL_STAGES : LINKEDIN_STAGES;
    validStages.forEach(stage => {
      if (stage !== item.stage) {
        const dropZone = document.querySelector(`[data-stage="${stage}"][data-channel="${item.channel}"] > div:last-child`);
        if (dropZone) {
          dropZone.classList.add('drop-target');
          (dropZone as HTMLElement).style.animation = 'pulse 1.5s infinite';
        }
      }
    });
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('dragging');
    
    // Reset drag styles with smooth transition
    target.style.opacity = '';
    target.style.transform = '';
    target.style.zIndex = '';
    target.style.boxShadow = '';
    target.style.transition = 'all 0.3s ease-out';
    
    // Remove transition after animation completes
    setTimeout(() => {
      target.style.transition = '';
    }, 300);

    // Remove visual feedback from all drop zones
    document.querySelectorAll('.drop-target').forEach(el => {
      el.classList.remove('drop-target');
      (el as HTMLElement).style.animation = '';
    });

    setDraggedItem(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const dropZone = e.currentTarget as HTMLElement;
    dropZone.classList.add('border-blue-500', 'bg-blue-500/10', 'border-solid');
    dropZone.classList.remove('border-white/10', 'bg-white/2', 'border-dashed');
    dropZone.style.transform = 'scale(1.02)';
    dropZone.style.transition = 'all 0.2s ease-out';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const dropZone = e.currentTarget as HTMLElement;
    dropZone.classList.remove('border-blue-500', 'bg-blue-500/10', 'border-solid');
    dropZone.classList.add('border-white/10', 'bg-white/2', 'border-dashed');
    dropZone.style.transform = '';
    dropZone.style.transition = 'all 0.2s ease-out';
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    const dropZone = e.currentTarget as HTMLElement;
    dropZone.classList.remove('border-blue-500', 'bg-blue-500/10', 'border-solid');
    dropZone.classList.add('border-white/10', 'bg-white/2', 'border-dashed');
    dropZone.style.transform = '';
    dropZone.style.transition = 'all 0.2s ease-out';
    
    // Add success animation
    dropZone.style.animation = 'dropSuccess 0.5s ease-out';
    setTimeout(() => {
      dropZone.style.animation = '';
    }, 500);

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

  const handleDeleteRecord = async (recordId: string) => {
    if (!window.confirm('Are you sure you want to delete this outreach record? This action cannot be undone.')) {
      return;
    }

    try {
      setUpdating(true);
      
      // Delete from Firebase
      const docRef = doc(clientDb, "outreach_records", recordId);
      await deleteDoc(docRef);
      
      // Update local state
      setRecords(prev => prev.filter(record => record.id !== recordId));
      
      success('Outreach record deleted successfully');
      
      // Refresh data after short delay
      setTimeout(() => {
        fetchOutreachData();
      }, 1000);
      
    } catch (err) {
      console.error('Error deleting record:', err);
      error('Failed to delete record');
    } finally {
      setUpdating(false);
    }
  };

  const renderKanbanBoard = (channel: string) => {
    const stages = channel === 'email' ? EMAIL_STAGES : LINKEDIN_STAGES;
    const channelRecords = records.filter(r => r.channel === channel);

    return (
      <div className="kanban-container">
        <div className={`kanban-board ${stages.length === 5 ? 'columns-5' : 'columns-4'}`}>
          {stages.map(stage => (
            <div key={stage} className="kanban-col rounded-2xl" data-stage={stage} data-channel={channel}>
              {/* Column Header */}
              <div className="kanban-col-header flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStageColor(stage)}`}></div>
                  <span className="text-sm font-semibold text-white">{STAGE_DISPLAY_NAMES[stage] || stage}</span>
                </div>
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/10 text-xs font-medium text-neutral-300">
                  {channelRecords.filter(r => r.stage === stage).length}
                </span>
              </div>
              
              {/* Drop Zone */}
              <div
                className="min-h-[500px] p-4 rounded-xl border-2 border-dashed border-white/10 bg-white/2 transition-all duration-200 ease-in-out"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage)}
              >
                <div className="space-y-4" style={{gap: '1rem', display: 'flex', flexDirection: 'column'}}>
                  {channelRecords
                    .filter(record => record.stage === stage)
                    .map(record => (
                      <article
                        key={record.id}
                        className="kanban-card group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-move select-none dark:bg-[#1a1b23] dark:border-white/10"
                        draggable
                        onDragStart={(e) => handleDragStart(e, record)}
                        onDragEnd={handleDragEnd}
                      >
                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRecord(record.id);
                          }}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-6 h-6 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center z-10"
                          title="Delete outreach"
                        >
                          <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        <div className="p-4">
                          {/* Header with Avatar and Name */}
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                              {record.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {record.name}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                                {record.company}
                              </p>
                            </div>
                          </div>

                          {/* Tags with Labels */}
                          <div className="space-y-2 mb-3">
                            {/* Outreach Type */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 dark:text-neutral-400 font-medium min-w-0 flex-shrink-0">Type:</span>
                              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                {record.type}
                              </span>
                            </div>
                            
                            {/* Message Channel */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 dark:text-neutral-400 font-medium min-w-0 flex-shrink-0">Channel:</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                record.channel === 'email' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                                {record.channel === 'email' ? 'Email' : 'LinkedIn'}
                              </span>
                              {record.outreachCount && record.outreachCount > 1 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                  {record.outreachCount} messages
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Message Preview */}
                          <button
                            className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 transition-colors duration-200 mb-3"
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowHistoryModal(true);
                            }}
                          >
                            <div className="text-sm font-medium text-gray-900 dark:text-white mb-1 truncate">
                              {record.subject || 'View Message'}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-neutral-300 line-clamp-2">
                              {record.message?.length > 100 ? record.message.slice(0, 97) + '...' : record.message}
                            </div>
                          </button>


                          {/* Date Footer */}
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-neutral-400">
                              <span>
                                Created {record.createdAt ? 
                                  new Date(record.createdAt?.toDate?.() || record.createdAt).toLocaleDateString() : 
                                  'Unknown date'
                                }
                              </span>
                              {record.outreachCount && record.outreachCount > 1 && (
                                <span className="font-medium">Multiple messages</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  
                  {/* Empty State */}
                  {channelRecords.filter(record => record.stage === stage).length === 0 && (
                    <div className="text-center py-8 text-gray-400 dark:text-neutral-500">
                      <svg className="mx-auto w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-sm">Drop cards here</p>
                    </div>
                  )}
                </div>
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

  if (!subscriptionLoading && !isPaid) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Outreach Board</h1>
            <p className="text-[#ccceda] mb-6">This is a premium feature. Upgrade to access your outreach pipeline and CRM tools.</p>
            <button
              onClick={() => setShowPaywall(true)}
              className="btn-primary px-6 py-3 text-sm font-medium rounded-lg"
            >
              Upgrade to Access
            </button>
          </div>
        </div>
        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          feature="Outreach Board"
          description="Upgrade to access the full outreach board with CRM features, pipeline management, and message tracking."
        />
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        @keyframes slideIn {
          0% {
            transform: translateY(10px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes dropSuccess {
          0% {
            transform: scale(1.02);
            background-color: rgba(59, 130, 246, 0.1);
          }
          50% {
            transform: scale(1.05);
            background-color: rgba(34, 197, 94, 0.15);
          }
          100% {
            transform: scale(1);
            background-color: rgba(255, 255, 255, 0.02);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.02);
            opacity: 0.8;
          }
        }
        
        .kanban-card {
          animation: slideIn 0.4s ease-out forwards;
        }
        
        .kanban-card:nth-child(2) {
          animation-delay: 0.1s;
        }
        
        .kanban-card:nth-child(3) {
          animation-delay: 0.2s;
        }
        
        .kanban-card:nth-child(4) {
          animation-delay: 0.3s;
        }
        
        .dragging {
          transition: all 0.2s ease-out !important;
        }
      `}</style>
      
      <div className="min-h-screen" style={{
        background: `
          radial-gradient(900px 500px at 10% -10%, rgba(5,32,74,.12) 0%, transparent 60%),
          radial-gradient(900px 500px at 90% -10%, rgba(180,151,214,.12) 0%, transparent 60%),
          linear-gradient(180deg, #0c0d14, #0a0b12 60%, #08090f 100%)
        `,
        color: '#ececf1'
      }}>
        <Navigation />

      {/* Mobile message */}
      <div className="block xl:hidden">
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Desktop Only</h1>
            <p className="text-[#ccceda] mb-6">The outreach board is designed for desktop use. Please use a larger screen to access this feature.</p>
          </div>
        </div>
      </div>

      {/* Desktop content */}
      <div className="hidden lg:block">
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
          <button
            id="tab-analytics-btn"
            role="tab"
            aria-selected={currentTab === 'analytics'}
            aria-controls="tab-analytics"
            className={`tab-btn focus-ring rounded-lg px-3 py-1.5 text-neutral-200 ${currentTab === 'analytics' ? 'bg-[var(--lavender-web)] text-[#0f1018]' : ''
              }`}
            onClick={() => setCurrentTab('analytics')}
          >
            Analytics
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      {(currentTab === 'email' || currentTab === 'linkedin') && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          {renderStatsBar(currentTab)}
        </div>
      )}

      {/* Boards */}
      <main className="w-full px-4 py-6 sm:py-8 overflow-x-auto flex justify-center">
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
        {currentTab === 'analytics' && (
          <section id="tab-analytics" role="tabpanel" aria-labelledby="tab-analytics-btn" className="mx-auto max-w-6xl">
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Analytics Coming Soon</h2>
              <p className="text-neutral-400 mb-6 max-w-md mx-auto">
                Get insights into your outreach performance with detailed analytics, response rates, and success metrics.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                  <h3 className="text-sm font-medium text-white mb-1">Response Rates</h3>
                  <p className="text-xs text-neutral-400">Track email vs LinkedIn response rates</p>
                </div>
                <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                  <h3 className="text-sm font-medium text-white mb-1">Conversion Funnel</h3>
                  <p className="text-xs text-neutral-400">See your outreach pipeline progression</p>
                </div>
                <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                  <h3 className="text-sm font-medium text-white mb-1">Time to Response</h3>
                  <p className="text-xs text-neutral-400">Average response times by channel</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      </div>

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
              {selectedMessage.email && isValidActionableUrl(`mailto:${selectedMessage.email}`, { context: 'email' }) && (
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
              {selectedMessage.linkedin && isValidActionableUrl(selectedMessage.linkedin, { context: 'linkedin_url' }) && (
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
    </>
  );
}