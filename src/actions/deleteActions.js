import {
  deleteLeadFromCloud,
  deleteInventoryItemFromCloud,
  upsertInventoryItemToCloud,
} from "../services/cloudInventoryService.js";

export function createDeleteActions({
  el,
  isUnlocked,
  toast, // expects toast(el,msg,type)
  showModal, // showModal(el, opts)
  inventoryService,
  getData,
  setData,
  persist,
  renderAll,
  addAudit,
  cloudSyncQueueService, // { queueCloudSync }
}) {
  let lastDeletedLead = null;
  let lastDeletedLeadTimer = null;

  async function deleteInventoryItem(itemID) {
    if (!isUnlocked()) {
      toast(el, "Locked: log in to delete inventory.", "error");
      return;
    }

    const ok = await showModal(el, {
      title: "Delete item",
      message: `Delete ${itemID}? This cannot be undone.`,
      confirmText: "Delete",
    });

    if (!ok) return;

    inventoryService.removeItem(itemID);

    addAudit("inventory_deleted", { itemID, userAction: "row_delete" });
    cloudSyncQueueService.queueCloudSync("inventory_delete", { itemID });

    await persist();

    try {
      await deleteInventoryItemFromCloud(itemID);
    } catch (err) {
      console.error("[DEBUG deleteInventoryItem] cloud delete failed:", itemID, err);
      toast(el, "Inventory deleted locally, but cloud delete failed.", "warning");
    }

    renderAll();
    toast(el, "Inventory item deleted.", "warning");
  }

  async function deleteLead(leadID) {
    if (!isUnlocked()) {
      toast(el, "Locked: log in to delete lead.", "error");
      return;
    }

    const data = getData();
    data.leads = Array.isArray(data.leads) ? data.leads : [];
    data.deletedLeads = Array.isArray(data.deletedLeads) ? data.deletedLeads : [];
    data.inventory = Array.isArray(data.inventory) ? data.inventory : [];

    const idx = data.leads.findIndex((l) => l.leadID === leadID);
    if (idx === -1) {
      toast(el, "Lead not found.", "error");
      return;
    }

    const lead = data.leads[idx];

    const ok = await showModal(el, {
      title: "Delete lead",
      message: `Move lead ${leadID} to deleted archive? Inventory linked to this lead will be restored.`,
      confirmText: "Delete",
    });

    if (!ok) return;

    const deletedAt = new Date().toISOString();

    // Restore inventory back into stock on delete
    const changedItems = [];
    const qtyMap =
      lead.inventoryUsedQty && typeof lead.inventoryUsedQty === "object"
        ? lead.inventoryUsedQty
        : null;

    if (qtyMap) {
      for (const [itemID, qty] of Object.entries(qtyMap)) {
        const n = Math.max(0, Number(qty || 0));
        if (!n) continue;

        const item = data.inventory.find((i) => i.itemID === itemID);
        if (!item) continue;

        item.quantity = Math.max(0, Number(item.quantity || 0) + n);
        item.lastUpdated = new Date().toISOString();
        changedItems.push({ ...item });
      }
    } else if (Array.isArray(lead.inventoryUsed)) {
      for (const itemID of lead.inventoryUsed) {
        const item = data.inventory.find((i) => i.itemID === itemID);
        if (!item) continue;

        item.quantity = Math.max(0, Number(item.quantity || 0) + 1);
        item.lastUpdated = new Date().toISOString();
        changedItems.push({ ...item });
      }
    }

    const archivedLead = {
      ...lead,
      deletedAt,
      inventoryRestoredOnDelete: true,
    };

    data.deletedLeads.unshift(archivedLead);
    data.leads.splice(idx, 1);

    setData(data);

    addAudit("lead_deleted", {
      leadID,
      userAction: "soft_delete_lead",
      inventoryRestored: true,
    });

    cloudSyncQueueService.queueCloudSync("lead_soft_delete", {
      leadID,
      deletedAt,
      inventoryRestoredOnDelete: true,
    });

    await persist();

    for (const item of changedItems) {
      try {
        await upsertInventoryItemToCloud(item);
      } catch (err) {
        console.error("[DEBUG deleteLead] inventory restore cloud sync failed:", item.itemID, err);
        toast(el, "Lead deleted locally, but inventory restore cloud sync failed.", "warning");
      }
    }

    console.log("[DEBUG deleteLead] attempting cloud delete for:", leadID);

    try {
      const result = await deleteLeadFromCloud(leadID);
      console.log("[DEBUG deleteLead] cloud delete success:", leadID, result);
    } catch (err) {
      console.error("[DEBUG deleteLead] cloud delete failed:", leadID, err);
      toast(el, "Lead deleted locally, but cloud delete failed.", "warning");
    }

    renderAll();

    // Save last deleted lead for undo
    lastDeletedLead = {
      leadID,
      deletedAt,
    };

    if (lastDeletedLeadTimer) {
      clearTimeout(lastDeletedLeadTimer);
    }

    lastDeletedLeadTimer = setTimeout(() => {
      lastDeletedLead = null;
      lastDeletedLeadTimer = null;
    }, 10000);

    toast(el, `Lead ${leadID} moved to deleted archive. Undo available for 10 seconds.`, "warning");
  }

  async function undoDeleteLead() {
    if (!isUnlocked()) {
      toast(el, "Locked: log in to undo delete.", "error");
      return;
    }

    if (!lastDeletedLead || !lastDeletedLead.leadID) {
      toast(el, "No recent deleted lead to undo.", "warning");
      return;
    }

    const { leadID } = lastDeletedLead;

    await restoreLead(leadID, { skipConfirm: true, fromUndo: true });

    lastDeletedLead = null;
    if (lastDeletedLeadTimer) {
      clearTimeout(lastDeletedLeadTimer);
      lastDeletedLeadTimer = null;
    }
  }

  async function restoreLead(leadID, options = {}) {
    const { skipConfirm = false, fromUndo = false } = options;

    if (!isUnlocked()) {
      toast(el, "Locked: log in to restore lead.", "error");
      return;
    }

    const data = getData();
    data.deletedLeads = Array.isArray(data.deletedLeads) ? data.deletedLeads : [];
    data.leads = Array.isArray(data.leads) ? data.leads : [];
    data.inventory = Array.isArray(data.inventory) ? data.inventory : [];

    const idx = data.deletedLeads.findIndex((l) => l.leadID === leadID);
    if (idx === -1) {
      toast(el, "Deleted lead not found.", "error");
      return;
    }

    const deletedLead = data.deletedLeads[idx];

    if (!skipConfirm) {
      const ok = await showModal(el, {
        title: "Restore lead",
        message: `Restore lead ${leadID} back into active repair leads? Linked inventory will be re-applied.`,
        confirmText: "Restore",
      });

      if (!ok) return;
    }

    // Re-deduct inventory if it was restored during delete
    const changedItems = [];

    if (deletedLead.inventoryRestoredOnDelete) {
      const qtyMap =
        deletedLead.inventoryUsedQty && typeof deletedLead.inventoryUsedQty === "object"
          ? deletedLead.inventoryUsedQty
          : null;

      if (qtyMap) {
        for (const [itemID, qty] of Object.entries(qtyMap)) {
          const n = Math.max(0, Number(qty || 0));
          if (!n) continue;

          const item = data.inventory.find((i) => i.itemID === itemID);
          if (!item) continue;

          item.quantity = Math.max(0, Number(item.quantity || 0) - n);
          item.lastUpdated = new Date().toISOString();
          changedItems.push({ ...item });
        }
      } else if (Array.isArray(deletedLead.inventoryUsed)) {
        for (const itemID of deletedLead.inventoryUsed) {
          const item = data.inventory.find((i) => i.itemID === itemID);
          if (!item) continue;

          item.quantity = Math.max(0, Number(item.quantity || 0) - 1);
          item.lastUpdated = new Date().toISOString();
          changedItems.push({ ...item });
        }
      }
    }

    const { deletedAt, inventoryRestoredOnDelete, ...restoredLead } = deletedLead;

    data.leads.unshift({
      ...restoredLead,
      lastUpdated: new Date().toISOString(),
      justRestored: true,
    });

    data.deletedLeads.splice(idx, 1);

    setData(data);

    addAudit("lead_restored", {
      leadID,
      userAction: fromUndo ? "undo_deleted_lead" : "restore_deleted_lead",
      inventoryReApplied: !!inventoryRestoredOnDelete,
    });

    cloudSyncQueueService.queueCloudSync("lead_restore", {
      leadID,
      restoredAt: new Date().toISOString(),
      inventoryReApplied: !!inventoryRestoredOnDelete,
      restoredByUndo: !!fromUndo,
    });

    await persist();

    for (const item of changedItems) {
      try {
        await upsertInventoryItemToCloud(item);
      } catch (err) {
        console.error("[DEBUG restoreLead] inventory re-apply cloud sync failed:", item.itemID, err);
        toast(el, "Lead restored locally, but inventory cloud sync failed.", "warning");
      }
    }

    renderAll();

    toast(
      el,
      fromUndo
        ? `Lead ${leadID} deletion undone successfully.`
        : `Lead ${leadID} restored successfully.`,
      "success"
    );
  }

  return {
    deleteInventoryItem,
    deleteLead,
    restoreLead,
    undoDeleteLead,
  };
}