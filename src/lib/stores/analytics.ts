import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import { consentStore } from './consent';
import { get } from 'svelte/store';

interface AnalyticsEvent {
  event: string;
  timestamp: string;
  data?: Record<string, any>;
}

interface AnalyticsData {
  sessionId: string;
  sessionStart: string;
  totalVisits: number;
  totalPhotosProcessed: number;
  totalDownloads: number;
  mostUsedTemplates: Record<string, number>;
  events: AnalyticsEvent[];
}

const STORAGE_KEY = 'photorenamer_analytics';

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fp', 2, 2);
  }
  
  return btoa(JSON.stringify({
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform
  }));
}

async function sendToSupabase(event: string, data?: Record<string, any>) {
  const consent = get(consentStore);
  
  if (!consent.analyticsAllowed) return;
  
  try {
    await supabase.from('analytics_events').insert({
      session_id: generateSessionId(),
      event_type: event,
      event_data: data || {},
      user_fingerprint: generateFingerprint()
    });
  } catch (error) {
    console.error('Analytics error:', error);
  }
}

function getStoredAnalytics(): AnalyticsData {
  if (typeof window === 'undefined') {
    return createEmptyAnalytics();
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }

  return createEmptyAnalytics();
}

function createEmptyAnalytics(): AnalyticsData {
  return {
    sessionId: generateSessionId(),
    sessionStart: new Date().toISOString(),
    totalVisits: 1,
    totalPhotosProcessed: 0,
    totalDownloads: 0,
    mostUsedTemplates: {},
    events: []
  };
}

function createAnalyticsStore() {
  const { subscribe, set, update } = writable<AnalyticsData>(getStoredAnalytics());

  function saveToStorage(data: AnalyticsData) {
    if (typeof window !== 'undefined') {
      const trimmedEvents = data.events.slice(-100);
      const trimmedData = { ...data, events: trimmedEvents };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedData));
    }
  }

  return {
    subscribe,

    trackEvent: (event: string, data?: Record<string, any>) => {
      update((analytics) => {
        const newEvent: AnalyticsEvent = {
          event,
          timestamp: new Date().toISOString(),
          data
        };

        const updated = {
          ...analytics,
          events: [...analytics.events, newEvent]
        };

        saveToStorage(updated);
        return updated;
      });
      
      sendToSupabase(event, data);
    },

    trackPhotosUploaded: (count: number) => {
      update((analytics) => {
        const updated = {
          ...analytics,
          totalPhotosProcessed: analytics.totalPhotosProcessed + count
        };
        saveToStorage(updated);
        return updated;
      });
      
      sendToSupabase('photos_uploaded', { count });
    },

    trackTemplateUsed: (template: string) => {
      update((analytics) => {
        const updated = {
          ...analytics,
          mostUsedTemplates: {
            ...analytics.mostUsedTemplates,
            [template]: (analytics.mostUsedTemplates[template] || 0) + 1
          }
        };
        saveToStorage(updated);
        return updated;
      });
      
      sendToSupabase('template_used', { template });
    },

    trackDownload: (photoCount: number) => {
      update((analytics) => {
        const updated = {
          ...analytics,
          totalDownloads: analytics.totalDownloads + 1
        };
        saveToStorage(updated);
        return updated;
      });
      
      sendToSupabase('download_completed', { photo_count: photoCount });
    },

    getSessionDuration: (): number => {
      const data = getStoredAnalytics();
      const start = new Date(data.sessionStart).getTime();
      const now = Date.now();
      return Math.floor((now - start) / 1000);
    }
  };
}

export const analyticsStore = createAnalyticsStore();