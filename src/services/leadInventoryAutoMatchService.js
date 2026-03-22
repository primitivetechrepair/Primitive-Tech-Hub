// ./src/services/leadInventoryAutoMatchService.js
export function createLeadInventoryAutoMatchService({
  getData,
  persist,
  renderAll,
  addAudit,
  toast, // expects toast(el,msg,type) or wrapped toast(msg,type) depending on injection
  el,
  maybeNotifyLowStock, // () => void or async () => void
}) {
  function normalizeTokens(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/replacement/g, '')       // ignore "replacement"
      .replace(/[^a-z0-9\s]/g, ' ')      // remove punctuation
      .split(/\s+/)
      .filter(Boolean);
  }

  function scoreInventoryMatch(item, tokens) {
    const hay = normalizeTokens([
      item.itemName,
      item.brand,
      item.category,
      item.series
    ].join(' '));

    let score = 0;
    tokens.forEach(t => {
      if (hay.includes(t)) score += 1;
    });

    if ((item.quantity || 0) > 0) score += 2;
    return score;
  }

  function findBestInventoryMatchForLead(lead) {
    const data = getData();
    const tokens = [
      ...normalizeTokens(lead.device),
      ...normalizeTokens(lead.series),
      ...normalizeTokens(lead.repairType || lead.repair || lead.issueDescription)
    ];

    if (!tokens.length) return null;

    let best = null;
    let bestScore = 0;

    (data.inventory || []).forEach(item => {
      const s = scoreInventoryMatch(item, tokens);
      if (s > bestScore) {
        bestScore = s;
        best = item;
      }
    });

    if (!best || bestScore < 2) return null;
    return best;
  }

  async function addPartAutoToLead(leadID) {
    const data = getData();
    const lead = (data.leads || []).find(l => l.leadID === leadID);
    if (!lead) return toast(el, 'Lead not found.', 'error');

    const match = findBestInventoryMatchForLead(lead);
    if (!match) {
      return toast(el, 'No matching inventory item found for this lead (Device/Series/Repair).', 'warning');
    }

    if ((match.quantity || 0) < 1) {
      return toast(el, `Matched part is out of stock: ${match.itemName}`, 'warning');
    }

    // Link item to lead (only once)
    lead.inventoryUsed = lead.inventoryUsed || [];
    if (!lead.inventoryUsed.includes(match.itemID)) {
      lead.inventoryUsed.push(match.itemID);
    }

    // Ensure qty map exists and increment
    if (!lead.inventoryUsedQty || typeof lead.inventoryUsedQty !== 'object') {
      lead.inventoryUsedQty = {};
    }
    lead.inventoryUsedQty[match.itemID] = (lead.inventoryUsedQty[match.itemID] || 0) + 1;

    // Deduct 1 from inventory immediately
    match.quantity = Math.max(0, (match.quantity || 0) - 1);
    match.lastUpdated = new Date().toISOString();
    match.usageEvents = match.usageEvents || [];
    match.usageEvents.push({ at: new Date().toISOString(), delta: 1, leadID: lead.leadID });

    // IMPORTANT: do NOT auto-change lead status
    lead.lastUpdated = new Date().toISOString();

    addAudit('lead_part_added_auto', { leadID: lead.leadID, itemID: match.itemID, userAction: 'auto_add_part' });
    addAudit('inventory_used_for_repair_auto', { itemID: match.itemID, leadID: lead.leadID, delta: 1, userAction: 'auto_add_part' });

    await persist();
    renderAll();
    await maybeNotifyLowStock?.();

    toast(el, `Added part: ${match.itemName} (-1)`, 'success');
  }

  return {
    addPartAutoToLead,
    findBestInventoryMatchForLead, // exported in case UI wants preview later
  };
}