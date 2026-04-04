export function createLeadCostService({ getData }) {
  function leadPartsCost(lead) {
    const data = getData();

    return (lead.inventoryUsed || []).reduce((sum, id) => {
      const item = (data.inventory || []).find((i) => i.itemID === id);
      const qty = Number(lead.inventoryUsedQty?.[id] || 1);
      const costPerItem = Number(item?.costPerItem || 0);

      return sum + costPerItem * qty;
    }, 0);
  }

  return { leadPartsCost };
}