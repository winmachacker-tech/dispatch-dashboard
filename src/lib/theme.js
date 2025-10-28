// src/lib/theme.js
export const STORAGE_KEY = 'theme';

export function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'system';
}

export function applyTheme(theme) {
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && systemDark);

  root.classList.toggle('dark', isDark);
}

export function setTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

export function initTheme() {
  applyTheme(getStoredTheme());
}

