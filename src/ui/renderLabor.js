export function renderLabor(ctx) {
  const { el, data, addListItem } = ctx;

  if (!el.laborList) return;

  el.laborList.innerHTML = "";

  let totalLabor = 0;

  (data.leads || [])
    .filter((lead) => Number(lead.laborAmount || 0) > 0)
    .forEach((lead) => {
      const labor = Number(lead.laborAmount || 0);

      totalLabor += labor;

      addListItem(
        el.laborList,
        `${lead.leadID} (${lead.customerName}): $${labor.toFixed(2)}`
      );
    });

  const li = document.createElement("li");
  li.className = "tracker-total";
  li.textContent = `Total Labor: $${totalLabor.toFixed(2)}`;
  el.laborList.appendChild(li);
}