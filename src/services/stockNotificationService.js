let hasShownStockAlertThisLoad = false;

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
          <div class="stock-item ${type}" data-item-id="${itemID}" data-base-qty="${qty}">
            <div class="stock-item-main">
              <div class="stock-item-name">${i.itemName || i.itemID || "Unknown Item"}</div>
              <div class="stock-item-meta">
                ${i.category ? `<span>${i.category}</span>` : ""}
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
                  data-item-id="${itemID}"
                  data-delta="1"
                  aria-label="Decrease quantity"
                  title="Decrease quantity"
                >
                  -
                </button>

                <span
                  class="stock-item-qty ${getQtySeverityClass(qty)}"
                  data-item-id="${itemID}"
                >Qty: ${qty}</span>

                <button
                  type="button"
                  class="stock-restock-btn plus"
                  data-item-id="${itemID}"
                  data-delta="-1"
                  aria-label="Increase quantity"
                  title="Increase quantity"
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

  const pending = new Map();

  const updateQtyPreview = (row) => {
    const itemID = String(row.dataset.itemId || "").trim();
    const baseQty = Number(row.dataset.baseQty || 0);
    const pendingDelta = Number(pending.get(itemID) || 0);
    const previewQty = Math.max(0, baseQty - pendingDelta);

    const qtyEl = row.querySelector('.stock-item-qty');
    if (!qtyEl) return;

    qtyEl.textContent = `Qty: ${previewQty}`;
    qtyEl.classList.remove("qty-out", "qty-critical", "qty-warning", "qty-ok");
    qtyEl.classList.add(getQtySeverityClass(previewQty));
  };

  hasShownStockAlertThisLoad = true;

  showModal({
    title: "Inventory Alert",
    message,
    confirmText: "Apply Changes",
    cancelText: "Close",
    showCancel: true,
    confirmDisabled: true,
    onRender: ({ el }) => {
      const hasPendingChanges = () =>
        Array.from(pending.values()).some((v) => Number(v || 0) !== 0);

      el.modalMessage.onclick = (e) => {
        const btn = e.target.closest(".stock-restock-btn");
        if (!btn) return;

        const itemID = String(btn.dataset.itemId || "").trim();
        const delta = Number(btn.dataset.delta);

        if (!itemID || Number.isNaN(delta)) return;

        const nextDelta = Number(pending.get(itemID) || 0) + delta;

        if (nextDelta === 0) pending.delete(itemID);
        else pending.set(itemID, nextDelta);

        const row = el.modalMessage.querySelector(`.stock-item[data-item-id="${itemID}"]`);
        if (row) updateQtyPreview(row);

        el.modalConfirmBtn.disabled = !hasPendingChanges();
      };
    },
  }).then((confirmed) => {
    if (!confirmed) return;
    if (!window.handleStockAdjust) return;

    for (const [itemID, delta] of pending.entries()) {
      if (!delta) continue;
      window.handleStockAdjust(itemID, delta);
    }
  });
}