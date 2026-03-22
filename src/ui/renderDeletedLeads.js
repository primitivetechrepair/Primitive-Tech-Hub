// src/ui/renderDeletedLeads.js

export function renderDeletedLeads({
  el,
  data,
  fmtDateShort,
  restoreLead,
}) {
  if (!el.deletedLeadsList) return;

  el.deletedLeadsList.innerHTML = "";

  const deleted = Array.isArray(data.deletedLeads) ? data.deletedLeads : [];

  if (!deleted.length) {
    el.deletedLeadsList.innerHTML = `
      <li class="deleted-leads-empty">No deleted leads.</li>
    `;
    return;
  }

  deleted.forEach((lead) => {
    const li = document.createElement("li");
    li.className = "deleted-lead-card";

    const deletedDate = lead.deletedAt
      ? fmtDateShort(lead.deletedAt)
      : "Unknown date";

    li.innerHTML = `
      <div class="deleted-lead-card__top">
        <span class="deleted-lead-card__badge">Deleted</span>
        <span class="deleted-lead-card__date">${deletedDate}</span>
      </div>

      <div class="deleted-lead-card__title">
        ${escapeHtml(lead.customerName || "Unknown Customer")}
        <span class="customer-history-contact">
          ${escapeHtml(lead.contactNumber || lead.email || "No contact")}
        </span>
      </div>

      <div class="deleted-lead-card__meta">
        ${[
          lead.leadID ? `Lead ID: ${escapeHtml(lead.leadID)}` : "",
          lead.device ? `Device: ${escapeHtml(lead.device)}` : "",
          lead.series ? `Series: ${escapeHtml(lead.series)}` : "",
          lead.repairType ? `Repair: ${escapeHtml(lead.repairType)}` : "",
          lead.status ? `Status: ${escapeHtml(lead.status)}` : "",
        ].filter(Boolean).join(" • ")}
      </div>

      <div class="deleted-lead-card__actions">
        <button type="button" class="restore-btn">Restore Lead</button>
      </div>
    `;

    li.querySelector(".restore-btn").onclick = () => restoreLead(lead.leadID);

    el.deletedLeadsList.appendChild(li);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}