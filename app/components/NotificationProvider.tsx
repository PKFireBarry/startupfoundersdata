"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { useNotifications } from '../hooks/useNotifications';
import NewNotificationsModal from './NewNotificationsModal';

interface NotificationContextType {
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: ReactNode;
}

export default function NotificationProvider({ children }: NotificationProviderProps) {
  const { isSignedIn, isLoaded } = useUser();
  const { unreadCount, loading } = useNotifications();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hasShownModalThisSession, setHasShownModalThisSession] = useState(false);

  // Show modal when user logs in and has notifications
  useEffect(() => {
    if (
      isLoaded && 
      isSignedIn && 
      !loading && 
      unreadCount > 0 && 
      !hasShownModalThisSession
    ) {
      setShowLoginModal(true);
      setHasShownModalThisSession(true);
    }
  }, [isLoaded, isSignedIn, loading, unreadCount, hasShownModalThisSession]);

  // Reset session flag when user signs out
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setHasShownModalThisSession(false);
      setShowLoginModal(false);
    }
  }, [isLoaded, isSignedIn]);

  const handleCloseModal = () => {
    setShowLoginModal(false);
  };

  return (
    <NotificationContext.Provider value={{ showLoginModal, setShowLoginModal }}>
      {children}
      <NewNotificationsModal 
        isOpen={showLoginModal} 
        onClose={handleCloseModal} 
      />
    </NotificationContext.Provider>
  );
}