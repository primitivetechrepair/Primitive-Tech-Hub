export function registerServiceWorker({ swPath = './sw.js' } = {}) {
  // Disable service worker in development
  const isLocal =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1';

  if (!('serviceWorker' in navigator) || isLocal) {
    return;
  }

  navigator.serviceWorker.register(swPath).catch(() => {});
}