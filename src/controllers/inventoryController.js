import {
  upsertInventoryItemToCloud,
  insertInventoryUsageToCloud,
} from "../services/cloudInventoryService.js";

export function createInventoryController(ctx) {
  const {
    el,
    getData,
    setData,
    isUnlocked,
    toast,
    nextInventoryId,
    safeVal,
    addAudit,
    queueCloudSync,
    persist,
    renderAll,
    maybeNotifyLowStock,
    inventoryService,
  } = ctx;

  async function quickUseItem(itemID, delta = 1) {
    if (!isUnlocked()) {
      toast("Locked: log in to use inventory.", "error");
      return;
    }

    const updatedItem = inventoryService.quickUse(itemID, delta);
    if (!updatedItem) return;

    const data = getData();
    const localItem = (data.inventory || []).find((i) => i.itemID === itemID);
    if (localItem) {
      localItem.quantity = updatedItem.quantity;
      localItem.lastUpdated = updatedItem.lastUpdated;
      localItem.usageEvents = updatedItem.usageEvents || localItem.usageEvents || [];
    }

    addAudit("inventory_used", { itemID, delta, userAction: "quick_use" });
    queueCloudSync("inventory_use", { itemID, delta });

    renderAll();
    maybeNotifyLowStock();

    try {
      await upsertInventoryItemToCloud(updatedItem);
      await insertInventoryUsageToCloud({
        itemID,
        delta,
        notes: "Quick use from Primitive Tech Hub",
      });
    } catch (err) {
      console.error("Cloud inventory quantity/usage update failed:", err);
      toast("Quantity updated locally, but cloud sync failed.", "warning");
    }
  }

  async function addInventory(e) {
    e.preventDefault();

    if (!isUnlocked()) {
      toast("Locked: log in to add inventory.", "error");
      return;
    }

    const data = getData();
    data.inventory = Array.isArray(data.inventory) ? data.inventory : [];

    const itemID = nextInventoryId();

    const item = {
      itemID,
      itemName: safeVal("itemName"),
      category: safeVal("itemDevice"),
      brand: safeVal("itemBrand"),
      series: safeVal("itemSeries"),
      quantity: Number(safeVal("itemQuantity") || 0),
      costPerItem: Number(safeVal("itemCost") || 0),
      supplier: safeVal("itemSupplier"),
      color: safeVal("itemColor"),
      threshold: Number(
        safeVal("itemThreshold") || data?.settings?.defaultThreshold || 5
      ),
      lastUpdated: new Date().toISOString(),
      notes: safeVal("itemNotes"),
      usageEvents: [],
    };

    if (!item.itemName) return toast("Item Name is required.", "error");
    if (!item.category) return toast("Device Type is required.", "error");

    data.inventory.unshift(item);
    setData(data);

    addAudit("inventory_added", {
      itemID,
      qty: item.quantity,
      userAction: "form_add",
    });

    queueCloudSync("inventory_add", { itemID, qty: item.quantity });

    await persist();

    try {
      await upsertInventoryItemToCloud(item);
    } catch (err) {
      console.error("Cloud inventory save failed:", err);
      toast("Saved locally, but cloud sync failed.", "warning");
    }

    el.inventoryForm.reset();

    const idBox = document.getElementById("itemID");
    if (idBox) idBox.value = nextInventoryId();

    renderAll();
    maybeNotifyLowStock();
    toast(`Inventory item ${item.itemName} added.`, "success");
  }

  return { addInventory, quickUseItem };
}