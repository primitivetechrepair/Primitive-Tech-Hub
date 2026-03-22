export function createLeadCostService({ getData }) {
  function leadPartsCost(lead) {
    const data = getData();
    return (lead.inventoryUsed || []).reduce((sum, id) => {
      const item = (data.inventory || []).find((i) => i.itemID === id);
      return sum + (item ? item.costPerItem : 0);
    }, 0);
  }

  return { leadPartsCost };
}