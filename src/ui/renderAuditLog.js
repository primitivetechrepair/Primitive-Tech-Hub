// src/ui/renderAuditLog.js
const AUDIT_GROUPS_STATE_KEY = "primitiveTechHubAuditGroupState";

export function renderAuditLog(ctx) {
    const {
    el,
    data,
    fmtDate,
    toast,
    isAdminEnabled,
    verifyAdminPin,
    auditService,
    persist,
    renderAll,
    renderAuditLog,
  } = ctx;

  el.auditLog.innerHTML = "";

  const entries = data.auditLog.slice(0, 50).reverse();

  if (!entries.length) {
    el.auditLog.innerHTML = `
      <li class="audit-log-empty">No stock history yet.</li>
    `;
    return;
  }

  if (!el._auditCollapsedGroups) {
    try {
      const saved = JSON.parse(
        localStorage.getItem(AUDIT_GROUPS_STATE_KEY) || "{}"
      );

      el._auditCollapsedGroups =
        saved && typeof saved === "object" ? saved : {};
    } catch {
      el._auditCollapsedGroups = {};
    }
  }

  const defaultAuditCollapsedGroups = {
    Today: false,
    Yesterday: true,
    "This Week": true,
    Earlier: true,
  };

  Object.keys(defaultAuditCollapsedGroups).forEach((groupName) => {
    if (!(groupName in el._auditCollapsedGroups)) {
      el._auditCollapsedGroups[groupName] = defaultAuditCollapsedGroups[groupName];
    }
  });

  const groupedEntries = entries.reduce((acc, entry) => {
    const group = getDateGroup(entry.at);
    if (!acc[group]) acc[group] = [];
    acc[group].push(entry);
    return acc;
  }, {});

  const groupOrder = ["Today", "Yesterday", "This Week", "Earlier"];
  const orderedGroups = groupOrder.filter((group) => groupedEntries[group]?.length);

  orderedGroups.forEach((group) => {
    const groupItems = groupedEntries[group] || [];
    const isCollapsed = !!el._auditCollapsedGroups[group];
    const groupCount = groupItems.length;

    const groupEl = document.createElement("li");
    groupEl.className = "audit-log-group";
    groupEl.innerHTML = `
      <button
        type="button"
        class="audit-log-group-toggle"
        data-group="${escapeHtml(group)}"
        aria-expanded="${isCollapsed ? "false" : "true"}"
      >
        <span class="audit-log-group-toggle__caret">${isCollapsed ? "▶" : "▼"}</span>
        <span class="audit-log-group-toggle__label">${group}</span>
        <span class="audit-log-group-toggle__count">${groupCount}</span>
      </button>
    `;

    groupEl.querySelector(".audit-log-group-toggle").onclick = () => {
      el._auditCollapsedGroups[group] = !el._auditCollapsedGroups[group];

      try {
        localStorage.setItem(
          AUDIT_GROUPS_STATE_KEY,
          JSON.stringify(el._auditCollapsedGroups)
        );
      } catch (err) {
        console.error("Failed to persist audit group state:", err);
      }

      renderAuditLog(ctx);
    };

    el.auditLog.appendChild(groupEl);

    if (isCollapsed) return;

    groupItems.forEach((a) => {
      const li = document.createElement("li");
      li.className = `audit-log-card inventory-card ${getAuditTypeClass(a.action)}`;

    const actionLabel = formatActionLabel(a.action);
    const title = buildAuditTitle(a);
    const meta = buildAuditMeta(a);
    const details = buildAuditDetails(a);

const summaryRows = buildAuditSummaryRows(a);

li.innerHTML = `
  <div class="audit-log-card__shell">

    <div class="audit-log-card__top">
      <span class="audit-log-card__badge">${actionLabel}</span>
      <span class="audit-log-card__date">${fmtDate(a.at)}</span>
    </div>

    <div class="audit-log-card__title">${title}</div>

    ${
      summaryRows
        ? `<div class="audit-log-card__summary">${summaryRows}</div>`
        : ""
    }

    ${meta ? `<div class="audit-log-card__meta">${meta}</div>` : ""}

    ${
      details
        ? `
        <div class="audit-log-card__details hidden">
          ${details}
        </div>
        <div class="audit-log-card__expandHint">Click to view more</div>
      `
        : ""
    }

  </div>
`;

if (details) {
  const hintEl = li.querySelector(".audit-log-card__expandHint");
  const detailsEl = li.querySelector(".audit-log-card__details");

  hintEl.addEventListener("click", (e) => {
    e.stopPropagation(); // prevents parent click issues

    li.classList.toggle("is-open");

    if (detailsEl) {
      detailsEl.classList.toggle("hidden");
    }

    hintEl.textContent = li.classList.contains("is-open")
      ? "Click to collapse"
      : "Click to view more";
  });
}

    if (true) {
      const actions = document.createElement("div");
      actions.className = "audit-log-card__actions";
actions.style.display = "flex";
actions.style.justifyContent = "flex-end";
actions.style.marginTop = "10px";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Delete";
      btn.className = "tiny delete-btn audit-delete-btn";

      btn.onclick = async () => {
        const confirmed = window.confirm("Delete this stock history entry?");
        if (!confirmed) return;

        const realIndex = data.auditLog.findIndex((entry) => {
          return (
            entry &&
            entry.at === a.at &&
            entry.action === a.action &&
            String(entry.itemID || "") === String(a.itemID || "") &&
            String(entry.itemName || "") === String(a.itemName || "") &&
            String(entry.leadID || "") === String(a.leadID || "") &&
            String(entry.qty ?? "") === String(a.qty ?? "") &&
            String(entry.delta ?? "") === String(a.delta ?? "")
          );
        });

        if (realIndex === -1) {
          return toast("Could not find this stock history entry.");
        }

        const removed = auditService?.removeAt(realIndex, { persistNow: true });

        if (!removed) {
          return toast("Could not delete this stock history entry.");
        }

        if (typeof renderAll === "function") {
          renderAll();
        } else {
          renderAuditLog(ctx);
        }

        toast("Stock history entry deleted.");
      };

      actions.appendChild(btn);
      li.appendChild(actions);
    }

      el.auditLog.appendChild(li);
    });
  });
}

