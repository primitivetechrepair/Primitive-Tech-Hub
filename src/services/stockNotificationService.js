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
    .map((i) => {
      const qty = Number(i.quantity || 0);

      return `
        <div class="stock-item ${type}" data-itemid="${i.itemID || ""}">
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
            <span class="stock-item-qty ${getQtySeverityClass(qty)}">Qty: ${qty}</span>
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

  setTimeout(() => {
    const modalItems = document.querySelectorAll(".stock-item");
    if (!modalItems.length) return;

    modalItems.forEach((itemEl) => {
      itemEl.addEventListener("click", () => {
        const itemID = itemEl.dataset.itemid;
        if (!itemID) return;

        const modal = document.getElementById("appModal");
        if (modal) {
          modal.classList.remove("open");
          modal.classList.add("hidden");
          modal.setAttribute("aria-hidden", "true");
        }

        const allRows = document.querySelectorAll("#inventoryBody tr");
        let targetRow = null;

        allRows.forEach((row) => {
          if (row.innerText.includes(itemID)) {
            targetRow = row;
          }
        });

        if (!targetRow) return;

        targetRow.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        targetRow.style.transition = "box-shadow 0.25s ease, background 0.25s ease";
        targetRow.style.boxShadow = "0 0 0 2px rgba(102,252,241,0.75)";
        targetRow.style.background = "rgba(102,252,241,0.10)";

        setTimeout(() => {
          targetRow.style.boxShadow = "";
          targetRow.style.background = "";
        }, 1400);
      });
    });
  }, 50);
}