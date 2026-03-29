import { supabase } from "./supabaseClient.js";

const INVENTORY_SYNC_QUEUE_KEY = "primitiveTechHubInventorySyncQueue";

function readInventorySyncQueue() {
  try {
    const raw = localStorage.getItem(INVENTORY_SYNC_QUEUE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeInventorySyncQueue(queue) {
  try {
    localStorage.setItem(
      INVENTORY_SYNC_QUEUE_KEY,
      JSON.stringify(Array.isArray(queue) ? queue : [])
    );
  } catch (err) {
    console.error("writeInventorySyncQueue error:", err);
  }
}

export function enqueueInventorySync(item) {
  try {
    if (!item?.itemID) return;

    const queue = readInventorySyncQueue();

    const next = {
      itemID: item.itemID,
      itemName: item.itemName || "",
      brand: item.brand || "",
      series: item.series || "",
      category: item.category || "",
      partType: item.partType || "",
      color: item.color || "",
      supplier: item.supplier || "",
      costPerItem: Number(item.costPerItem || 0),
      quantity: Number(item.quantity || 0),
      threshold: Number(item.threshold || 0),
      location: item.location || "",
      notes: item.notes || "",
      lastUpdated: item.lastUpdated || new Date().toISOString(),
    };

    const existingIndex = queue.findIndex((x) => x.itemID === next.itemID);

    if (existingIndex >= 0) {
      queue[existingIndex] = next;
    } else {
      queue.push(next);
    }

    writeInventorySyncQueue(queue);
  } catch (err) {
    console.error("enqueueInventorySync error:", err);
  }
}

export function getInventorySyncQueue() {
  return readInventorySyncQueue();
}

export function clearInventorySyncQueueItem(itemID) {
  try {
    const queue = readInventorySyncQueue().filter((x) => x.itemID !== itemID);
    writeInventorySyncQueue(queue);
  } catch (err) {
    console.error("clearInventorySyncQueueItem error:", err);
  }
}

export async function flushInventorySyncQueue() {
  const queue = getInventorySyncQueue();

  if (!queue.length) return;

  for (const item of queue) {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from("inventory_items")
        .select("updated_at")
        .eq("item_id", item.itemID)
        .maybeSingle();

      if (fetchError) {
        console.error("flushInventorySyncQueue fetch error:", fetchError);
        continue;
      }

      const localTime = new Date(item.lastUpdated || 0).getTime();
      const cloudTime = new Date(existing?.updated_at || 0).getTime();

      if (cloudTime > localTime) {
        console.warn("[QUEUE SKIP] Cloud is newer than queued item:", item.itemID);
        clearInventorySyncQueueItem(item.itemID);
        continue;
      }

      const payload = {
        item_id: item.itemID,
        item_name: item.itemName || "",
        brand: item.brand || "",
        series: item.series || "",
        category: item.category || "",
        part_type: item.partType || "",
        color: item.color || "",
        supplier: item.supplier || "",
        cost_per_item: Number(item.costPerItem || 0),
        quantity_on_hand: Number(item.quantity || 0),
        threshold: Number(item.threshold || 0),
        location: item.location || "",
        notes: item.notes || "",
        updated_at: item.lastUpdated || new Date().toISOString(),
      };

      const { error } = await supabase
        .from("inventory_items")
        .upsert(payload, { onConflict: "item_id" });

      if (error) {
        console.error("flushInventorySyncQueue upsert error:", error);
        continue;
      }

      clearInventorySyncQueueItem(item.itemID);
    } catch (err) {
      console.error("flushInventorySyncQueue error:", err);
    }
  }
}

export async function fetchInventoryFromCloud() {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchInventoryFromCloud error:", error);
    throw error;
  }

  return (data || []).map((row) => ({
    itemID: row.item_id,
    itemName: row.item_name,
    brand: row.brand || "",
    series: row.series || "",
    category: row.category || "",
    partType: row.part_type || "",
    color: row.color || "",
    supplier: row.supplier || "",
    costPerItem: Number(row.cost_per_item || 0),
    quantity: Number(row.quantity_on_hand || 0),
    threshold: Number(row.threshold || 0),
    location: row.location || "",
    notes: row.notes || "",
    createdAt: row.created_at || null,
    lastUpdated: row.updated_at || null,
    deletedAt: row.deleted_at || null,
  }));
}

export async function upsertInventoryItemToCloud(item) {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from("inventory_items")
      .select("updated_at")
      .eq("item_id", item.itemID)
      .maybeSingle();

    if (fetchError) {
      console.error("fetch before upsert failed:", fetchError);
    }

    const localTime = new Date(item.lastUpdated || 0).getTime();
    const cloudTime = new Date(existing?.updated_at || 0).getTime();

    if (cloudTime > localTime) {
      console.warn("[SYNC BLOCKED] Cloud is newer than local:", item.itemID);
      return null;
    }

    const payload = {
      item_id: item.itemID,
      item_name: item.itemName || "",
      brand: item.brand || "",
      series: item.series || "",
      category: item.category || "",
      part_type: item.partType || "",
      color: item.color || "",
      supplier: item.supplier || "",
      cost_per_item: Number(item.costPerItem || 0),
      quantity_on_hand: Number(item.quantity || 0),
      threshold: Number(item.threshold || 0),
      location: item.location || "",
      notes: item.notes || "",
      updated_at: item.lastUpdated || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("inventory_items")
      .upsert(payload, { onConflict: "item_id" })
      .select();

    if (error) {
      console.error("upsertInventoryItemToCloud error:", error);
      enqueueInventorySync(item);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("Safe upsert failed:", err);
    enqueueInventorySync(item);
    return null;
  }
}

export async function deleteInventoryItemFromCloud(itemID) {
  const { error } = await supabase
    .from("inventory_items")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("item_id", itemID);

  if (error) {
    console.error("deleteInventoryItemFromCloud error:", error);
    throw error;
  }

  return true;
}

export async function insertInventoryUsageToCloud({
  itemID,
  delta,
  leadID = null,
  customerID = null,
  notes = "",
}) {
  const payload = {
    item_id: itemID,
    delta: Number(delta || 0),
    lead_id: leadID,
    customer_id: customerID,
    notes,
  };

  const { data, error } = await supabase
    .from("inventory_usage")
    .insert(payload)
    .select();

  if (error) {
    console.error("insertInventoryUsageToCloud error:", error);
    throw error;
  }

  return data;
}

export async function upsertLeadToCloud(lead) {
  const payload = {
    lead_id: lead.leadID,
    customer_name: lead.customerName || "",
    contact_number: lead.contactNumber || "",
    email: lead.email || "",
    address: lead.address || "",
    device: lead.device || "",
    series: lead.series || "",
    repair_type: lead.repairType || "",
    status: lead.status || "In Progress",
    date_reported: lead.dateReported || null,
    notes: lead.notes || "",
    inventory_used: Array.isArray(lead.inventoryUsed) ? lead.inventoryUsed : [],
    inventory_used_qty:
      lead.inventoryUsedQty && typeof lead.inventoryUsedQty === "object"
        ? lead.inventoryUsedQty
        : {},
    files: Array.isArray(lead.files) ? lead.files : [],
    last_updated: lead.lastUpdated || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("leads")
    .upsert(payload, { onConflict: "lead_id" })
    .select();

  if (error) {
    console.error("upsertLeadToCloud error:", error);
    throw error;
  }

  return data;
}

export async function fetchLeadsFromCloud() {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("last_updated", { ascending: false });

  if (error) {
    console.error("fetchLeadsFromCloud error:", error);
    throw error;
  }

  return (data || []).map((row) => ({
    leadID: row.lead_id,
    customerName: row.customer_name || "",
    contactNumber: row.contact_number || "",
    email: row.email || "",
    address: row.address || "",
    device: row.device || "",
    series: row.series || "",
    repairType: row.repair_type || "",
    status: row.status || "In Progress",
    dateReported: row.date_reported || null,
    notes: row.notes || "",
    inventoryUsed: Array.isArray(row.inventory_used) ? row.inventory_used : [],
    inventoryUsedQty:
      row.inventory_used_qty && typeof row.inventory_used_qty === "object"
        ? row.inventory_used_qty
        : {},
    files: Array.isArray(row.files) ? row.files : [],
    lastUpdated: row.last_updated || null,
    deletedAt: row.deleted_at || null,
  }));
}

export async function deleteLeadFromCloud(leadID) {
  const { error } = await supabase
    .from("leads")
    .update({
      deleted_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    })
    .eq("lead_id", leadID);

  if (error) {
    console.error("deleteLeadFromCloud error:", error);
    throw error;
  }

  return true;
}

export async function fetchAppSettingsFromCloud() {
  console.log("[DEBUG] fetchAppSettingsFromCloud using maybeSingle");

  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("fetchAppSettingsFromCloud error:", error);
    throw error;
  }

  if (!data) return null;

  return {
    categories: Array.isArray(data.categories) ? data.categories : [],
    repairs: Array.isArray(data.repairs) ? data.repairs : [],
    brands: Array.isArray(data.brands) ? data.brands : [],
    updatedAt: data.updated_at || null,
  };
}

export async function upsertAppSettingsToCloud(settings) {
  const payload = {
    id: 1,
    categories: Array.isArray(settings?.categories) ? settings.categories : [],
    repairs: Array.isArray(settings?.repairs) ? settings.repairs : [],
    brands: Array.isArray(settings?.brands) ? settings.brands : [],
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("upsertAppSettingsToCloud error:", error);
    throw error;
  }

  return data;
}