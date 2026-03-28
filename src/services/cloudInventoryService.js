import { supabase } from "./supabaseClient.js";

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
    costPerItem: Number(row.cost_per_item || 0),
    quantity: Number(row.quantity_on_hand || 0),
    threshold: Number(row.threshold || 0),
    location: row.location || "",
    notes: row.notes || "",
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  }));
}

export async function upsertInventoryItemToCloud(item) {
  const payload = {
    item_id: item.itemID,
    item_name: item.itemName || "",
    brand: item.brand || "",
    series: item.series || "",
    category: item.category || "",
    cost_per_item: Number(item.costPerItem || 0),
    quantity_on_hand: Number(item.quantity || 0),
    threshold: Number(item.threshold || 0),
    location: item.location || "",
    notes: item.notes || "",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("inventory_items")
    .upsert(payload, { onConflict: "item_id" })
    .select();

  if (error) {
    console.error("upsertInventoryItemToCloud error:", error);
    throw error;
  }

  return data;
}

export async function deleteInventoryItemFromCloud(itemID) {
  const { error } = await supabase
    .from("inventory_items")
    .delete()
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
    last_updated: new Date().toISOString(),
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

export async function deleteLeadFromCloud(leadID) {
  const { error } = await supabase
    .from("leads")
    .delete()
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