export function createConnectivityController({
  el,
  getData,
  persist,
  toast,
  syncService,
}) {
  function syncPendingData() {
    const data = getData();
    if (!data.pendingCloudSync.length) return;

    const count = data.pendingCloudSync.length;
    data.pendingCloudSync = [];
    persist();
    toast(`Synced ${count} queued changes (simulated cloud sync).`);
  }

  function setupConnectivity() {
    const update = () => {
      el.networkStatus.textContent = navigator.onLine
        ? 'Online: local data ready, cloud sync hooks active.'
        : 'Offline mode: all actions saved locally.';

      if (navigator.onLine) syncPendingData();
    };

    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }

  function queueCloudSync(action, payload) {
    // default: do not persist here (callers usually persist after mutations)
    return syncService.enqueue(action, payload, { persistNow: false });
  }

  return {
    setupConnectivity,
    queueCloudSync,
    syncPendingData,
  };
}