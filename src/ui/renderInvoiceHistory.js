// src/ui/renderInvoiceHistory.js
export function renderInvoiceHistory(ctx) {
  const { el, data, addListItem, fmtDateShort, fmtMoney } = ctx;

  if (!el.invoiceHistoryList) return;

  el.invoiceHistoryList.innerHTML = "";

  const invoices = Array.isArray(data.invoices) ? data.invoices : [];

  if (!invoices.length) {
    addListItem(el.invoiceHistoryList, "No invoices yet.");
    return;
  }

  invoices.slice(0, 20).forEach((inv) => {
    addListItem(
      el.invoiceHistoryList,
      `${inv.invoiceId} • ${inv.customer || "Unknown"} • ${inv.repair || "Repair"} • ${fmtMoney(inv.charged || 0)} • ${fmtDateShort(inv.completedAt)}`
    );
  });
}