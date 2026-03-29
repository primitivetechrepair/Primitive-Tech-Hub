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

function ensureInventoryToolbar(el, data, esc, renderAll) {
  if (!el.inventoryBody?.parentElement?.parentElement) return null;

  let toolbar = el.inventoryToolbar;

  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.className = "inventory-toolbar";
    toolbar.innerHTML = `
      <div class="inventory-tabs"></div>
      <div class="inventory-toolbar-controls">
        <label class="inventory-device-filter-wrap">
          <span>Device</span>
          <select class="inventory-device-filter"></select>
        </label>
        <label class="inventory-brand-filter-wrap">
          <span>Brand</span>
          <select class="inventory-brand-filter"></select>
        </label>
        <label class="inventory-stock-filter-wrap">
          <span>Stock</span>
          <select class="inventory-stock-filter">
            <option value="all">All Stock</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </label>
      </div>
    `;

    el.inventoryBody.parentElement.parentElement.insertBefore(
      toolbar,
      el.inventoryBody.parentElement
    );

    el.inventoryToolbar = toolbar;
  }

  if (!el._inventoryActiveTab) {
    el._inventoryActiveTab = "All";
  }

  if (!el._inventoryActiveDevice) {
    el._inventoryActiveDevice = "all";
  }

  if (!el._inventoryActiveBrand) {
    el._inventoryActiveBrand = "all";
  }

  if (!el._inventoryActiveStock) {
    el._inventoryActiveStock = "all";
  }

  const fixedTabs = [
    "All",
    "Screen",
    "Battery",
    "Charge Port",
    "Camera",
    "Back Glass",
    "Accessory",
    "Tool",
    "Other",
  ];

  const tabsWrap = toolbar.querySelector(".inventory-tabs");
  if (tabsWrap) {
    tabsWrap.innerHTML = fixedTabs
      .map(
        (tab) => `
          <button
            type="button"
            class="inv-tab ${el._inventoryActiveTab === tab ? "active" : ""}"
            data-tab="${esc(tab)}"
          >
            ${esc(tab)}
          </button>
        `
      )
      .join("");

    tabsWrap.querySelectorAll(".inv-tab").forEach((btn) => {
      btn.onclick = () => {
        const nextTab = btn.dataset.tab || "All";
        if (el._inventoryActiveTab === nextTab) return;
        el._inventoryActiveTab = nextTab;
        renderAll();
      };
    });
  }

    const deviceSelect = toolbar.querySelector(".inventory-device-filter");
  if (deviceSelect) {
    const devices = [
      ...new Set(
        (Array.isArray(data.inventory) ? data.inventory : [])
          .map((i) => String(i.category || "").trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));

    deviceSelect.innerHTML =
      `<option value="all">All Devices</option>` +
      devices
        .map(
          (device) =>
            `<option value="${esc(device)}" ${
              el._inventoryActiveDevice === device ? "selected" : ""
            }>${esc(device)}</option>`
        )
        .join("");

    if (
      el._inventoryActiveDevice !== "all" &&
      !devices.includes(el._inventoryActiveDevice)
    ) {
      el._inventoryActiveDevice = "all";
      deviceSelect.value = "all";
    } else {
      deviceSelect.value = el._inventoryActiveDevice || "all";
    }

    deviceSelect.onchange = (e) => {
      el._inventoryActiveDevice = e.target.value || "all";
      renderAll();
    };
  }

  const brandSelect = toolbar.querySelector(".inventory-brand-filter");
  if (brandSelect) {
    const brands = [
      ...new Set(
        (Array.isArray(data.inventory) ? data.inventory : [])
          .map((i) => String(i.brand || "").trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));

    brandSelect.innerHTML =
      `<option value="all">All Brands</option>` +
      brands
        .map(
          (brand) =>
            `<option value="${esc(brand)}" ${
              el._inventoryActiveBrand === brand ? "selected" : ""
            }>${esc(brand)}</option>`
        )
        .join("");

    if (
      el._inventoryActiveBrand !== "all" &&
      !brands.includes(el._inventoryActiveBrand)
    ) {
      el._inventoryActiveBrand = "all";
      brandSelect.value = "all";
    } else {
      brandSelect.value = el._inventoryActiveBrand || "all";
    }

    brandSelect.onchange = (e) => {
      el._inventoryActiveBrand = e.target.value || "all";
      renderAll();
    };
  }

  const stockSelect = toolbar.querySelector(".inventory-stock-filter");
  if (stockSelect) {
    stockSelect.value = el._inventoryActiveStock || "all";

    stockSelect.onchange = (e) => {
      el._inventoryActiveStock = e.target.value || "all";
      renderAll();
    };
  }

  return toolbar;
}

export function renderInventory(ctx) {
  const {
    el,
    data,
    inventoryStatusByColorRule,
    esc,
    fmtDateShort,
    addListItem,
    isUnlocked,
    toast,
    inventoryService,
    addAudit,
    persist,
    renderAll,
    maybeNotifyLowStock,
    showItemHistory,
    deleteInventoryItem,
    addSwipeQuickUse,
  } = ctx;

  ensureInventoryToolbar(el, data, esc, renderAll);

  const q = el.inventorySearch.value.trim().toLowerCase();
  const activeTab = el._inventoryActiveTab || "All";
  const activeDevice = el._inventoryActiveDevice || "all";
  const activeBrand = el._inventoryActiveBrand || "all";
  const activeStock = el._inventoryActiveStock || "all";

  const rows = (Array.isArray(data.inventory) ? data.inventory : []).filter((i) => {
    const matchesSearch = [
      i.itemID,
      i.itemName,
      i.category,
      i.partType,
      i.brand,
      i.series,
      i.color,
      i.supplier,
      i.notes,
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);

    const matchesTab =
      activeTab === "All" ||
      String(i.partType || "Other").trim().toLowerCase() === activeTab.toLowerCase();

    const matchesDevice =
      activeDevice === "all" ||
      String(i.category || "").trim().toLowerCase() === activeDevice.toLowerCase();

    const matchesBrand =
      activeBrand === "all" ||
      String(i.brand || "").trim().toLowerCase() === activeBrand.toLowerCase();

    const qty = Number(i.quantity || 0);
    const threshold = Number(i.threshold || 0);

    const matchesStock =
      activeStock === "all" ||
      (activeStock === "out" && qty <= 0) ||
      (activeStock === "low" && qty > 0 && qty <= threshold) ||
      (activeStock === "in" && qty > threshold);

    return matchesSearch && matchesTab && matchesDevice && matchesBrand && matchesStock;
  });

  el.inventoryBody.innerHTML = "";

  if (!rows.length) {
    el.inventoryBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="12">
          <div class="empty-state">
            <div class="empty-icon">📦</div>
            <div class="empty-title">No Inventory Found</div>
            <div class="muted">Try another tab, device, brand, stock filter, or search term.</div>
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
      <td>${highlightMatch(item.partType || "Other", q, esc)}</td>
      <td>${highlightMatch(item.brand || "-", q, esc)}</td>
      <td>${highlightMatch(item.series || "Standard", q, esc)}</td>
      <td>${highlightMatch(item.color || "-", q, esc)}</td>

      <td><input class="qty-input" type="number" min="0" value="${item.quantity}" /></td>
      <td>$${Number(item.costPerItem || 0).toFixed(2)}</td>
      <td>${highlightMatch(item.supplier || "-", q, esc)}</td>
      <td>${fmtDateShort(item.lastUpdated)}</td>

      <td>
        ${highlightMatch(item.notes || "-", q, esc)}
        <div class="muted">${rule.status} (${rule.color})</div>
      </td>

      <td><button class="tiny delete-btn deleteInventoryBtn">Delete</button></td>
    `;

    tr.querySelector(".qty-input").addEventListener("change", async (e) => {
      if (!isUnlocked()) {
        toast("Locked: log in to edit quantity.", "error");
        e.target.value = item.quantity;
        return;
      }

      const newQty = Math.max(0, Number(e.target.value));
      const delta = newQty - item.quantity;

      inventoryService.updateItem(item.itemID, { quantity: newQty });

      addAudit("inventory_adjusted", {
        itemID: item.itemID,
        delta,
        qty: newQty,
        userAction: "inline_edit",
      });

      await persist();
      renderAll();
      maybeNotifyLowStock();
    });

    tr.querySelector(".historyBtn").onclick = () => {
      showItemHistory({
        el,
        data,
        addListItem,
        itemID: item.itemID,
      });
    };

    tr.querySelector(".deleteInventoryBtn").onclick = () =>
      deleteInventoryItem(item.itemID);

    addSwipeQuickUse(tr, item.itemID);
    el.inventoryBody.appendChild(tr);
  });
}