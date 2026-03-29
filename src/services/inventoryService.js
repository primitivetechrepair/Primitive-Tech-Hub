import { upsertInventoryItemToCloud } from "./cloudInventoryService.js";

export function createInventoryService({ getData, setData, persist, addAudit }) {
  return {
    list() {
      return getData().inventory || [];
    },

    addItem(input) {
      const data = getData();
      data.inventory = data.inventory || [];

      const item = {
        itemID: input.itemID,
        itemName: (input.itemName || "").trim(),
        brand: (input.brand || "").trim(),
        series: (input.series || "").trim(),
        category: (input.category || "Other").trim(),
        quantity: Number(input.quantity || 0),
        costPerItem: Number(input.costPerItem || 0),
        supplier: (input.supplier || "").trim(),
        color: (input.color || "").trim(),
        threshold: Number(input.threshold || data.settings.defaultThreshold),
        lastUpdated: input.lastUpdated || new Date().toISOString(),
        notes: (input.notes || "").trim(),
        usageEvents: Array.isArray(input.usageEvents) ? input.usageEvents : [],
      };

      data.inventory.unshift(item);

      setData(data);
      persist();

      return item;
    },

    upsertFromCsvRow(o) {
      const data = getData();
      data.inventory = data.inventory || [];

      const itemID = o.ItemID;
      if (!itemID) return;

      const existing = data.inventory.find((x) => x.itemID === itemID);

      if (existing) {
        existing.itemName = o.ItemName || existing.itemName;
        existing.category = o.Device || o.Category || existing.category;
        existing.series = o.Series || existing.series || "Standard";
        existing.quantity = Number(o.Quantity || existing.quantity);
        existing.costPerItem = Number(o.CostPerItem || existing.costPerItem);
        existing.supplier = o.Supplier || existing.supplier;
        existing.threshold = Number(
          o.Threshold || existing.threshold || data.settings.defaultThreshold
        );
        existing.notes = o.Notes || existing.notes;
        existing.lastUpdated = new Date().toISOString();

        addAudit?.("inventory_updated_csv", {
          itemID: existing.itemID,
          userAction: "csv_update",
        });
      } else {
        data.inventory.push({
          itemID,
          itemName: o.ItemName || "",
          category: o.Device || o.Category || "Other",
          series: o.Series || "Standard",
          quantity: Number(o.Quantity || 0),
          costPerItem: Number(o.CostPerItem || 0),
          supplier: o.Supplier || "",
          threshold: Number(o.Threshold || data.settings.defaultThreshold),
          lastUpdated: new Date().toISOString(),
          notes: o.Notes || "",
          usageEvents: [],
        });

        addAudit?.("inventory_added_csv", {
          itemID,
          userAction: "csv_add",
        });
      }

      setData(data);
      persist();
    },

    // ✅ FIXED HERE
    async updateItem(itemID, patch) {
      const data = getData();
      const item = (data.inventory || []).find((x) => x.itemID === itemID);
      if (!item) return null;

      Object.assign(item, patch);

      item.lastUpdated = new Date().toISOString();

      addAudit?.("inventory_updated", { itemID, userAction: "update" });

      setData(data);
      await persist(); // ✅ CRITICAL FIX

setTimeout(() => {
  upsertInventoryItemToCloud(item).catch((err) => {
    console.error("Cloud sync failed in updateItem:", err);
  });
}, 300);

      return item;
    },

    adjustQty(itemID, delta) {
      const data = getData();
      const item = (data.inventory || []).find((x) => x.itemID === itemID);
      if (!item) return null;

      item.quantity = Math.max(
        0,
        Number(item.quantity || 0) + Number(delta || 0)
      );
      item.lastUpdated = new Date().toISOString();

      addAudit?.("inventory_qty_adjusted", {
        itemID,
        userAction: "adjust_qty",
        delta,
      });

      setData(data);
      persist();

      upsertInventoryItemToCloud(item).catch((err) => {
        console.error("Cloud sync failed in adjustQty:", err);
      });

      return item;
    },

    quickUse(itemID, delta = 1) {
      const data = getData();
      const item = (data.inventory || []).find((i) => i.itemID === itemID);
      if (!item) return null;

      const d = Number(delta || 0);

      item.quantity = Math.max(0, Number(item.quantity || 0) - d);
      item.lastUpdated = new Date().toISOString();
      item.usageEvents = item.usageEvents || [];
      item.usageEvents.push({ at: new Date().toISOString(), delta: d });

      (data.leads || []).forEach((lead) => {
        if ((lead.inventoryUsed || []).includes(itemID)) {
          lead.lastUpdated = new Date().toISOString();
        }
      });

      setData(data);
      persist();
      return item;
    },

    removeItem(itemID) {
      const data = getData();

      data.inventory = (data.inventory || []).filter(
        (x) => x.itemID !== itemID
      );

      (data.leads || []).forEach((lead) => {
        lead.inventoryUsed = (lead.inventoryUsed || []).filter(
          (id) => id !== itemID
        );
      });

      setData(data);
      persist();

      return true;
    },
  };
}