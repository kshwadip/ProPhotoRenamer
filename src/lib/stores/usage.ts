import { writable } from 'svelte/store';
import { shouldEnforceLimits } from '$lib/utils/environment';

interface UsageData {
  totalProcessed: number;
  dailyUsage: { [date: string]: number };
  browserFingerprint: string;
  createdAt: string;
}

const STORAGE_KEY = 'photorenamer_usage';
const MAX_FREE_PHOTOS = 1000;

function generateFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Browser fingerprint', 2, 2);
  }
  
  return btoa(JSON.stringify({
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    canvas: canvas.toDataURL(),
    userAgent: navigator.userAgent.slice(0, 50)
  }));
}

function getStoredUsage(): UsageData {
  if (typeof window === 'undefined') {
    return {
      totalProcessed: 0,
      dailyUsage: {},
      browserFingerprint: '',
      createdAt: new Date().toISOString()
    };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  
  return {
    totalProcessed: 0,
    dailyUsage: {},
    browserFingerprint: generateFingerprint(),
    createdAt: new Date().toISOString()
  };
}

function createUsageStore() {
  const { subscribe, set, update } = writable<UsageData>(getStoredUsage());
  
  return {
    subscribe,
    trackUsage: (photoCount: number) => {
      if (!shouldEnforceLimits()) return;
      
      update(data => {
        const today = new Date().toISOString().split('T')[0];
        const newData = {
          ...data,
          totalProcessed: data.totalProcessed + photoCount,
          dailyUsage: {
            ...data.dailyUsage,
            [today]: (data.dailyUsage[today] || 0) + photoCount
          }
        };
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
          sessionStorage.setItem(STORAGE_KEY + '_session', JSON.stringify(newData));
        }
        
        return newData;
      });
    },
    getRemainingFreeUses: (currentUsage: UsageData) => {
      if (!shouldEnforceLimits()) return Infinity;
      return Math.max(0, MAX_FREE_PHOTOS - currentUsage.totalProcessed);
    },
    isLimitReached: (currentUsage: UsageData) => {
      if (!shouldEnforceLimits()) return false;
      return currentUsage.totalProcessed >= MAX_FREE_PHOTOS;
    },
    getUsageStats: () => {
      const data = getStoredUsage();
      
      if (!shouldEnforceLimits()) {
        return {
          used: data.totalProcessed,
          remaining: Infinity,
          limit: Infinity,
          percentage: 0,
          isPro: true
        };
      }
      
      return {
        used: data.totalProcessed,
        remaining: Math.max(0, MAX_FREE_PHOTOS - data.totalProcessed),
        limit: MAX_FREE_PHOTOS,
        percentage: Math.min(100, (data.totalProcessed / MAX_FREE_PHOTOS) * 100),
        isPro: false
      };
    }
  };
}

export const usageStore = createUsageStore();
