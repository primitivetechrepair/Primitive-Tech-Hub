// src/ui/renderAuditLog.js
export function renderAuditLog(ctx) {
  const {
    el,
    data,
    fmtDate,
    toast,
    isAdminEnabled,
    verifyAdminPin,
    auditService,
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

  let lastGroup = "";

  entries.forEach((a) => {
    const group = getDateGroup(a.at);

    if (group !== lastGroup) {
      const groupEl = document.createElement("li");
      groupEl.className = "audit-log-group";
      groupEl.textContent = group;
      el.auditLog.appendChild(groupEl);
      lastGroup = group;
    }

    const li = document.createElement("li");
    li.className = `audit-log-card ${getAuditTypeClass(a.action)}`;

    const actionLabel = formatActionLabel(a.action);
    const title = buildAuditTitle(a);
    const meta = buildAuditMeta(a);
    const details = buildAuditDetails(a);

li.innerHTML = `
  <div class="audit-log-card__shell">

    <div class="audit-log-card__top">
      <span class="audit-log-card__badge">${actionLabel}</span>
      <span class="audit-log-card__date">${fmtDate(a.at)}</span>
    </div>

    <div class="audit-log-card__title">${title}</div>

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

    if (isAdminEnabled()) {
      const actions = document.createElement("div");
      actions.className = "audit-log-card__actions";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Delete";
      btn.className = "tiny delete-btn";

      btn.onclick = async () => {
        const ok = await verifyAdminPin();
        if (!ok) return toast("Invalid Admin PIN.");

        const realIndex = data.auditLog.indexOf(a);
        if (realIndex === -1) return;

        auditService.removeAt(realIndex, { persistNow: true });
        renderAuditLog(ctx);
      };

      actions.appendChild(btn);
      li.querySelector(".audit-log-card__shell").appendChild(actions);
    }

    el.auditLog.appendChild(li);
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