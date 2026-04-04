export function renderProfit(ctx) {
  const { el, data, addListItem, leadPartsCost } = ctx;

  el.profitList.innerHTML = "";

  let totalProfit = 0;

  (data.leads || []).forEach((lead) => {
    const repairTotal = Number(lead.repairCost || 0);
    const partsCost = Number(leadPartsCost(lead) || 0);
    const labor = Number(lead.laborAmount || 0);
    const profit = repairTotal - partsCost;

    if (profit <= 0 && labor <= 0) return;

    totalProfit += profit;

    const laborText = labor > 0 ? ` • Labor $${labor.toFixed(2)}` : "";

    addListItem(
      el.profitList,
      `${lead.leadID} (${lead.customerName}): $${profit.toFixed(2)}${laborText}`
    );
  });

  const li = document.createElement("li");
  li.className = "tracker-total";
  li.textContent = `Total Profit: $${totalProfit.toFixed(2)}`;
  el.profitList.appendChild(li);
}