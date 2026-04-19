// src/ui/renderInventory.js

const INVENTORY_GROUPS_STATE_KEY = "primitiveTechHubInventoryGroupState";


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
  <div class="inventory-toolbar-sort-row">
    <label class="inventory-sort-filter-wrap inventory-sort-filter-wrap--full">
      <span>Sort</span>
      <select class="inventory-sort-filter">
        <option value="updated_desc">Recently Updated</option>
        <option value="qty_asc">Quantity: Low to High</option>
        <option value="qty_desc">Quantity: High to Low</option>
        <option value="name_asc">Name: A–Z</option>
        <option value="name_desc">Name: Z–A</option>
      </select>
    </label>
  </div>

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

const form = document.getElementById("inventoryForm");

if (form && form.parentElement) {
  form.parentElement.insertBefore(toolbar, form);

  let title = document.getElementById("inventoryFormTitle");
  if (!title) {
    title = document.createElement("h2");
    title.id = "inventoryFormTitle";
    title.textContent = "New Inventory Item";
  }

  form.parentElement.insertBefore(title, form);
} else {
  // fallback (your original behavior)
  el.inventoryBody.parentElement.parentElement.insertBefore(
    toolbar,
    el.inventoryBody.parentElement
  );
}

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

  if (!el._inventoryActiveSort) {
    el._inventoryActiveSort = "updated_desc";
  }

  if (!el._inventoryCollapsedGroups) {
    try {
      const saved = JSON.parse(
        localStorage.getItem(INVENTORY_GROUPS_STATE_KEY) || "{}"
      );
      el._inventoryCollapsedGroups =
        saved && typeof saved === "object" ? saved : {};
    } catch {
      el._inventoryCollapsedGroups = {};
    }
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

  const sortSelect = toolbar.querySelector(".inventory-sort-filter");
  if (sortSelect) {
    sortSelect.value = el._inventoryActiveSort || "updated_desc";

    sortSelect.onchange = (e) => {
      el._inventoryActiveSort = e.target.value || "updated_desc";
      renderAll();
    };
  }

  return toolbar;
}

function buildInventoryRow(item, ctx, q) {
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
    deleteInventoryItem,
    addSwipeQuickUse,
  } = ctx;

  const rule = inventoryStatusByColorRule(item.quantity);
  const isDesktop = window.innerWidth > 900;

const tr = document.createElement(isDesktop ? "div" : "tr");
  tr.classList.add(rule.className);

