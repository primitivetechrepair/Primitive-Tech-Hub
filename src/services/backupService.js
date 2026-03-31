export async function maybeAutoBackup({
  getData,
  getCryptoKey,
  appDataStore,
  encryptJSON,
  setIntegrationLog,
  toast, // optional, not required; keep signature flexible
  minIntervalMs = 24 * 60 * 60 * 1000,
} = {}) {
  const data = getData();
  const cryptoKey = getCryptoKey?.();

  if (!cryptoKey) return false;

  const now = Date.now();
  const last = Number(data.backups?.lastAutoBackup || 0);
  if (now - last < minIntervalMs) return false;

  data.backups = data.backups || {};
  data.backups.lastAutoBackup = now;

  await appDataStore.saveDailyBackup({
    data,
    cryptoKey,
    encryptJSON,
  });

  setIntegrationLog("Daily local auto-backup snapshot updated.");

  // keep optional (don’t change behavior by default)
  // if (toast) toast('Auto-backup saved.');

  return true;
}