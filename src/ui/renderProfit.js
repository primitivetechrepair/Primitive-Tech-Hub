export function renderProfit(ctx) {
  const { el, data, addListItem, leadPartsCost } = ctx;

  el.profitList.innerHTML = "";

  let totalProfit = 0;

  (data.leads || []).forEach((lead) => {
    const repairTotal = Number(lead.repairCost || 0);
    const partsCost = Number(leadPartsCost(lead) || 0);
    const labor = Number(lead.laborAmount || 0);
    const profit = repairTotal - partsCost;

    const hasProfit = profit > 0;
    const hasLabor = labor > 0;

    if (!hasProfit && !hasLabor) return;

    totalProfit += hasProfit ? profit : labor;

    let text = `${lead.leadID} (${lead.customerName}): `;

    if (hasProfit && hasLabor) {
      text += `$${profit.toFixed(2)} • Labor $${labor.toFixed(2)}`;
    } else if (hasProfit) {
      text += `$${profit.toFixed(2)}`;
    } else {
      text += `Labor $${labor.toFixed(2)}`;
    }

    addListItem(el.profitList, text);
  });

  const li = document.createElement("li");
  li.className = "tracker-total";
  li.textContent = `Total Profit: $${totalProfit.toFixed(2)}`;
  el.profitList.appendChild(li);
}