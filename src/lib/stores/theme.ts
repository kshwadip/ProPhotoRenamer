import { writable } from 'svelte/store';

const defaultTheme = 'light';

function createThemeStore() {
  const { subscribe, set, update } = writable(defaultTheme);

  return {
    subscribe,
    toggle: () => update(theme => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
      }
      return newTheme;
    }),
    init: () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = stored || (prefersDark ? 'dark' : 'light');
        
        document.documentElement.setAttribute('data-theme', theme);
        set(theme);
      }
    }
  };
}

export const themeStore = createThemeStore();