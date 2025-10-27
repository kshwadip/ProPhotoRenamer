import { writable } from 'svelte/store';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

function createNotificationStore() {
  const { subscribe, update } = writable<Notification[]>([]);

  return {
    subscribe,
    show: (type: NotificationType, message: string, duration = 4000) => {
      const id = Math.random().toString(36).substr(2, 9);
      const notification: Notification = { id, type, message, duration };

      update(notifications => [...notifications, notification]);

      if (duration > 0) {
        setTimeout(() => {
          update(notifications => notifications.filter(n => n.id !== id));
        }, duration);
      }
    },
    dismiss: (id: string) => {
      update(notifications => notifications.filter(n => n.id !== id));
    },
    success: (message: string, duration?: number) => {
      createNotificationStore().show('success', message, duration);
    },
    error: (message: string, duration?: number) => {
      createNotificationStore().show('error', message, duration);
    },
    warning: (message: string, duration?: number) => {
      createNotificationStore().show('warning', message, duration);
    },
    info: (message: string, duration?: number) => {
      createNotificationStore().show('info', message, duration);
    }
  };
}

export const notifications = createNotificationStore();