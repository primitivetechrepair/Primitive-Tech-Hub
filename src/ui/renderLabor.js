export function renderLabor(ctx) {
  const { el, data, addListItem } = ctx;

  if (!el.laborList) return;

  el.laborList.innerHTML = "";

  (data.leads || []).slice(0, 40).forEach((lead) => {
    const labor = Number(lead.laborAmount || 0);

    addListItem(
      el.laborList,
      `${lead.leadID} (${lead.customerName}): $${labor.toFixed(2)}`
    );
  });
}