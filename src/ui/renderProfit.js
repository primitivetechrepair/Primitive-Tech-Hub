export function renderProfit(ctx) {
  const { el, data, addListItem, leadPartsCost } = ctx;

  el.profitList.innerHTML = "";

  (data.leads || []).slice(0, 40).forEach((lead) => {
    const repairTotal = Number(lead.repairCost || 0);
    const partsCost = Number(leadPartsCost(lead) || 0);
    const labor = Number(lead.laborAmount || 0);
    const profit = repairTotal - partsCost;

    addListItem(
      el.profitList,
      `${lead.leadID} (${lead.customerName}): Profit $${profit.toFixed(2)} • Labor $${labor.toFixed(2)} • Parts $${partsCost.toFixed(2)} • Total $${repairTotal.toFixed(2)}`
    );
  });
}