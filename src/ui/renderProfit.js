// src/ui/renderProfit.js
export function renderProfit(ctx) {
  const { el, data, addListItem, leadPartsCost } = ctx;

  el.profitList.innerHTML = "";

  data.leads.slice(0, 40).forEach((lead) => {
    const profit = Number(lead.chargedAmount || 0) - leadPartsCost(lead);
    addListItem(
      el.profitList,
      `${lead.leadID} (${lead.customerName}): $${profit.toFixed(2)}`
    );
  });
}