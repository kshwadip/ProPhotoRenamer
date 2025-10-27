import { writable } from 'svelte/store';

interface ConsentState {
  analyticsAllowed: boolean;
  hasAnswered: boolean;
}

const STORAGE_KEY = 'photorenamer_consent';

function getStoredConsent(): ConsentState {
  if (typeof window === 'undefined') {
    return { analyticsAllowed: false, hasAnswered: false };
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }

  return { analyticsAllowed: false, hasAnswered: false };
}

function createConsentStore() {
  const { subscribe, set, update } = writable<ConsentState>(getStoredConsent());

  return {
    subscribe,
    
    acceptAnalytics: () => {
      const newState = { analyticsAllowed: true, hasAnswered: true };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      }
      set(newState);
    },
    
    declineAnalytics: () => {
      const newState = { analyticsAllowed: false, hasAnswered: true };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      }
      set(newState);
    },
    
    toggleAnalytics: () => {
      update(state => {
        const newState = { 
          analyticsAllowed: !state.analyticsAllowed, 
          hasAnswered: true 
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        }
        return newState;
      });
    }
  };
}

export const consentStore = createConsentStore();
