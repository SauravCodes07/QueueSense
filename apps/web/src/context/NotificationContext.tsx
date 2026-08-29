import React, { createContext, useContext, useState } from 'react';
import { NotificationItem } from '../types';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (title: string, message: string, type?: 'info' | 'warning' | 'alert' | 'success') => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'init-1',
      title: 'Queue Connected',
      message: 'Live ETA tracking active. Real-time updates enabled.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'info',
      read: false,
    },
    {
      id: 'init-2',
      title: 'Schedule Notice',
      message: 'Cardiology (Room 301) running with slight schedule delay.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'alert',
      read: false,
    },
  ]);

  const addNotification = (title: string, message: string, type: 'info' | 'warning' | 'alert' | 'success' = 'info') => {
    const item: NotificationItem = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type,
      read: false,
    };
    setNotifications((prev) => [item, ...prev.slice(0, 24)]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        clearAll: clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
