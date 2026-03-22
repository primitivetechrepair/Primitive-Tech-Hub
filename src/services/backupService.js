export function maybeAutoBackup({
  getData,
  appDataStore,
  setIntegrationLog,
  toast, // optional, not required; keep signature flexible
  minIntervalMs = 24 * 60 * 60 * 1000,
} = {}) {
  const data = getData();

  const now = Date.now();
  const last = Number(data.backups?.lastAutoBackup || 0);
  if (now - last < minIntervalMs) return;

  data.backups = data.backups || {};
  data.backups.lastAutoBackup = now;

  appDataStore.saveDailyBackup({ data });
  setIntegrationLog('Daily local auto-backup snapshot updated.');

  // keep optional (don’t change behavior by default)
  // if (toast) toast('Auto-backup saved.');
}