"use client";

import { useNotifications } from '../hooks/useNotifications';
import { useUser } from '@clerk/nextjs';

export default function NotificationDebug() {
  const { debug, settings, notifications, loading, unreadCount } = useNotifications();
  const { user, isSignedIn } = useUser();

  return (
    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 mt-4">
      <h4 className="text-sm font-medium text-yellow-400 mb-2">Debug Information</h4>
      <div className="space-y-2 text-xs text-yellow-300">
        <div>User ID: {user?.id || 'Not signed in'}</div>
        <div>Signed In: {isSignedIn ? 'Yes' : 'No'}</div>
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Settings Enabled: {settings.enabled ? 'Yes' : 'No'}</div>
        <div>Notifications Count: {notifications.length}</div>
        <div>Unread Count: {unreadCount}</div>
        <div>Email Reminder Frequency: {settings.emailReminderFrequency} days</div>
        <div>LinkedIn Reminder Frequency: {settings.linkedinReminderFrequency} days</div>
        <div>Email Ghosted Threshold: {settings.emailGhostedThreshold} days</div>
        <div>LinkedIn Ghosted Threshold: {settings.linkedinGhostedThreshold} days</div>
      </div>
      <button
        onClick={debug}
        className="mt-3 rounded-lg px-3 py-1.5 text-xs font-medium bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
      >
        Log Debug Info to Console
      </button>
    </div>
  );
}