function formatActionLabel(action) {
  const map = {
    inventory_added: "➕ Added",
    inventory_used: "➖ Used",
    inventory_adjusted: "✏️ Adjusted",
    inventory_updated: "🔄 Updated",
    inventory_deleted: "🗑️ Deleted",
  };

  return map[action] || `📌 ${prettify(action || "Activity")}`;
}

function buildAuditTitle(a) {
  const qty = Number(a.delta ?? 0);

  switch (a.action) {
    case "inventory_added":
      return `Added <strong>${a.qty ?? "-"}</strong> ${a.itemName || a.itemID || "item"}`;

    case "inventory_used":
      return `Used <strong>${Math.abs(qty) || 1}</strong>${a.itemName ? ` • ${a.itemName}` : a.itemID ? ` • ${a.itemID}` : ""}`;

    case "inventory_adjusted":
      return `Adjusted quantity ${qty ? `<strong>${qty > 0 ? "+" : ""}${qty}</strong>` : ""}`;

    case "inventory_updated":
      return `Updated ${a.itemName || a.itemID || "item"}`;

    case "inventory_deleted":
      return `Deleted ${a.itemName || a.itemID || "item"}`;

    default:
      return prettify(a.action || "Stock activity");
  }
}

function buildAuditMeta(a) {
  const parts = [];

  if (a.itemID) parts.push(`Item ID: ${a.itemID}`);
  if (a.qty !== undefined) parts.push(`Qty: ${a.qty}`);
  if (a.leadID) parts.push(`Lead: ${a.leadID}`);
  if (a.customerID) parts.push(`Customer: ${a.customerID}`);

  return parts.join(" • ");
}

function buildAuditSummaryRows(a) {
  const rows = [];

  const qty = a.qty !== undefined && a.qty !== null && a.qty !== ""
    ? String(a.qty)
    : null;

  const delta =
    a.delta !== undefined && a.delta !== null && a.delta !== ""
      ? `${Number(a.delta) > 0 ? "+" : ""}${a.delta}`
      : null;

  const source = a.userAction ? prettify(a.userAction) : null;

  if (a.itemName || a.itemID) {
    rows.push(`
      <div class="audit-log-card__summaryRow">
        <span class="audit-log-card__summaryLabel">Part</span>
        <span class="audit-log-card__summaryValue">${escapeHtml(a.itemName || a.itemID || "-")}</span>
      </div>
    `);
  }

  if (qty !== null) {
    rows.push(`
      <div class="audit-log-card__summaryRow">
        <span class="audit-log-card__summaryLabel">Qty</span>
        <span class="audit-log-card__summaryValue">${escapeHtml(qty)}</span>
      </div>
    `);
  }

  if (delta !== null) {
    rows.push(`
      <div class="audit-log-card__summaryRow">
        <span class="audit-log-card__summaryLabel">Change</span>
        <span class="audit-log-card__summaryValue">${escapeHtml(delta)}</span>
      </div>
    `);
  }

  if (a.leadID) {
    rows.push(`
      <div class="audit-log-card__summaryRow">
        <span class="audit-log-card__summaryLabel">Lead</span>
        <span class="audit-log-card__summaryValue">${escapeHtml(a.leadID)}</span>
      </div>
    `);
  }

  if (source) {
    rows.push(`
      <div class="audit-log-card__summaryRow">
        <span class="audit-log-card__summaryLabel">Source</span>
        <span class="audit-log-card__summaryValue">${escapeHtml(source)}</span>
      </div>
    `);
  }

  return rows.join("");
}

function buildAuditDetails(a) {
  const parts = [];

  if (a.userAction) parts.push(`<div><strong>Source:</strong> ${prettify(a.userAction)}</div>`);
  if (a.notes) parts.push(`<div><strong>Notes:</strong> ${escapeHtml(a.notes)}</div>`);

  const extras = Object.entries(a || {})
    .filter(([key]) =>
      ![
        "action",
        "at",
        "itemID",
        "itemName",
        "qty",
        "delta",
        "leadID",
        "customerID",
        "userAction",
        "notes",
      ].includes(key)
    )
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => {
      const safeValue =
        typeof value === "object"
          ? escapeHtml(JSON.stringify(value))
          : escapeHtml(String(value));
      return `<div><strong>${prettify(key)}:</strong> ${safeValue}</div>`;
    });

  return [...parts, ...extras].join("");
}

function getAuditTypeClass(action) {
  const map = {
    inventory_added: "is-added",
    inventory_used: "is-used",
    inventory_adjusted: "is-adjusted",
    inventory_updated: "is-updated",
    inventory_deleted: "is-deleted",
  };

  return map[action] || "is-default";
}

function getDateGroup(dateValue) {
  if (!dateValue) return "Earlier";

  const input = new Date(dateValue);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfInput = new Date(input.getFullYear(), input.getMonth(), input.getDate());

  const diffDays = Math.round((startOfToday - startOfInput) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "This Week";
  return "Earlier";
}

function prettify(str) {
  return String(str)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}