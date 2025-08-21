"use client";

import { useEffect, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';

interface NewNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewNotificationsModal({ isOpen, onClose }: NewNotificationsModalProps) {
  const { notifications, unreadCount } = useNotifications();
  const [hasShown, setHasShown] = useState(false);

  // Auto-show modal on login if there are new notifications
  useEffect(() => {
    if (isOpen && !hasShown && unreadCount > 0) {
      setHasShown(true);
    }
  }, [isOpen, hasShown, unreadCount]);

  if (!isOpen || unreadCount === 0) return null;

  const urgentNotifications = notifications.filter(n => n.type === 'ghosted_check');
  const reminderNotifications = notifications.filter(n => n.type === 'reminder');

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white text-neutral-900 dark:bg-[#11121b] dark:text-neutral-100 rounded-2xl shadow-2xl w-full max-w-md border border-white/10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">New Notifications</h3>
              <p className="text-sm text-neutral-400">
                You have {unreadCount} new notification{unreadCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Urgent Notifications (Ghosted Checks) */}
          {urgentNotifications.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <h4 className="text-sm font-semibold text-white">
                  Requires Action ({urgentNotifications.length})
                </h4>
              </div>
              <div className="space-y-2">
                {urgentNotifications.slice(0, 3).map((notification) => (
                  <div key={notification.id} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-white">
                        {notification.founderName}
                      </p>
                      <span className="text-xs text-red-400 font-medium">
                        {notification.daysSinceCreated} days
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      {notification.company} • No response on {notification.messageType}
                    </p>
                  </div>
                ))}
                {urgentNotifications.length > 3 && (
                  <p className="text-xs text-neutral-500 text-center">
                    +{urgentNotifications.length - 3} more urgent notifications
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Regular Reminders */}
          {reminderNotifications.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <h4 className="text-sm font-semibold text-white">
                  Follow-up Reminders ({reminderNotifications.length})
                </h4>
              </div>
              <div className="space-y-2">
                {reminderNotifications.slice(0, 2).map((notification) => (
                  <div key={notification.id} className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-white">
                        {notification.founderName}
                      </p>
                      <span className="text-xs text-blue-400 font-medium">
                        {notification.daysSinceCreated} days
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      {notification.company} • {notification.messageType} follow-up
                    </p>
                  </div>
                ))}
                {reminderNotifications.length > 2 && (
                  <p className="text-xs text-neutral-500 text-center">
                    +{reminderNotifications.length - 2} more reminders
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="p-3 rounded-lg border border-white/10 bg-[#141522]">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Click the bell icon in the navigation to view and manage all your notifications, or update your notification preferences in Dashboard Settings.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 focus-ring rounded-lg px-4 py-2 text-sm font-medium border border-white/20 text-neutral-300 hover:bg-white/5 transition-colors"
          >
            Later
          </button>
          <button
            onClick={onClose}
            className="flex-1 focus-ring rounded-lg px-4 py-2 text-sm font-medium bg-[var(--lavender-web)] text-[#0f1018] hover:bg-[var(--lavender-web)]/90 transition-colors"
          >
            View Notifications
          </button>
        </div>
      </div>
    </div>
  );
}