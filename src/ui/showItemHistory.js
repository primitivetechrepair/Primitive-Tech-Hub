// src/ui/showItemHistory.js
export function showItemHistory(ctx) {
  const { el, data, fmtDate, itemID } = ctx;

  el.itemHistoryTitle.textContent = `History for ${itemID}`;
  el.itemHistoryList.innerHTML = "";

  const entries = data.auditLog
    .filter((a) => a.itemID === itemID)
    .slice(0, 50)
    .reverse();

  if (!entries.length) {
    el.itemHistoryList.innerHTML = `
      <li class="item-history-empty">No item history yet.</li>
    `;
    return;
  }

  let lastGroup = "";

  entries.forEach((a, idx) => {
    const group = getDateGroup(a.at);

    if (group !== lastGroup) {
      const groupEl = document.createElement("li");
      groupEl.className = "item-history-group";
      groupEl.textContent = group;
      el.itemHistoryList.appendChild(groupEl);
      lastGroup = group;
    }

    const li = document.createElement("li");
    li.className = `item-history-card ${getHistoryTypeClass(a.action)}`;

    const actionLabel = formatActionLabel(a.action);
    const title = buildHistoryTitle(a);
    const meta = buildHistoryMeta(a);
    const details = buildHistoryDetails(a);
    const detailId = `item-history-details-${idx}`;

    li.innerHTML = `
      <button
        type="button"
        class="item-history-card__toggle"
        aria-expanded="false"
        aria-controls="${detailId}"
      >
        <div class="item-history-card__top">
          <span class="item-history-card__badge">${actionLabel}</span>
          <span class="item-history-card__date">${fmtDate(a.at)}</span>
        </div>

        <div class="item-history-card__title">${title}</div>

        ${meta ? `<div class="item-history-card__meta">${meta}</div>` : ""}

        ${details ? `
          <div id="${detailId}" class="item-history-card__details" hidden>
            ${details}
          </div>
        ` : ""}

        ${details ? `
          <div class="item-history-card__expandHint">Click to view more</div>
        ` : ""}
      </button>
    `;

    const toggle = li.querySelector(".item-history-card__toggle");
    const detailsEl = li.querySelector(".item-history-card__details");

    if (toggle && detailsEl) {
      toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        detailsEl.hidden = expanded;
      });
    }

    el.itemHistoryList.appendChild(li);
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

function buildHistoryTitle(a) {
  const qty = Number(a.delta ?? 0);

  switch (a.action) {
    case "inventory_added":
      return `Added <strong>${a.qty ?? "-"}</strong> ${a.itemName || "item"}`;

    case "inventory_used":
      return `Used <strong>${Math.abs(qty) || 1}</strong>${a.itemName ? ` • ${a.itemName}` : ""}`;

    case "inventory_adjusted":
      return `Adjusted quantity ${qty ? `<strong>${qty > 0 ? "+" : ""}${qty}</strong>` : ""}`;

    case "inventory_updated":
      return `Updated ${a.itemName || "item"}`;

    case "inventory_deleted":
      return `Deleted ${a.itemName || "item"}`;

    default:
      return prettify(a.action || "Item activity");
  }
}

function buildHistoryMeta(a) {
  const parts = [];

  if (a.itemID) parts.push(`Item ID: ${a.itemID}`);
  if (a.qty !== undefined) parts.push(`Qty: ${a.qty}`);
  if (a.leadID) parts.push(`Lead: ${a.leadID}`);

  return parts.join(" • ");
}

function buildHistoryDetails(a) {
  const parts = [];

  if (a.userAction) parts.push(`<div><strong>Source:</strong> ${prettify(a.userAction)}</div>`);
  if (a.notes) parts.push(`<div><strong>Notes:</strong> ${escapeHtml(a.notes)}</div>`);

  const extras = Object.entries(a || {})
    .filter(([key]) => !["action", "at", "itemID", "qty", "leadID", "userAction", "notes", "itemName", "delta"].includes(key))
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

function getHistoryTypeClass(action) {
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