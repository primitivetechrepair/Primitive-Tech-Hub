// src/ui/renderScanLeadOptions.js
export function renderScanLeadOptions(ctx) {
  const { el, data, esc } = ctx;

  if (!el.scanLeadSelect) return;

  el.scanLeadSelect.innerHTML =
    '<option value="">Select Lead</option>' +
    data.leads
      .map(
        (l) =>
          `<option value="${esc(l.leadID)}">${esc(l.leadID)} - ${esc(
            l.customerName
          )}</option>`
      )
      .join("");
}