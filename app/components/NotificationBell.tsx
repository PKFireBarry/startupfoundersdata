"use client";

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationBell() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, executeAction, dismissNotification, markAllAsRead } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (!isDropdownOpen && unreadCount > 0) {
      markAllAsRead();
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={handleBellClick}
        className="relative focus-ring rounded-lg p-2 text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {/* Notification Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/10 panel shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    notifications.forEach(n => dismissNotification(n.id));
                  }}
                  className="text-xs text-neutral-400 hover:text-white transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-neutral-400">All caught up!</p>
                <p className="text-xs text-neutral-500 mt-1">No new notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-4 hover:bg-white/5 transition-colors">
                    {/* Notification Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">
                          {notification.title}
                        </h4>
                        <p className="text-xs text-neutral-400 mt-1">
                          {notification.founderName} • {notification.company}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                          notification.messageType === 'email' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {notification.messageType}
                        </span>
                        <button
                          onClick={() => dismissNotification(notification.id)}
                          className="text-neutral-500 hover:text-neutral-300 transition-colors"
                          aria-label="Dismiss notification"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Notification Message */}
                    <p className="text-sm text-neutral-300 mb-3 leading-relaxed">
                      {notification.message}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {notification.actions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => executeAction(notification.id, action.id)}
                          className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            action.action === 'move_stage'
                              ? 'bg-[var(--lavender-web)] text-[#0f1018] hover:bg-[var(--lavender-web)]/90'
                              : 'border border-white/20 text-neutral-300 hover:bg-white/5'
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>

                    {/* Time Stamp */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                      <span className="text-xs text-neutral-500">
                        {notification.daysSinceCreated} days since outreach
                      </span>
                      <span className="text-xs text-neutral-500">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-white/10 text-center">
              <p className="text-xs text-neutral-500">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}