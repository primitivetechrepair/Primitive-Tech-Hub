export function maybeNotifyLowStock({
  getData,
  showModal, // 👈 NEW
}) {
  const data = getData();

  const thresholdDefault = data.settings.defaultThreshold;

  const out = data.inventory.filter((i) => Number(i.quantity || 0) <= 0);

  const low = data.inventory.filter((i) => {
    const qty = Number(i.quantity || 0);
    const threshold = Number(i.threshold || thresholdDefault);
    return qty > 0 && qty <= threshold;
  });

  if (!out.length && !low.length) return;

  const buildList = (items) =>
    items
      .map(
        (i) =>
          `<div class="stock-row">
            <span>${i.itemName}</span>
            <span class="stock-qty">${i.quantity}</span>
          </div>`
      )
      .join("");

  const message = `
    <div class="stock-alert">

      ${
        out.length
          ? `
        <div class="stock-section">
          <div class="stock-title danger">Out of Stock</div>
          ${buildList(out)}
        </div>
      `
          : ""
      }

      ${
        low.length
          ? `
        <div class="stock-section">
          <div class="stock-title warning">Low Stock</div>
          ${buildList(low)}
        </div>
      `
          : ""
      }

    </div>
  `;

  showModal({
    title: "Inventory Alert",
    message,
    confirmText: "Got it",
  });
}