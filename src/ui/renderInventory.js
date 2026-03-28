// src/ui/renderInventory.js

function highlightMatch(value, query, esc) {
  const text = String(value ?? "");
  const safeText = esc(text);

  if (!query) return safeText;

  const lowerText = text.toLowerCase();
  const lowerQuery = String(query).toLowerCase();

  const matchIndex = lowerText.indexOf(lowerQuery);
  if (matchIndex === -1) return safeText;

  const before = esc(text.slice(0, matchIndex));
  const match = esc(text.slice(matchIndex, matchIndex + lowerQuery.length));
  const after = esc(text.slice(matchIndex + lowerQuery.length));

  return `${before}<mark class="inventory-search-hit">${match}</mark>${after}`;
}

export function renderInventory(ctx) {
  const {
    el,
    data,
    inventoryStatusByColorRule,
    esc,
    fmtDate,
    addListItem,
    isUnlocked,
    toast,
    inventoryService,
    addAudit,
    persist,
    upsertInventoryItemToCloud,
    renderAll,
    maybeNotifyLowStock,
    showItemHistory,
    deleteInventoryItem,
    addSwipeQuickUse,
  } = ctx;

  const q = el.inventorySearch.value.trim().toLowerCase();
    const rows = data.inventory.filter((i) =>
    [
      i.itemID,
      i.itemName,
      i.category,
      i.brand,
      i.series,
      i.color,
      i.supplier,
      i.notes,
    ]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );

  el.inventoryBody.innerHTML = "";

  if (!rows.length) {
    el.inventoryBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="11">
          <div class="empty-state">
            <div class="empty-icon">📦</div>
            <div class="empty-title">No Inventory Yet</div>
            <div class="muted">Add your first item to begin tracking parts.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach((item) => {
    const rule = inventoryStatusByColorRule(item.quantity);
    const tr = document.createElement("tr");
    tr.classList.add(rule.className);

    tr.innerHTML = `
    <td>
      ${highlightMatch(item.itemName, q, esc)}
      <div class="muted">${highlightMatch(item.itemID, q, esc)}</div>
      <div class="row">
        <button class="tiny historyBtn">History</button>
      </div>
    </td>

    <td>${highlightMatch(item.category || "-", q, esc)}</td>
    <td>${highlightMatch(item.brand || "-", q, esc)}</td>
    <td>${highlightMatch(item.series || "Standard", q, esc)}</td>
    <td>${highlightMatch(item.color || "-", q, esc)}</td>

    <td class="qty-cell">
      <button class="tiny qtyEditBtn" type="button">Qty: ${Number(item.quantity || 0)}</button>
    </td>

    <td>$${Number(item.costPerItem || 0).toFixed(2)}</td>
    <td>${highlightMatch(item.supplier || "-", q, esc)}</td>
    <td>${fmtDate(item.lastUpdated)}</td>

    <td>
      ${highlightMatch(item.notes || "-", q, esc)}
      <div class="muted">${rule.status} (${rule.color})</div>
    </td>

    <td><button class="tiny delete-btn deleteInventoryBtn">Delete</button></td>
  `;

        const qtyEditBtn = tr.querySelector(".qtyEditBtn");

    qtyEditBtn.addEventListener("click", async () => {
      if (!isUnlocked()) {
        toast("Locked: log in to edit quantity.", "error");
        return;
      }

      const prevQty = Number(item.quantity || 0);
      const input = window.prompt(`Update quantity for ${item.itemName}:`, String(prevQty));
      if (input === null) return;

      const parsed = Number(input);
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast("Please enter a valid quantity.", "error");
        return;
      }

      const newQty = Math.max(0, Math.floor(parsed));
      const delta = newQty - prevQty;

      if (newQty === prevQty) return;

      const updatedItem = (data.inventory || []).find((i) => i.itemID === item.itemID);
      if (!updatedItem) {
        toast("Item not found after update.", "error");
        return;
      }

      updatedItem.quantity = newQty;
      updatedItem.lastUpdated = new Date().toISOString();
      item.quantity = newQty;
      item.lastUpdated = updatedItem.lastUpdated;

      addAudit("inventory_adjusted", {
        itemID: item.itemID,
        delta,
        qty: newQty,
        userAction: "inline_edit",
      });

      qtyEditBtn.disabled = true;

      try {
        await persist();

        try {
          await upsertInventoryItemToCloud(updatedItem);
        } catch (err) {
          console.error("Inventory cloud sync failed:", err);
          toast("Quantity updated locally, but cloud sync failed.", "warning");
        }

        renderAll();
        maybeNotifyLowStock();
        toast("Quantity updated.", "success");
      } catch (err) {
        console.error("Inventory persist failed:", err);
        updatedItem.quantity = prevQty;
        item.quantity = prevQty;
        toast("Failed to update quantity.", "error");
      } finally {
        qtyEditBtn.disabled = false;
      }
    });

    tr.querySelector(".historyBtn").onclick = () => {
      console.log("USING FUNCTION:", showItemHistory);

      showItemHistory({
        el,
        data,
        addListItem,
        fmtDate,
        itemID: item.itemID,
      });
    };

    tr.querySelector(".deleteInventoryBtn").onclick = () =>
      deleteInventoryItem(item.itemID);

    addSwipeQuickUse(tr, item.itemID);
    el.inventoryBody.appendChild(tr);
  });
}