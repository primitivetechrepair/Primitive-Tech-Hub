// src/ui/renderForecast.js
export function renderForecast(ctx) {
  const { el, data, addListItem } = ctx;

  el.forecastList.innerHTML = "";

  data.inventory.forEach((item) => {
    const last30 = (item.usageEvents || []).filter(
      (u) => Date.now() - new Date(u.at).getTime() < 30 * 86400000
    );

    const dailyUse = last30.reduce((sum, u) => sum + u.delta, 0) / 30;
    const predictedNeed = Math.ceil(dailyUse * 30);
    const projected = item.quantity - predictedNeed;

    addListItem(
      el.forecastList,
      `${item.itemName}: next 30d usage ~${predictedNeed}, projected stock ${projected}`
    );
  });
}