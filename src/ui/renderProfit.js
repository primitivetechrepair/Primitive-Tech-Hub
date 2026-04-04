export function renderProfit(ctx) {
  const { el, data, addListItem, leadPartsCost } = ctx;

  el.profitList.innerHTML = "";

  (data.leads || []).slice(0, 40).forEach((lead) => {
    const repairTotal = Number(lead.repairCost || 0);
    const partsCost = leadPartsCost(lead);
    const profit = repairTotal - partsCost;

    addListItem(
      el.profitList,
      `${lead.leadID} (${lead.customerName}): $${profit.toFixed(2)}`
    );
  });
}