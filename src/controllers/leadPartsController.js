import {
  upsertInventoryItemToCloud,
  insertInventoryUsageToCloud,
  upsertLeadToCloud,
} from "../services/cloudInventoryService.js";


export function createLeadPartsController(ctx) {
  const { el, getData, persist, toast } = ctx;

  function addSwipeQuickUse(row, itemID) {
    let startX = 0;

    row.addEventListener(
      "touchstart",
      (e) => {
        startX = e.changedTouches[0].clientX;
      },
      { passive: true }
    );

    row.addEventListener(
      "touchend",
      (e) => {
        const diff = e.changedTouches[0].clientX - startX;
        if (diff < -80) {
          ctx.quickUseItem?.(itemID, 1);
        }
      },
      { passive: true }
    );
  }

async function removePartFromLead(leadID, itemID) {
  const data = getData();
  const lead = (data.leads || []).find((l) => l.leadID === leadID);
  if (!lead) return toast(el, "Lead not found.", "error");

  if (!Array.isArray(lead.inventoryUsed)) lead.inventoryUsed = [];
  if (!lead.inventoryUsedQty || typeof lead.inventoryUsedQty !== "object") {
    lead.inventoryUsedQty = {};
  }

  const currentQty = Number(lead.inventoryUsedQty[itemID] || 0);
  if (currentQty <= 0) {
    return toast(el, "That part is not linked to this lead.", "warning");
  }

  const item = (data.inventory || []).find((i) => i.itemID === itemID);
  if (!item) {
    return toast(el, "Inventory item not found.", "error");
  }

  // reduce lead part qty
  if (currentQty === 1) {
    delete lead.inventoryUsedQty[itemID];
    lead.inventoryUsed = lead.inventoryUsed.filter((id) => id !== itemID);
  } else {
    lead.inventoryUsedQty[itemID] = currentQty - 1;
  }

  // restore inventory qty
  item.quantity = Math.max(0, Number(item.quantity || 0) + 1);
  item.lastUpdated = new Date().toISOString();
  item.usageEvents = item.usageEvents || [];
  item.usageEvents.push({
    at: new Date().toISOString(),
    delta: -1,
    leadID,
    note: "Part removed from lead",
  });

  lead.lastUpdated = new Date().toISOString();

  await persist();
  ctx.renderAll?.();

  try {
    await upsertInventoryItemToCloud(item);
    await insertInventoryUsageToCloud({
      itemID: item.itemID,
      delta: -1,
      leadID,
      notes: "Part removed from lead",
    });
    await upsertLeadToCloud(lead);
  } catch (err) {
    console.error("Lead part cloud sync failed:", err);
    toast(el, "Saved locally, but cloud sync failed.", "warning");
  }

  toast(el, "Part removed from lead and inventory restored.", "success");
}

async function addPartToLead(leadID) {
  const data = getData();
  const lead = (data.leads || []).find((l) => l.leadID === leadID);
  if (!lead) return toast(el, "Lead not found.", "error");

  if (
    !window.Modal ||
    typeof window.Modal.open !== "function" ||
    typeof window.Modal.parseList !== "function"
  ) {
    console.error(
      "Modal not available. Ensure modal.js is loaded BEFORE app.js and window.Modal exists."
    );
    return toast(el, "Modal not available (modal.js not loaded).", "error");
  }

  if (!Array.isArray(lead.inventoryUsed)) lead.inventoryUsed = [];
  if (!lead.inventoryUsedQty || typeof lead.inventoryUsedQty !== "object") {
    lead.inventoryUsedQty = {};
  }

  const raw = await Modal.open({
    title: `Add Part(s) to ${leadID}`,
    message:
      `Enter ItemID(s) or exact Item Name(s), separated by commas or new lines.\n\n` +
      `Examples:\nI-0001\nI-0001, I-0002\niPhone 7 Battery`,
    placeholder: "I-0001, I-0002\nor\niPhone 7 Battery",
    confirmText: "Add",
    requireInput: true,
    inputType: "text",
  });

  if (!raw) return;

  const tokens = window.Modal.parseList(raw);
  if (!tokens.length) return toast(el, "Nothing entered.", "error");

  const resolved = [];
  const invalid = [];

  tokens.forEach((t) => {
    const needle = String(t).trim().toLowerCase();
    if (!needle) return;

    const hit = (data.inventory || []).find((i) => {
      const id = String(i.itemID || "").toLowerCase();
      const name = String(i.itemName || "").toLowerCase();
      return id === needle || name === needle;
    });

    if (!hit) invalid.push(t);
    else resolved.push(hit.itemID);
  });

  if (!resolved.length) return toast(el, "No valid parts found.", "error");

  const outOfStock = [];
  const changedItems = [];

  resolved.forEach((itemID) => {
    const item = (data.inventory || []).find((i) => i.itemID === itemID);
    if (!item) return;

    const qty = Number(item.quantity || 0);
    if (qty <= 0) {
      outOfStock.push(item.itemName || itemID);
      return;
    }

    if (!lead.inventoryUsed.includes(itemID)) lead.inventoryUsed.push(itemID);
    lead.inventoryUsedQty[itemID] = (lead.inventoryUsedQty[itemID] || 0) + 1;

    item.quantity = qty - 1;
    item.lastUpdated = new Date().toISOString();
    item.usageEvents = item.usageEvents || [];
    item.usageEvents.push({ at: new Date().toISOString(), delta: 1, leadID });

    changedItems.push({ ...item });
  });

  lead.lastUpdated = new Date().toISOString();

  await persist();
  ctx.renderAll?.();

  try {
    for (const item of changedItems) {
      await upsertInventoryItemToCloud(item);
      await insertInventoryUsageToCloud({
        itemID: item.itemID,
        delta: 1,
        leadID,
        notes: "Part added to lead",
      });
    }

    await upsertLeadToCloud(lead);
  } catch (err) {
    console.error("Lead part cloud sync failed:", err);
    toast(el, "Saved locally, but cloud sync failed.", "warning");
  }

  const msgParts = resolved.length ? `Added ${resolved.length} part(s).` : "No parts added.";
  const msgInvalid = invalid.length ? ` Invalid: ${invalid.join(", ")}` : "";
  const msgOOS = outOfStock.length ? ` Out of stock: ${outOfStock.join(", ")}` : "";

  toast(
    el,
    msgParts + msgInvalid + msgOOS,
    invalid.length || outOfStock.length ? "warning" : "success"
  );
}

  return { addPartToLead, removePartFromLead, addSwipeQuickUse };
}