// src/ui/renderRestock.js
export function renderRestock(ctx) {
  const { el, data, addListItem } = ctx;

  el.restockList.innerHTML = "";

  const scheduledDemand = {};

  data.leads
    .filter((l) => l.status !== "Completed")
    .forEach((lead) => {
      (lead.inventoryUsed || []).forEach((id) => {
        scheduledDemand[id] = (scheduledDemand[id] || 0) + 1;
      });
    });

  data.inventory.forEach((item) => {
    const schedule = scheduledDemand[item.itemID] || 0;

    const forecast30 = Math.ceil(
      (item.usageEvents || [])
        .filter(
          (u) =>
            Date.now() - new Date(u.at).getTime() <
            30 * 86400000
        )
        .reduce((s, u) => s + u.delta, 0)
    );

    const reorderTarget = Math.max(
      10,
      item.threshold + forecast30 + schedule
    );

    if (
      item.quantity < item.threshold ||
      item.quantity < reorderTarget / 2
    ) {
      const suggest = Math.max(
        reorderTarget - item.quantity,
        item.threshold
      );

      addListItem(
        el.restockList,
        `${item.itemName}: reorder +${suggest} (scheduled:${schedule}, forecast:${forecast30})`
      );
    }
  });
}