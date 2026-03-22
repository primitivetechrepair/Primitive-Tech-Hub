// src/services/auditService.js

export function createAuditService({ getData, setData, persist }) {
  const MAX = 500; // keep last 500 entries (adjust)

  function add(action, details = {}, opts = {}) {
    const { persistNow = false } = opts;

    const data = getData();
    data.auditLog = data.auditLog || [];

    const entry = {
      at: new Date().toISOString(),
      action,
      ...details,
    };

    // newest first
    data.auditLog.unshift(entry);

    // cap size
    if (data.auditLog.length > MAX) data.auditLog.length = MAX;

    setData(data);
    if (persistNow) persist();

    return entry;
  }

  function list(limit = 50) {
    const data = getData();
    return (data.auditLog || []).slice(0, limit);
  }

  function removeAt(index, opts = {}) {
    const { persistNow = false } = opts;

    const data = getData();
    if (!data.auditLog || index < 0 || index >= data.auditLog.length) return false;

    data.auditLog.splice(index, 1);
    setData(data);
    if (persistNow) persist();
    return true;
  }

  function clear(opts = {}) {
    const { persistNow = false } = opts;

    const data = getData();
    data.auditLog = [];
    setData(data);
    if (persistNow) persist();
    return true;
  }

  return { add, list, removeAt, clear };
}
