export function renderPartsCost(ctx) {
  const { el, data, addListItem, leadPartsCost } = ctx;

  if (!el.partsCostList) return;

  el.partsCostList.innerHTML = "";

  let totalPartsCost = 0;

  (data.leads || [])
    .filter((lead) => Number(leadPartsCost(lead) || 0) > 0)
    .forEach((lead) => {
      const partsCost = Number(leadPartsCost(lead) || 0);

      totalPartsCost += partsCost;

      addListItem(
        el.partsCostList,
        `${lead.leadID} (${lead.customerName}): $${partsCost.toFixed(2)}`
      );
    });

  const li = document.createElement("li");
  li.className = "tracker-total";
  li.textContent = `Total Parts Cost: $${totalPartsCost.toFixed(2)}`;
  el.partsCostList.appendChild(li);
}