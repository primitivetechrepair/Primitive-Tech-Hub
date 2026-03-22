export function ensureLeadPartsShape(lead) {
  if (!lead.inventoryUsedQty || typeof lead.inventoryUsedQty !== 'object') {
    lead.inventoryUsedQty = {};
  }

  if (Array.isArray(lead.inventoryUsed)) {
    lead.inventoryUsed.forEach((id) => {
      if (!lead.inventoryUsedQty[id]) {
        lead.inventoryUsedQty[id] = 1;
      }
    });
  } else {
    lead.inventoryUsed = [];
  }

  return lead;
}