"use client";

import { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationSettings() {
  const { settings, updateSettings } = useNotifications();
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <h3 className="text-base font-semibold text-white">Notification Settings</h3>
        <p className="text-sm text-neutral-400 mt-1">
          Configure when and how often you receive outreach follow-up reminders.
        </p>
      </div>

      {/* Settings Form */}
      <div className="space-y-6">
        {/* Enable/Disable Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-white">Enable Notifications</h4>
            <p className="text-xs text-neutral-400 mt-1">
              Turn on/off all outreach follow-up notifications
            </p>
          </div>
          <button
            onClick={() => handleSettingChange('enabled', !localSettings.enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--lavender-web)] focus:ring-offset-2 focus:ring-offset-[#11121b] ${
              localSettings.enabled ? 'bg-[var(--lavender-web)]' : 'bg-gray-600'
            }`}
            role="switch"
            aria-checked={localSettings.enabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                localSettings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Email Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email Outreach Settings
          </h4>
          
          <div className="ml-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-2">
                Reminder Frequency
                <span className="text-neutral-500 ml-1">(How often to ask for follow-up)</span>
              </label>
              <select
                value={localSettings.emailReminderFrequency}
                onChange={(e) => handleSettingChange('emailReminderFrequency', Number(e.target.value))}
                disabled={!localSettings.enabled}
                className="w-full rounded-lg border border-white/10 bg-[#141522] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--lavender-web)] disabled:opacity-50"
              >
                <option value={3}>Every 3 days</option>
                <option value={7}>Every week (recommended)</option>
                <option value={14}>Every 2 weeks</option>
                <option value={30}>Every month</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-2">
                Ghosted Threshold
                <span className="text-neutral-500 ml-1">(When to ask if they ghosted you)</span>
              </label>
              <select
                value={localSettings.emailGhostedThreshold}
                onChange={(e) => handleSettingChange('emailGhostedThreshold', Number(e.target.value))}
                disabled={!localSettings.enabled}
                className="w-full rounded-lg border border-white/10 bg-[#141522] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--lavender-web)] disabled:opacity-50"
              >
                <option value={14}>After 2 weeks</option>
                <option value={21}>After 3 weeks</option>
                <option value={28}>After 1 month (recommended)</option>
                <option value={42}>After 6 weeks</option>
                <option value={60}>After 2 months</option>
              </select>
            </div>
          </div>
        </div>

        {/* LinkedIn Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v16H0zM8 8h4.8v2.2h.07c.67-1.2 2.3-2.46 4.74-2.46 5.07 0 6 3.34 6 7.68V24h-5V16.4c0-1.81-.03-4.14-2.52-4.14-2.52 0-2.91 1.97-2.91 4v7.74H8z"/>
            </svg>
            LinkedIn Outreach Settings
          </h4>
          
          <div className="ml-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-2">
                Reminder Frequency
                <span className="text-neutral-500 ml-1">(How often to ask for follow-up)</span>
              </label>
              <select
                value={localSettings.linkedinReminderFrequency}
                onChange={(e) => handleSettingChange('linkedinReminderFrequency', Number(e.target.value))}
                disabled={!localSettings.enabled}
                className="w-full rounded-lg border border-white/10 bg-[#141522] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--lavender-web)] disabled:opacity-50"
              >
                <option value={1}>Daily</option>
                <option value={3}>Every 3 days (recommended)</option>
                <option value={7}>Every week</option>
                <option value={14}>Every 2 weeks</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-2">
                Ghosted Threshold
                <span className="text-neutral-500 ml-1">(When to ask if they ghosted you)</span>
              </label>
              <select
                value={localSettings.linkedinGhostedThreshold}
                onChange={(e) => handleSettingChange('linkedinGhostedThreshold', Number(e.target.value))}
                disabled={!localSettings.enabled}
                className="w-full rounded-lg border border-white/10 bg-[#141522] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--lavender-web)] disabled:opacity-50"
              >
                <option value={7}>After 1 week</option>
                <option value={14}>After 2 weeks (recommended)</option>
                <option value={21}>After 3 weeks</option>
                <option value={30}>After 1 month</option>
              </select>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h5 className="text-sm font-medium text-blue-400 mb-1">How notifications work</h5>
              <ul className="text-xs text-blue-300 space-y-1">
                <li>• Notifications only appear for outreach that hasn't received a response (still in "Sent" stage)</li>
                <li>• Once you move an outreach to "Responded" or any other stage, notifications stop</li>
                <li>• Notifications check happens every time you log in to the app</li>
                <li>• LinkedIn typically gets faster responses, so we recommend shorter intervals</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Save/Reset Actions */}
      {hasChanges && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <p className="text-xs text-neutral-400">You have unsaved changes</p>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="focus-ring rounded-lg px-3 py-1.5 text-sm font-medium border border-white/20 text-neutral-300 hover:bg-white/5 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              className="focus-ring rounded-lg px-3 py-1.5 text-sm font-medium bg-[var(--lavender-web)] text-[#0f1018] hover:bg-[var(--lavender-web)]/90 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}