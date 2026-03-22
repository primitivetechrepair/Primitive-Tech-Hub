// src/services/sessionService.js

export function createSessionService({
  defaultData,
  appDataStore,
  encryptJSON,
  decryptJSON,
  toast,
  storageKey,
  maybeAutoBackup,
}) {
  async function load(cryptoKey) {
    if (!cryptoKey) return null;

    return await appDataStore.loadDecrypted({
      storageKey,
      cryptoKey,
      decryptJSON,
      toast,
      defaultData,
    });
  }

  async function save(data, cryptoKey) {
    if (!cryptoKey) return false;

    await appDataStore.saveEncrypted({
      storageKey,
      data,
      cryptoKey,
      encryptJSON,
    });

    maybeAutoBackup?.();
    return true;
  }

  return { load, save };
}