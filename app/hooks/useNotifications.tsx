"use client";

import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { clientDb } from '../../lib/firebase/client';

interface NotificationAction {
  id: string;
  label: string;
  action: 'move_stage' | 'archive' | 'dismiss';
  newStage?: string;
}

interface Notification {
  id: string;
  type: 'reminder' | 'ghosted_check' | 'response_check';
  title: string;
  message: string;
  outreachRecordId: string;
  founderName: string;
  company: string;
  messageType: 'email' | 'linkedin';
  currentStage: string;
  daysSinceCreated: number;
  actions: NotificationAction[];
  createdAt: Date;
}

interface NotificationSettings {
  emailReminderFrequency: number; // days
  linkedinReminderFrequency: number; // days
  emailGhostedThreshold: number; // days
  linkedinGhostedThreshold: number; // days
  enabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  emailReminderFrequency: 7, // weekly
  linkedinReminderFrequency: 3, // every 3 days
  emailGhostedThreshold: 28, // 4 weeks
  linkedinGhostedThreshold: 14, // 2 weeks
  enabled: true
};

export function useNotifications() {
  const { user, isSignedIn } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  const calculateDaysSince = (date: any): number => {
    const now = new Date();
    const createdDate = date?.toDate?.() || new Date(date || 0);
    const diffMs = now.getTime() - createdDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const loadDismissedNotifications = useCallback(async () => {
    if (!isSignedIn || !user?.id) return;

    try {
      // Load dismissed notifications from Firestore
      const q = query(
        collection(clientDb, "dismissed_notifications"),
        where("userId", "==", user.id)
      );
      const snapshot = await getDocs(q);
      
      const dismissed = new Set<string>();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        dismissed.add(data.notificationKey);
      });
      
      setDismissedNotifications(dismissed);
    } catch (error) {
      console.error('Error loading dismissed notifications:', error);
    }
  }, [isSignedIn, user?.id]);

  const markNotificationAsDismissed = async (notificationId: string, outreachRecordId: string) => {
    if (!user?.id) return;

    try {
      // Create a unique key for this notification based on outreach record and type
      const notificationKey = notificationId.replace(/(reminder|ghosted)-/, '') + '-' + notificationId.split('-')[0];
      
      // Save to Firestore
      await addDoc(collection(clientDb, "dismissed_notifications"), {
        userId: user.id,
        notificationKey,
        outreachRecordId,
        dismissedAt: serverTimestamp()
      });
      
      // Update local state
      setDismissedNotifications(prev => new Set([...prev, notificationKey]));
    } catch (error) {
      console.error('Error marking notification as dismissed:', error);
    }
  };

  const shouldShowReminder = (record: any, settings: NotificationSettings): boolean => {
    const daysSinceCreated = calculateDaysSince(record.createdAt);
    const daysSinceLastInteraction = calculateDaysSince(record.last_interaction_date || record.createdAt);
    
    // Only show reminders for 'sent' stage (no response yet)
    if (record.stage !== 'sent') return false;

    const frequency = record.messageType === 'email' 
      ? settings.emailReminderFrequency 
      : settings.linkedinReminderFrequency;

    // Show reminder if it's been enough days since last interaction
    return daysSinceLastInteraction >= frequency;
  };

  const shouldShowGhostedCheck = (record: any, settings: NotificationSettings): boolean => {
    const daysSinceLastInteraction = calculateDaysSince(record.last_interaction_date || record.createdAt);
    
    // Only show ghosted check for 'sent' stage
    if (record.stage !== 'sent') return false;

    const threshold = record.messageType === 'email' 
      ? settings.emailGhostedThreshold 
      : settings.linkedinGhostedThreshold;

    return daysSinceLastInteraction >= threshold;
  };

  const generateNotifications = useCallback(async (): Promise<Notification[]> => {
    if (!isSignedIn || !user?.id || !settings.enabled) return [];

    try {
      // Get all outreach records for user
      const q = query(
        collection(clientDb, "outreach_records"),
        where("ownerUserId", "==", user.id)
      );
      const snapshot = await getDocs(q);
      
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          last_interaction_date: data.last_interaction_date,
          stage: data.stage,
          founderName: data.founderName,
          company: data.company,
          messageType: data.messageType,
          ...data
        };
      });

      const newNotifications: Notification[] = [];

      records.forEach(record => {
        const daysSinceCreated = calculateDaysSince(record.createdAt);
        const daysSinceLastInteraction = calculateDaysSince(record.last_interaction_date || record.createdAt);

        // Check for ghosted scenario first (higher priority)
        if (shouldShowGhostedCheck(record, settings)) {
          const notificationKey = record.id + '-ghosted';
          
          // Skip if this notification has been dismissed
          if (dismissedNotifications.has(notificationKey)) return;
          
          newNotifications.push({
            id: `ghosted-${record.id}`,
            type: 'ghosted_check',
            title: 'No response received',
            message: `It's been ${daysSinceLastInteraction} days since your last interaction with ${record.founderName} at ${record.company}. Were you ghosted?`,
            outreachRecordId: record.id,
            founderName: record.founderName,
            company: record.company,
            messageType: record.messageType,
            currentStage: record.stage,
            daysSinceCreated: daysSinceLastInteraction,
            actions: [
              {
                id: 'archive',
                label: 'Yes, archive it',
                action: 'move_stage',
                newStage: 'ghosted'
              },
              {
                id: 'keep',
                label: 'No, keep waiting',
                action: 'dismiss'
              }
            ],
            createdAt: new Date()
          });
        }
        // Check for regular reminders
        else if (shouldShowReminder(record, settings)) {
          const notificationKey = record.id + '-reminder';
          
          // Skip if this notification has been dismissed
          if (dismissedNotifications.has(notificationKey)) return;
          
          const channel = record.messageType === 'email' ? 'email' : 'LinkedIn';
          newNotifications.push({
            id: `reminder-${record.id}`,
            type: 'reminder',
            title: `Follow up on ${channel} outreach`,
            message: `It's been ${daysSinceLastInteraction} days since your last interaction with ${record.founderName} at ${record.company}. Did they respond?`,
            outreachRecordId: record.id,
            founderName: record.founderName,
            company: record.company,
            messageType: record.messageType,
            currentStage: record.stage,
            daysSinceCreated: daysSinceLastInteraction,
            actions: [
              {
                id: 'responded',
                label: 'Yes, they responded',
                action: 'move_stage',
                newStage: 'responded'
              },
              {
                id: 'no_response',
                label: 'No response yet',
                action: 'dismiss'
              }
            ],
            createdAt: new Date()
          });
        }
      });

      return newNotifications;
    } catch (error) {
      console.error('Error generating notifications:', error);
      return [];
    }
  }, [isSignedIn, user?.id, settings, dismissedNotifications]);

  const loadNotifications = useCallback(async () => {
    if (!isSignedIn || !user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      // First load dismissed notifications, then generate new ones
      await loadDismissedNotifications();
      const newNotifications = await generateNotifications();
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [generateNotifications, loadDismissedNotifications, isSignedIn, user?.id]);

  const executeAction = async (notificationId: string, actionId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    const action = notification?.actions.find(a => a.id === actionId);
    
    if (!notification || !action) return;

    try {
      if (action.action === 'move_stage' && action.newStage) {
        // Update the stage in Firebase
        const docRef = doc(clientDb, "outreach_records", notification.outreachRecordId);
        await updateDoc(docRef, {
          stage: action.newStage,
          updatedAt: new Date(),
          last_interaction_date: new Date() // Track when user took action
        });
      }

      // Remove notification from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Error executing notification action:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;
    
    // Mark as dismissed persistently
    await markNotificationAsDismissed(notificationId, notification.outreachRecordId);
    
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  // Load dismissed notifications first
  useEffect(() => {
    if (isSignedIn && user?.id) {
      loadDismissedNotifications();
    }
  }, [loadDismissedNotifications, isSignedIn, user?.id]);

  // Load notifications on mount and when user changes
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Refresh notifications every 5 minutes
  useEffect(() => {
    if (!isSignedIn || !user?.id) return;

    const interval = setInterval(() => {
      loadNotifications();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [loadNotifications, isSignedIn, user?.id]);

  return {
    notifications,
    unreadCount,
    loading,
    settings,
    executeAction,
    dismissNotification,
    updateSettings,
    markAllAsRead,
    refresh: loadNotifications
  };
}