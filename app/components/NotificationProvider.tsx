"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import { useNotifications } from '../hooks/useNotifications';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { clientDb } from '../../lib/firebase/client';
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
  const { isSignedIn, isLoaded, user } = useUser();
  const { unreadCount, loading } = useNotifications();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [hasShownModalThisSession, setHasShownModalThisSession] = useState(false);
  const [modalDismissalChecked, setModalDismissalChecked] = useState(false);

  // Check if user has dismissed this modal before
  const checkModalDismissal = async () => {
    if (!user?.id || modalDismissalChecked) return;

    try {
      const q = query(
        collection(clientDb, "modal_dismissals"),
        where("userId", "==", user.id),
        where("modalType", "==", "notification_welcome")
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.docs.length > 0) {
        setHasShownModalThisSession(true); // Prevent showing modal
      }
      
      setModalDismissalChecked(true);
    } catch (error) {
      console.error('Error checking modal dismissal:', error);
      setModalDismissalChecked(true);
    }
  };

  // Show modal when user logs in and has notifications
  useEffect(() => {
    if (
      isLoaded && 
      isSignedIn && 
      !loading && 
      unreadCount > 0 && 
      !hasShownModalThisSession &&
      modalDismissalChecked
    ) {
      setShowLoginModal(true);
      setHasShownModalThisSession(true);
    }
  }, [isLoaded, isSignedIn, loading, unreadCount, hasShownModalThisSession, modalDismissalChecked]);

  // Check modal dismissal when user signs in
  useEffect(() => {
    if (isLoaded && isSignedIn && user?.id) {
      checkModalDismissal();
    }
  }, [isLoaded, isSignedIn, user?.id]);

  // Reset session flag when user signs out
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setHasShownModalThisSession(false);
      setShowLoginModal(false);
      setModalDismissalChecked(false);
    }
  }, [isLoaded, isSignedIn]);

  const handleCloseModal = async () => {
    setShowLoginModal(false);
    
    // Mark modal as dismissed permanently for this user
    if (user?.id) {
      try {
        await addDoc(collection(clientDb, "modal_dismissals"), {
          userId: user.id,
          modalType: "notification_welcome",
          dismissedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error saving modal dismissal:', error);
      }
    }
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