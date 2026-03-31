import { createSessionService } from "../services/sessionService.js";
import { maybeAutoBackup as maybeAutoBackupService } from "../services/backupService.js";

export function createSessionFacade(ctx) {
  const {
    defaultData,
    appDataStore,
    encryptJSON,
    decryptJSON,
    storageKey,
    getData,
    getCryptoKey,
    toast,              // expects (el,msg,type) OR wrapper you provide
    setIntegrationLog,  // expects (text) => void
    getEl,              // () => el
  } = ctx;

  let sessionService = null;

  function getSessionService() {
    if (sessionService) return sessionService;

    sessionService = createSessionService({
      defaultData,
      appDataStore,
      encryptJSON,
      decryptJSON,
      toast: (msg, type) => toast(getEl(), msg, type),
      storageKey,
      maybeAutoBackup: () =>
        maybeAutoBackupService({
          getData,
          getCryptoKey,
          appDataStore,
          encryptJSON,
          setIntegrationLog,
        }),
    });

    return sessionService;
  }

  async function persist(data, cryptoKey) {
    if (!cryptoKey) return;
    return getSessionService().save(data, cryptoKey);
  }

  async function loadEncrypted(cryptoKey) {
    return await getSessionService().load(cryptoKey);
  }

  return { getSessionService, persist, loadEncrypted };
}