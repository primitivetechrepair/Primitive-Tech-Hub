// src/services/syncService.js

export function createSyncService({ getData, setData, persist }) {
  const MAX = 500;

  function enqueue(action, payload = {}, opts = {}) {
    const { persistNow = false } = opts;

    const data = getData();
    data.pendingCloudSync = data.pendingCloudSync || [];

    data.pendingCloudSync.push({
      at: new Date().toISOString(),
      action,
      payload,
    });

    // cap size
    if (data.pendingCloudSync.length > MAX) {
      data.pendingCloudSync = data.pendingCloudSync.slice(-MAX);
    }

    setData(data);
    if (persistNow) persist();
    return true;
  }

  function list() {
    return (getData().pendingCloudSync || []).slice();
  }

  function clear(opts = {}) {
    const { persistNow = false } = opts;

    const data = getData();
    data.pendingCloudSync = [];
    setData(data);
    if (persistNow) persist();
    return true;
  }

  return { enqueue, list, clear };
}
