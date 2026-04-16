import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export const useNotifications = (tasks: any[]) => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );
  const [notifiedTasks, setNotifiedTasks] = useState<Set<string>>(new Set());

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('This browser does not support desktop notifications');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success('Notifications enabled!');
      } else {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
    }
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker registered', reg))
        .catch((err) => console.error('Service Worker registration failed', err));
    }
  }, []);

  useEffect(() => {
    if (permission !== 'granted') return;

    const checkUpcomingTasks = () => {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      tasks.forEach((task) => {
        if (task.completed) return;

        // Check Due Date
        if (task.dueDate && !notifiedTasks.has(`${task.id}-due`)) {
          const dueDate = new Date(task.dueDate);
          if (dueDate > now && dueDate <= oneHourFromNow) {
            showNotification(task, 'Due Soon');
            setNotifiedTasks((prev) => new Set(prev).add(`${task.id}-due`));
          }
        }

        // Check Reminder
        if (task.reminderAt && !notifiedTasks.has(`${task.id}-reminder`)) {
          const reminderDate = new Date(task.reminderAt);
          // For reminders, we might want to be more precise or just check if it's "now"
          // Let's stick to the 1-hour window for consistency with the current logic
          if (reminderDate > now && reminderDate <= oneHourFromNow) {
            showNotification(task, 'Reminder');
            setNotifiedTasks((prev) => new Set(prev).add(`${task.id}-reminder`));
          }
        }
      });
    };

    const showNotification = async (task: any, type: string) => {
      const title = `${type}: ${task.title}`;
      const timeStr = type === 'Due Soon' ? task.dueDate : task.reminderAt;
      const options = {
        body: `${type} at ${new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        icon: '/favicon.ico',
      };

      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification(title, options);
        } else {
          new Notification(title, options);
        }
        toast.info(title, {
          description: options.body,
        });
      } catch (e) {
        toast.info(title, {
          description: options.body,
        });
      }
    };

    const interval = setInterval(checkUpcomingTasks, 60000); // Check every minute
    checkUpcomingTasks(); // Initial check

    return () => clearInterval(interval);
  }, [tasks, permission, notifiedTasks]);

  return { permission, requestPermission };
};
