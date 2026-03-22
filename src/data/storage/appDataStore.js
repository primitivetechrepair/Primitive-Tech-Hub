// src/data/storage/appDataStore.js

// Keep key strings EXACTLY the same as your current app.
// For now, import nothing—just pass keys in from app.js.

export const appDataStore = {
  // Mirrors your current loadEncrypted()
  async loadDecrypted({ storageKey, cryptoKey, decryptJSON, toast, defaultData }) {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    try {
      return await decryptJSON(JSON.parse(raw), cryptoKey);
    } catch {
      toast?.("Could not decrypt saved data.");
      return defaultData();
    }
  },

  // Mirrors the one line inside persist()
  async saveEncrypted({ storageKey, data, cryptoKey, encryptJSON }) {
    if (!cryptoKey) return;
    const encryptedObj = await encryptJSON(data, cryptoKey);
    localStorage.setItem(storageKey, JSON.stringify(encryptedObj));
  },

  // Mirrors your daily backup line (plaintext JSON snapshot)
  saveDailyBackup({ backupKey = "primitiveTechHubDailyBackup", data }) {
    localStorage.setItem(
      backupKey,
      JSON.stringify({ at: new Date().toISOString(), snapshot: data })
    );
  },

  // Mirrors your theme set
  setTheme({ themeKey, theme }) {
    localStorage.setItem(themeKey, theme);
  },

  getTheme({ themeKey }) {
    return localStorage.getItem(themeKey);
  },
};
