export function isTauriApp(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).__TAURI_INTERNALS__;
}

export function shouldEnforceLimits(): boolean {
  return !isTauriApp();
}