export function maybeNotifyLowStock({
  getData,
  showModal,
}) {
  const data = getData();
  const inventory = Array.isArray(data.inventory) ? data.inventory : [];
  const thresholdDefault = Number(data?.settings?.defaultThreshold || 5);

  const out = inventory
    .filter((i) => Number(i.quantity || 0) <= 0)
    .sort((a, b) => String(a.itemName || "").localeCompare(String(b.itemName || "")));

  const low = inventory
    .filter((i) => {
      const qty = Number(i.quantity || 0);
      const threshold = Number(i.threshold || thresholdDefault);
      return qty > 0 && qty <= threshold;
    })
    .sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0));

  if (!out.length && !low.length) return;

  const getQtySeverityClass = (qty) => {
    const n = Number(qty || 0);
    if (n <= 0) return "qty-out";
    if (n <= 2) return "qty-critical";
    if (n <= 5) return "qty-warning";
    return "qty-ok";
  };

  const buildList = (items, type) =>
    items
      .map((i) => {
        const qty = Number(i.quantity || 0);
        const itemID = String(i.itemID || "").trim();

        return `
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

  <div class="stock-qty-controls">
  <button
    type="button"
    class="stock-restock-btn minus"
    aria-label="Decrease quantity"
    title="Decrease quantity"
    onclick="window.handleStockAdjust('${itemID}', 1)"
  >
    -
  </button>

  <span class="stock-item-qty ${getQtySeverityClass(qty)}">Qty: ${qty}</span>

  <button
    type="button"
    class="stock-restock-btn plus"
    aria-label="Increase quantity"
    title="Increase quantity"
    onclick="window.handleStockAdjust('${itemID}', -1)"
  >
    +
  </button>
</div>
</div>
          </div>
        `;
      })
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

  // buttons use window.handleStockAdjust(...) directly

}