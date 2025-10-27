import { writable, derived, get } from 'svelte/store';
import type { TemplatePreset, TemplateCategory } from '../types/template';
import { validateTemplate } from '../utils/rename';

const STORAGE_KEY = 'photorenamer.userTemplates';
const FAVORITES_KEY = 'photorenamer.favoriteTemplates';

function safeLocalStorage(action: () => void) {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') action();
  } catch {}
}

const BUILTIN_PRESETS: TemplatePreset[] = [
  {
    id: 'builtin-dc',
    name: 'Date + Counter',
    template: '{YYYY}{MM}{DD}_{counter}',
    description: 'Date plus sequence number',
    category: 'date-time',
    isBuiltIn: true,
    isFavorite: false,
    tokensUsed: ['YYYY', 'MM', 'DD', 'counter'],
  },
  {
    id: 'builtin-dto',
    name: 'DateTime + Original',
    template: '{datetime}_{original}',
    description: 'Timestamp before original filename',
    category: 'date-time',
    isBuiltIn: true,
    isFavorite: false,
    tokensUsed: ['datetime', 'original'],
  },
];

function loadUserTemplates(): TemplatePreset[] {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function persistUserTemplates(templates: TemplatePreset[]) {
  safeLocalStorage(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  });
}

function loadFavorites(): string[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const fav = localStorage.getItem(FAVORITES_KEY);
    if (!fav) return [];
    return JSON.parse(fav);
  } catch {
    return [];
  }
}

function persistFavorites(fav: string[]) {
  safeLocalStorage(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(fav));
  });
}

export interface TemplatesStoreState {
  presets: TemplatePreset[];
  favorites: string[];
  activePreset: string | null;
}

const createTemplatesStore = () => {
  const initialUserPresets = loadUserTemplates();
  const initialFavorites = loadFavorites();

  const { subscribe, update, set } = writable<TemplatesStoreState>({
    presets: [...BUILTIN_PRESETS, ...initialUserPresets],
    favorites: initialFavorites,
    activePreset: null,
  });

  function syncToStorage(state: TemplatesStoreState) {
    persistUserTemplates(state.presets.filter(p => !p.isBuiltIn));
    persistFavorites(state.favorites);
  }

  return {
    subscribe,

    addPreset(preset: Omit<TemplatePreset, 'id' | 'isBuiltIn'>) {
      update(state => {
        const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const newPreset: TemplatePreset = { ...preset, id, isBuiltIn: false };
        const next = {
          ...state,
          presets: [...state.presets, newPreset],
        };
        syncToStorage(next);
        return next;
      });
    },

    removePreset(id: string) {
      update(state => {
        const presets = state.presets.filter(p => p.id !== id || p.isBuiltIn);
        const favorites = state.favorites.filter(favId => favId !== id);
        const next = { ...state, presets, favorites };
        syncToStorage(next);
        return next;
      });
    },

    setActive(id: string | null) {
      update(state => ({ ...state, activePreset: id }));
    },

    toggleFavorite(id: string) {
      update(state => {
        const isFav = state.favorites.includes(id);
        const favorites = isFav
          ? state.favorites.filter(fid => fid !== id)
          : [...state.favorites, id];
        const next = { ...state, favorites };
        syncToStorage(next);
        return next;
      });
    },

    setUserPresets(userPresets: TemplatePreset[]) {
      update(state => {
        const all = [...BUILTIN_PRESETS, ...userPresets];
        const next = { ...state, presets: all };
        syncToStorage(next);
        return next;
      });
    },

    validate(template: string) {
      return validateTemplate(template);
    },

    reset() {
      const next = {
        presets: [...BUILTIN_PRESETS],
        favorites: [],
        activePreset: null,
      };
      syncToStorage(next);
      set(next);
    }
  };
};

export const templatesStore = createTemplatesStore();

export const userTemplates = derived(
  templatesStore,
  $templatesStore => $templatesStore.presets.filter(p => !p.isBuiltIn),
);

export const builtinTemplates = derived(
  templatesStore,
  $templatesStore => $templatesStore.presets.filter(p => p.isBuiltIn),
);

export const activeTemplate = derived(
  templatesStore,
  $templatesStore =>
    $templatesStore.activePreset
      ? $templatesStore.presets.find(p => p.id === $templatesStore.activePreset) || null
      : null,
);

export const favoriteTemplates = derived(
  templatesStore,
  $templatesStore =>
    $templatesStore.presets.filter(p => $templatesStore.favorites.includes(p.id)),
);

export const templatesByCategory = derived(
  templatesStore,
  $templatesStore => {
    const map = new Map<TemplateCategory, TemplatePreset[]>();
    $templatesStore.presets.forEach(preset => {
      if (!preset.category) return;
      if (!map.has(preset.category)) map.set(preset.category, []);
      map.get(preset.category)!.push(preset);
    });
    return map;
  }
);
