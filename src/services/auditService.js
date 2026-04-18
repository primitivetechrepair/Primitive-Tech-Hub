// src/services/auditService.js

export function createAuditService({ getData, setData, persist, queueCloudSync }) {
  const MAX = 500;

  function createAuditID() {
    return `A-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function add(action, details = {}, opts = {}) {
    const { persistNow = false } = opts;

    const data = getData();
    data.auditLog = Array.isArray(data.auditLog) ? data.auditLog : [];

    const entry = {
      auditID: details.auditID || createAuditID(),
      at: new Date().toISOString(),
      action,
      ...details,
    };

    data.auditLog.unshift(entry);

    if (data.auditLog.length > MAX) {
      data.auditLog.length = MAX;
    }

    setData(data);

    if (typeof queueCloudSync === "function") {
      queueCloudSync("audit_add", { auditID: entry.auditID });
    }

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
    if (!Array.isArray(data.auditLog) || index < 0 || index >= data.auditLog.length) {
      return false;
    }

    const removed = data.auditLog[index];
    data.auditLog.splice(index, 1);
    setData(data);

    if (removed?.auditID && typeof queueCloudSync === "function") {
      queueCloudSync("audit_delete", { auditID: removed.auditID });
    }

    if (persistNow) persist();
    return true;
  }

  function removeByAuditID(auditID, opts = {}) {
    const { persistNow = false } = opts;

    const data = getData();
    if (!Array.isArray(data.auditLog) || !auditID) return false;

    const exists = data.auditLog.some(
      (entry) => String(entry.auditID || "") === String(auditID)
    );
    if (!exists) return false;

    data.auditLog = data.auditLog.filter(
      (entry) => String(entry.auditID || "") !== String(auditID)
    );

    setData(data);

    if (typeof queueCloudSync === "function") {
      queueCloudSync("audit_delete", { auditID });
    }

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

  return { add, list, removeAt, removeByAuditID, clear };
}