if (isDesktop) {
  tr.classList.add("inventory-card");
}

  const deviceOptions = [
    ...new Set(
      [
        ...(Array.isArray(data?.settings?.categories) ? data.settings.categories : []),
        ...(Array.isArray(data.inventory) ? data.inventory.map((i) => i.category) : []),
      ]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

  const brandOptions = [
    ...new Set(
      [
        ...(Array.isArray(data?.settings?.brands) ? data.settings.brands : []),
        ...(Array.isArray(data.inventory) ? data.inventory.map((i) => i.brand) : []),
      ]
        .map((v) => String(v || "").trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

  const partTypeOptions = [
    "Screen",
    "Battery",
    "Charge Port",
    "Camera",
    "Back Glass",
    "Accessory",
    "Tool",
    "Other",
  ];

  if (isDesktop) {
  tr.innerHTML = `
    <div class="inv-card-header">
      <div class="inv-card-title">
        <input class="inline-edit inline-itemName" type="text" value="${esc(item.itemName || "")}" />
        <div class="muted inv-item-id">
          ${highlightMatch(item.itemID, q, esc)}
        </div>
      </div>

      <button class="tiny historyBtn">History</button>
    </div>

    <div class="inv-card-grid">

      <div class="inv-field">
        <span>Device</span>
        <select class="inline-edit inline-category">
          ${deviceOptions.map(option =>
            `<option value="${esc(option)}" ${
              String(item.category || "") === option ? "selected" : ""
            }>${esc(option)}</option>`
          ).join("")}
        </select>
      </div>

      <div class="inv-field">
        <span>Brand</span>
        <select class="inline-edit inline-brand">
          ${brandOptions.map(option =>
            `<option value="${esc(option)}" ${
              String(item.brand || "") === option ? "selected" : ""
            }>${esc(option)}</option>`
          ).join("")}
        </select>
      </div>

      <div class="inv-field">
        <span>Series</span>
        <input class="inline-edit inline-series" type="text" value="${esc(item.series || "Standard")}" />
      </div>

      <div class="inv-field">
        <span>Qty</span>
        <input class="inline-edit inline-quantity" type="number" min="0" value="${Number(item.quantity || 0)}" />
      </div>

      <div class="inv-field">
        <span>Cost</span>
        <input class="inline-edit inline-cost" type="number" min="0" step="0.01" value="${Number(item.costPerItem || 0)}" />
      </div>

      <div class="inv-field">
        <span>Supplier</span>
        <input class="inline-edit inline-supplier" type="text" value="${esc(item.supplier || "")}" />
      </div>

      <div class="inv-field">
  <span>Part Type</span>
  <select class="inline-edit inline-partType">
    ${partTypeOptions.map(option =>
      `<option value="${esc(option)}" ${
        String(item.partType || "Other") === option ? "selected" : ""
      }>${esc(option)}</option>`
    ).join("")}
  </select>
</div>

<div class="inv-field">
  <span>Color</span>
  <input class="inline-edit inline-color" type="text" value="${esc(item.color || "")}" />
</div>

<div class="inv-field inv-field--full">
  <span>Notes</span>
  <input class="inline-edit inline-notes" type="text" value="${esc(item.notes || "")}" />
</div>

    </div>

    <div class="inv-card-footer">
      <div class="inv-status muted">${rule.status} (${rule.color})</div>
      <div class="inv-card-meta muted">${fmtDateShort(item.lastUpdated)}</div>
      <button class="tiny delete-btn deleteInventoryBtn">Delete</button>
    </div>
  `;
} else {
  tr.innerHTML = `
    <td>
      <div class="inv-item-header">

        <div class="inv-item-text">
          <input
            class="inline-edit inline-itemName"
            type="text"
            value="${esc(item.itemName || "")}"
          />

          <div class="muted inv-item-id">
            ${highlightMatch(item.itemID, q, esc)}
          </div>
        </div>

        <button class="tiny historyBtn">History</button>

      </div>
    </td>

    <td>
      <select class="inline-edit inline-category">
        ${deviceOptions
          .map(
            (option) =>
              `<option value="${esc(option)}" ${
                String(item.category || "") === option ? "selected" : ""
              }>${esc(option)}</option>`
          )
          .join("")}
      </select>
    </td>

    <td>
      <select class="inline-edit inline-partType">
        ${partTypeOptions
          .map(
            (option) =>
              `<option value="${esc(option)}" ${
                String(item.partType || "Other") === option ? "selected" : ""
              }>${esc(option)}</option>`
          )
          .join("")}
      </select>
    </td>

    <td>
      <select class="inline-edit inline-brand">
        ${brandOptions
          .map(
            (option) =>
              `<option value="${esc(option)}" ${
                String(item.brand || "") === option ? "selected" : ""
              }>${esc(option)}</option>`
          )
          .join("")}
      </select>
    </td>

    <td>
      <input
        class="inline-edit inline-series"
        type="text"
        value="${esc(item.series || "Standard")}"
      />
    </td>

    <td>
      <input
        class="inline-edit inline-color"
        type="text"
        value="${esc(item.color || "")}"
      />
    </td>

    <td>
      <input
        class="inline-edit inline-quantity"
        type="number"
        min="0"
        value="${Number(item.quantity || 0)}"
      />
    </td>

    <td>
      <input
        class="inline-edit inline-cost"
        type="number"
        min="0"
        step="0.01"
        value="${Number(item.costPerItem || 0)}"
      />
    </td>

    <td>
      <input
        class="inline-edit inline-supplier"
        type="text"
        value="${esc(item.supplier || "")}"
      />
    </td>

    <td>${fmtDateShort(item.lastUpdated)}</td>

    <td>
      <input
        class="inline-edit inline-notes"
        type="text"
        value="${esc(item.notes || "")}"
      />
      <div class="muted">${rule.status} (${rule.color})</div>
    </td>

    <td><button class="tiny delete-btn deleteInventoryBtn">Delete</button></td>
  `;
}

  async function savePatch(patch, auditMeta = {}) {
    if (!isUnlocked()) {
      toast("Locked: log in to edit inventory.", "error");
      renderAll();
      return;
    }

    await inventoryService.updateItem(item.itemID, patch);

    addAudit("inventory_adjusted", {
      itemID: item.itemID,
      userAction: "inline_edit",
      ...auditMeta,
    });

    await persist();
    renderAll();
    maybeNotifyLowStock();
  }

  tr.querySelector(".inline-itemName").addEventListener("blur", async (e) => {
    const value = String(e.target.value || "").trim();
    if (value === String(item.itemName || "").trim()) return;
    if (!value) {
      renderAll();
      return;
    }
    await savePatch({ itemName: value }, { field: "itemName" });
  });

  tr.querySelector(".inline-category").addEventListener("change", async (e) => {
    const value = String(e.target.value || "").trim();
    if (value === String(item.category || "").trim()) return;
    await savePatch({ category: value }, { field: "category" });
  });

  tr.querySelector(".inline-partType").addEventListener("change", async (e) => {
    const value = String(e.target.value || "").trim() || "Other";
    if (value === String(item.partType || "Other").trim()) return;
    await savePatch({ partType: value }, { field: "partType" });
  });

  tr.querySelector(".inline-brand").addEventListener("change", async (e) => {
    const value = String(e.target.value || "").trim();
    if (value === String(item.brand || "").trim()) return;
    await savePatch({ brand: value }, { field: "brand" });
  });

  tr.querySelector(".inline-series").addEventListener("blur", async (e) => {
    const value = String(e.target.value || "").trim() || "Standard";
    if (value === String(item.series || "Standard").trim()) return;
    await savePatch({ series: value }, { field: "series" });
  });

  tr.querySelector(".inline-color").addEventListener("blur", async (e) => {
    const value = String(e.target.value || "").trim();
    if (value === String(item.color || "").trim()) return;
    await savePatch({ color: value }, { field: "color" });
  });

  tr.querySelector(".inline-quantity").addEventListener("change", async (e) => {
    const newQty = Math.max(0, Number(e.target.value));
    const oldQty = Number(item.quantity || 0);
    if (newQty === oldQty) return;

    await savePatch(
      { quantity: newQty },
      { field: "quantity", delta: newQty - oldQty, qty: newQty }
    );
  });

  tr.querySelector(".inline-cost").addEventListener("change", async (e) => {
    const value = Math.max(0, Number(e.target.value || 0));
    if (value === Number(item.costPerItem || 0)) return;
    await savePatch({ costPerItem: value }, { field: "costPerItem" });
  });

  tr.querySelector(".inline-supplier").addEventListener("blur", async (e) => {
    const value = String(e.target.value || "").trim();
    if (value === String(item.supplier || "").trim()) return;
    await savePatch({ supplier: value }, { field: "supplier" });
  });

  tr.querySelector(".inline-notes").addEventListener("blur", async (e) => {
    const value = String(e.target.value || "").trim();
    if (value === String(item.notes || "").trim()) return;
    await savePatch({ notes: value }, { field: "notes" });
  });

  /* removed legacy per-item history button handler */

  tr.querySelector(".deleteInventoryBtn").onclick = () =>
    deleteInventoryItem(item.itemID);

  const swipeZone = tr.querySelector(".inv-item-header") || tr;
addSwipeQuickUse(swipeZone, item.itemID);

  return tr;
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
    deleteInventoryItem,
    addSwipeQuickUse,
  } = ctx;

  ensureInventoryToolbar(el, data, esc, renderAll);

  const q = el.inventorySearch.value.trim().toLowerCase();
  const activeTab = el._inventoryActiveTab || "All";
  const activeDevice = el._inventoryActiveDevice || "all";
  const activeBrand = el._inventoryActiveBrand || "all";
  const activeStock = el._inventoryActiveStock || "all";
  const activeSort = el._inventoryActiveSort || "updated_desc";

  const rows = (Array.isArray(data.inventory) ? data.inventory : [])
    .filter((i) => {
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
  })
    .sort((a, b) => {
      switch (activeSort) {
        case "qty_asc":
          return Number(a.quantity || 0) - Number(b.quantity || 0);

        case "qty_desc":
          return Number(b.quantity || 0) - Number(a.quantity || 0);

        case "name_asc":
          return String(a.itemName || "").localeCompare(String(b.itemName || ""));

        case "name_desc":
          return String(b.itemName || "").localeCompare(String(a.itemName || ""));

        case "updated_desc":
        default: {
          const aTime = new Date(a.lastUpdated || 0).getTime();
          const bTime = new Date(b.lastUpdated || 0).getTime();
          return bTime - aTime;
        }
      }
    });

  el.inventoryBody.innerHTML = "";

  if (!rows.length) {
    el.inventoryBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="12">
          <div class="empty-state">
            <div class="empty-icon">📦</div>
            <div class="empty-title">No Inventory Found</div>
            <div class="muted">Try another tab, device, brand, stock filter, sort option, or search term.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const grouped = rows.reduce((acc, item) => {
    const key = String(item.partType || "Other").trim() || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const groupOrder = [
    "Screen",
    "Battery",
    "Charge Port",
    "Camera",
    "Back Glass",
    "Accessory",
    "Tool",
    "Other",
  ];

  const orderedGroups = [
    ...groupOrder.filter((name) => grouped[name]?.length),
    ...Object.keys(grouped)
      .filter((name) => !groupOrder.includes(name))
      .sort((a, b) => a.localeCompare(b)),
  ];

  orderedGroups.forEach((groupName) => {
    const items = grouped[groupName] || [];
    const isCollapsed = !!el._inventoryCollapsedGroups[groupName];

    const lowCount = items.filter((item) => {
      const qty = Number(item.quantity || 0);
      const threshold = Number(item.threshold || 0);
      return qty > 0 && qty <= threshold;
    }).length;

    const outCount = items.filter((item) => Number(item.quantity || 0) <= 0).length;

    const headerTr = document.createElement("tr");
headerTr.className = "inventory-group-row";
headerTr.innerHTML = `
  <td colspan="12">
    <button
      type="button"
      class="inventory-group-toggle"
      data-group="${esc(groupName)}"
      aria-expanded="${isCollapsed ? "false" : "true"}"
    >
      <span class="inventory-group-caret">${isCollapsed ? "▶" : "▼"}</span>

      <span class="inventory-group-title">${esc(groupName)}</span>

      <span class="inventory-group-meta">
        <span class="inventory-group-badge inventory-group-badge--count">
          ${items.length}
        </span>

        ${lowCount ? `
          <span class="inventory-group-badge inventory-group-badge--low">
            Low: ${lowCount}
          </span>
        ` : ""}

        ${outCount ? `
          <span class="inventory-group-badge inventory-group-badge--out">
            Out: ${outCount}
          </span>
        ` : ""}
      </span>
    </button>
  </td>
`;

    headerTr.querySelector(".inventory-group-toggle").onclick = () => {
      el._inventoryCollapsedGroups[groupName] = !el._inventoryCollapsedGroups[groupName];

      try {
        localStorage.setItem(
          INVENTORY_GROUPS_STATE_KEY,
          JSON.stringify(el._inventoryCollapsedGroups)
        );
      } catch (err) {
        console.error("Failed to persist inventory group state:", err);
      }

      renderAll();
    };

    el.inventoryBody.appendChild(headerTr);

    if (isCollapsed) return;

    items.forEach((item) => {
      const tr = buildInventoryRow(item, ctx, q);
      tr.dataset.group = groupName;
      el.inventoryBody.appendChild(tr);
    });
  });
}