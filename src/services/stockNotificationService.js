export function maybeNotifyLowStock({
  getData,
  showModal,
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

  const buildList = (items, type) =>
    items
      .map(
        (i) => `
          <div class="stock-item ${type}">
            <div class="stock-item-main">
              <div class="stock-item-name">${i.itemName || i.itemID || "Unknown Item"}</div>
              <div class="stock-item-meta">
                ${i.device ? `<span>${i.device}</span>` : ""}
                ${i.brand ? `<span>${i.brand}</span>` : ""}
                ${i.series ? `<span>${i.series}</span>` : ""}
              </div>
            </div>
            <div class="stock-item-side">
              <span class="stock-item-status">${type === "stock-out" ? "Out" : "Low"}</span>
              <span class="stock-item-qty">Qty: ${Number(i.quantity || 0)}</span>
            </div>
          </div>
        `
      )
      .join("");

  const message = `
    <div class="stock-alert">
      ${
        out.length
          ? `
        <div class="stock-section">
          <div class="stock-title danger">Out of Stock</div>
          <div class="stock-list">
            ${buildList(out, "stock-out")}
          </div>
        </div>
      `
          : ""
      }

      ${
        low.length
          ? `
        <div class="stock-section">
          <div class="stock-title warning">Low Stock</div>
          <div class="stock-list">
            ${buildList(low, "stock-low")}
          </div>
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