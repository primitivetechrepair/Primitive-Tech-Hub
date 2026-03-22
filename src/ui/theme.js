export function initTheme({ el, appDataStore, themeKey }) {
  const theme = appDataStore.getTheme({ themeKey }) || 'dark';
  document.body.classList.toggle('light-theme', theme === 'light');
  if (el.themeToggleBtn) el.themeToggleBtn.textContent = theme === 'light' ? 'Dark Mode' : 'Light Mode';
}

export function toggleTheme({ el, appDataStore, themeKey }) {
  const next = document.body.classList.contains('light-theme') ? 'dark' : 'light';
  appDataStore.setTheme({ themeKey, theme: next });
  initTheme({ el, appDataStore, themeKey });
}