import {
  upsertInventoryItemToCloud,
  insertInventoryUsageToCloud,
  upsertLeadToCloud,
} from "../services/cloudInventoryService.js";

export function createLeadsController(ctx) {
  const {
    el,
    data,
    isUnlocked,
    toast,
    val,
    fileToMeta,
    leadsService,
    addAudit,
    queueCloudSync,
    renderAll,
    persist,
    maybeNotifyLowStock,
  } = ctx;

  async function useInventoryForRepair(leadID) {
    const lead = data.leads.find((l) => l.leadID === leadID);
    if (!lead || !lead.inventoryUsed.length) {
      return toast("No linked inventory on this lead.");
    }

    const changedItems = [];

    lead.inventoryUsed.forEach((itemID) => {
      const item = data.inventory.find((i) => i.itemID === itemID);
      if (!item) return;

      item.quantity = Math.max(0, Number(item.quantity || 0) - 1);
      item.lastUpdated = new Date().toISOString();

      item.usageEvents = item.usageEvents || [];
      item.usageEvents.push({ at: new Date().toISOString(), delta: 1, leadID });

      changedItems.push({ ...item });

      addAudit("inventory_used_for_repair", {
        itemID,
        leadID,
        delta: 1,
        userAction: "use_inventory_for_repair",
      });
    });

    lead.lastUpdated = new Date().toISOString();

    addAudit("lead_updated_after_inventory_use", {
      leadID,
      status: lead.status,
      userAction: "use_inventory_for_repair",
    });

    await persist();
    renderAll();
    maybeNotifyLowStock();

    for (const item of changedItems) {
      try {
        await upsertInventoryItemToCloud(item);
        await insertInventoryUsageToCloud({
          itemID: item.itemID,
          delta: 1,
          leadID,
          notes: "Inventory used for repair",
        });
      } catch (err) {
        console.error("Lead repair inventory cloud sync failed:", err);
      }
    }

    try {
      await upsertLeadToCloud(lead);
    } catch (err) {
      console.error("Lead repair lead sync failed:", err);
    }

    toast(`Inventory deducted for ${leadID}.`);
  }

async function addLead(e) {
  e.preventDefault();

  try {
    if (!isUnlocked()) {
      toast("Locked: log in to create a lead.", "error");
      return;
    }

    const customerName = val("customerName").trim();
    const contactNumber = val("contactNumber").trim();

    // Payment info
    const paymentMethod = val("paymentMethod");
    const paymentStatus = val("paymentStatus");

    function generateLeadID(name, phone) {
      const parts = String(name || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      const firstInitial = parts[0]?.[0]?.toUpperCase() || "*";
      const lastInitial = parts.length > 1 ? (parts[parts.length - 1]?.[0]?.toUpperCase() || "*") : "*";

      const digits = String(phone || "").replace(/\D/g, "");
      const last6 = digits.slice(-6) || "******";

      return `${firstInitial}${lastInitial}-${last6}`;
    }

    const baseLeadID = generateLeadID(customerName, contactNumber);

    let leadID = baseLeadID;
    let dupCount = 2;

    while ((data.leads || []).some((l) => l.leadID === leadID)) {
      leadID = `${baseLeadID}-${dupCount}`;
      dupCount += 1;
    }

const files = await Promise.all(
  Array.from(document.getElementById("leadFiles")?.files || []).map(fileToMeta)
);

// ✅ Capture selected inventory during lead creation
const selectedInventory = Array.from(el.leadInventoryUsed?.selectedOptions || [])
  .map((opt) => String(opt.value || "").trim())
  .filter(Boolean);

const inventoryUsedQty = {};
selectedInventory.forEach((itemID) => {
  inventoryUsedQty[itemID] = 1;
});

const lead = {
  leadID,
  customerName,
  contactNumber,
  email: val("customerEmail"),
  address: val("customerAddress"),
  device: val("deviceType"),
  series: val("leadSeries"),
  repairType: val("repairType"),
  status: val("leadStatus") || "In Progress",
  dateReported: val("dateReported"),
  repairCost: Number(val("repairCost") || 0),
  laborAmount: Number(val("laborOnly") || 0),
  notes: val("leadNotes"),
  inventoryUsed: selectedInventory,
  inventoryUsedQty,
  files,
  lastUpdated: new Date().toISOString(),
  paymentMethod,
  paymentStatus,
};

    leadsService.addLead(lead);

    addAudit("lead_added", {
      leadID,
      status: lead.status,
      userAction: "form_add",
    });

    queueCloudSync("lead_add", { leadID, status: lead.status });

    await persist();

try {
  await upsertLeadToCloud(lead);
} catch (err) {
  console.error("Lead cloud sync failed:", err);
  toast("Lead saved locally, but cloud sync failed.", "warning");
}

// ✅ Auto-deduct linked inventory right after lead creation
if (Array.isArray(lead.inventoryUsed) && lead.inventoryUsed.length) {
  await useInventoryForRepair(lead.leadID);
}

if (el.leadForm) el.leadForm.reset();

const statusEl = document.getElementById("leadStatus");
if (statusEl) statusEl.value = "In Progress";

if (el.statusFilter) el.statusFilter.value = "all";
if (el.deviceFilter) el.deviceFilter.value = "all";
if (el.leadSearch) el.leadSearch.value = "";

renderAll();
requestAnimationFrame(() => renderAll());

toast(`Repair lead ${lead.leadID} created.`, "success");
  } catch (err) {
    console.error("[ADD LEAD] FAILED:", err);
  }
}

  return { addLead, useInventoryForRepair };
}