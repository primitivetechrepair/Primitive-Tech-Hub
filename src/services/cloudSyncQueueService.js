// ./src/services/cloudSyncQueueService.js
import {
  upsertLeadToCloud,
  upsertInventoryItemToCloud,
  deleteInventoryItemFromCloud,
  insertInventoryUsageToCloud,
  upsertAuditEntryToCloud,
  deleteAuditEntryFromCloud,
} from "./cloudInventoryService.js";

export function createCloudSyncQueueService({
  getData,
  setData,
  persist,
  toast, // expects toast(el,msg,type) or wrapped toast(msg,type)
  el,
  syncService,
}) {
  function queueCloudSync(action, payload) {
    return syncService.enqueue(action, payload, { persistNow: false });
  }

  async function processQueueItem(action, payload) {
    const data = getData();

    switch (action) {
      case "lead_add":
      case "lead_update":
      case "lead_status_change": {
        const lead = (data.leads || []).find((l) => l.leadID === payload.leadID);
        if (!lead) return;
        await upsertLeadToCloud(lead);
        break;
      }

      case "inventory_add":
      case "inventory_update": {
        const item = (data.inventory || []).find((i) => i.itemID === payload.itemID);
        if (!item) return;
        await upsertInventoryItemToCloud(item);
        break;
      }

      case "inventory_delete": {
        if (!payload.itemID) return;
        await deleteInventoryItemFromCloud(payload.itemID);
        break;
      }

      case "inventory_use": {
        await insertInventoryUsageToCloud({
          itemID: payload.itemID,
          delta: payload.delta,
          leadID: payload.leadID || null,
          customerID: payload.customerID || null,
          notes: payload.notes || "Queued inventory usage sync",
        });

        const item = (data.inventory || []).find((i) => i.itemID === payload.itemID);
        if (item) {
          await upsertInventoryItemToCloud(item);
        }
        break;
      }

      case "audit_add": {
        const auditEntry = (data.auditLog || []).find(
          (entry) => String(entry.auditID || "") === String(payload.auditID || "")
        );
        if (!auditEntry) return;
        await upsertAuditEntryToCloud(auditEntry);
        break;
      }

      case "audit_delete": {
        if (!payload.auditID) return;
        await deleteAuditEntryFromCloud(payload.auditID);
        break;
      }

      default:
        break;
    }
  }

  async function syncPendingData() {
    const data = getData();
    const queue = Array.isArray(data.pendingCloudSync) ? [...data.pendingCloudSync] : [];
    if (!queue.length) return;

    const failed = [];
    let successCount = 0;

    for (const entry of queue) {
      try {
        await processQueueItem(entry.action, entry.payload || {});
        successCount += 1;
      } catch (err) {
        console.error("Queued cloud sync failed:", entry, err);
        failed.push(entry);
      }
    }

    data.pendingCloudSync = failed;
    setData(data);
    await persist();

    if (successCount > 0) {
      toast(el, `Synced ${successCount} queued change(s).`, "success");
    }

    if (failed.length > 0) {
      toast(el, `${failed.length} queued change(s) failed to sync.`, "warning");
    }
  }

  return { queueCloudSync, syncPendingData };
}