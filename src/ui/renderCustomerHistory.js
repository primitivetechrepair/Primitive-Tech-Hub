// src/ui/renderCustomerHistory.js

export function renderCustomerHistory({
  el,
  data,
  fmtDateShort,
  isAdminEnabled,
  verifyAdminPin,
  toast,
  addAudit,
  persist,
  renderAll,
  createAndSendInvoice,
  downloadInvoicePdf,
}) {
  el.customerHistory.innerHTML = "";

  const byCustomer = {};

  (data.leads || []).forEach((lead) => {
    const name = (lead.customerName || "").trim() || "Unknown";
    const contact = (lead.contactNumber || lead.email || "").trim() || "No contact";
    const key = `${name} (${contact})`;

    byCustomer[key] = byCustomer[key] || [];
    byCustomer[key].push(lead);
  });

  const customers = Object.entries(byCustomer).sort((a, b) => b[1].length - a[1].length);

  if (!customers.length) {
    el.customerHistory.innerHTML = `
      <li class="customer-history-empty">No customer history yet.</li>
    `;
    return;
  }

  customers.forEach(([customer, leads], idx) => {
    const li = document.createElement("li");
    li.className = "customer-history-card";
    li.dataset.customer = customer;

    const repairs = leads
      .slice()
      .sort((a, b) => {
        const da = new Date(a.dateReported || 0).getTime();
        const db = new Date(b.dateReported || 0).getTime();
        return db - da;
      });

    const detailId = `customer-history-details-${idx}`;
    const parsed = parseCustomer(customer);

    const latestLead = repairs[0] || {};
    const lastContact = latestLead?.dateReported;
    const lastContactText = lastContact ? fmtDateShort(lastContact) : "No contact";

    const address = getBestAddress(repairs);

    const repairLeadIDs = new Set(
      repairs.map((lead) => String(lead?.leadID || "").trim()).filter(Boolean)
    );

    const storedInvoices = (Array.isArray(data.invoices) ? data.invoices : [])
      .filter((invoice) => {
        const invoiceLeadID = String(invoice?.leadID || "").trim();
        if (invoiceLeadID && repairLeadIDs.has(invoiceLeadID)) return true;

        const sameCustomer =
          normalizeStr(invoice?.customer) === normalizeStr(parsed.name);

        const sameContact =
          !parsed.contact ||
          normalizeStr(invoice?.contact) === normalizeStr(parsed.contact) ||
          normalizeStr(invoice?.email) === normalizeStr(parsed.contact);

        return sameCustomer && sameContact;
      })
      .slice()
      .sort((a, b) => {
        const da = new Date(a?.completedAt || 0).getTime();
        const db = new Date(b?.completedAt || 0).getTime();
        return db - da;
      });

    const isRepeat = repairs.length > 1;
    const isHighValue = repairs.length >= 3;

    if (isHighValue) li.classList.add("is-high-value");

    li.innerHTML = `
      <div class="customer-history-card__shell">
        <button
          type="button"
          class="customer-history-card__toggle"
          aria-expanded="false"
          aria-controls="${detailId}"
        >
          <div class="customer-history-card__top">
            <span class="customer-history-card__badge">👤 Customer</span>
            <span class="customer-history-card__count">
              ${repairs.length} repair${repairs.length === 1 ? "" : "s"}
            </span>
          </div>

          <div class="customer-history-card__title">
            ${formatCustomerTitle(customer)}
          </div>

          <div class="customer-history-card__badges">
            ${isRepeat ? `<span class="chip">🔁 Repeat</span>` : `<span class="chip">🆕 New</span>`}
            ${isHighValue ? `<span class="chip gold">💎 High Value</span>` : ``}
          </div>

          <div class="customer-history-card__expandHint">Show History</div>
        </button>

        <div class="customer-history-card__body">
          <div class="customer-history-card__row">
            <strong>Latest:</strong>
            <div>${escapeHtml(buildLeadSummary(repairs[0], fmtDateShort))}</div>
          </div>

          <div class="customer-history-card__row">
            <strong>Address:</strong>
            <div>${escapeHtml(address)}</div>
          </div>

          <div class="customer-history-card__row">
            <strong>Last Contact:</strong>
            <div>${escapeHtml(lastContactText)}</div>
          </div>

          <div class="customer-history-card__row customer-history-card__row--actions">
            <strong>Actions:</strong>
            <div class="customer-history-card__row-actions">
              ${buildCustomerActionToolbar(parsed.contact, true)}
            </div>
          </div>
        </div>

        <div id="${detailId}" class="customer-history-card__details is-collapsed">
          ${repairs.map((lead) => `
            <div class="customer-history-detail">
              <div class="customer-history-detail__top">
                <span class="customer-history-detail__device">
                  ${escapeHtml([lead.device, lead.series].filter(Boolean).join(" ") || "Unknown Device")}
                </span>
                <span class="customer-history-detail__date">
                  ${escapeHtml(lead.dateReported ? fmtDateShort(lead.dateReported) : "No date")}
                </span>
              </div>

              <div class="customer-history-detail__meta">
                ${[
                  lead.repairType ? `Repair: ${escapeHtml(lead.repairType)}` : "",
                  lead.status ? `Status: ${escapeHtml(lead.status)}` : "",
                  lead.notes ? `Notes: ${escapeHtml(lead.notes)}` : "",
                ].filter(Boolean).join(" • ")}
              </div>
            </div>
          `).join("")}

          <div class="customer-history-invoices">
            <div class="customer-history-invoices__title">🧾 Invoice History</div>

            ${
              storedInvoices.length
                ? storedInvoices.map((invoice) => `
                  <div class="customer-history-invoice-row">
                    <div class="customer-history-invoice-row__main">
                      <div class="customer-history-invoice-row__id">
                        ${escapeHtml(invoice.invoiceId || "No Invoice ID")}
                      </div>
                      <div class="customer-history-invoice-row__meta">
                        ${[
                          invoice.completedAt ? `Date: ${escapeHtml(fmtDateShort(invoice.completedAt))}` : "",
                          invoice.paymentStatus ? `Status: ${escapeHtml(invoice.paymentStatus)}` : "",
                          `Total: ${escapeHtml(formatCurrency(invoice.charged || 0))}`,
                        ].filter(Boolean).join(" • ")}
                      </div>
                    </div>

                    <button
                      type="button"
                      class="customer-history-toolbar-btn customer-history-download-invoice-btn"
                      data-invoice-id="${escapeHtml(invoice.invoiceId || "")}"
                      title="Download Invoice"
                      aria-label="Download Invoice"
                    >
                      ⬇️
                    </button>
                  </div>
                `).join("")
                : `<div class="customer-history-invoices__empty">No saved invoices yet.</div>`
            }
          </div>
        </div>
      </div>
    `;

    const toggle = li.querySelector(".customer-history-card__toggle");
    const detailsEl = li.querySelector(".customer-history-card__details");
    const hintEl = li.querySelector(".customer-history-card__expandHint");

if (toggle && detailsEl && hintEl) {
  const toggleCard = (e) => {
    if (
      e.target.closest(".customer-history-toolbar") ||
      e.target.closest(".customer-history-download-invoice-btn")
    ) {
      return;
    }

    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    detailsEl.classList.toggle("is-collapsed");
    li.classList.toggle("is-open");

    hintEl.textContent = expanded ? "Show History" : "Hide History";
  };

  toggle.addEventListener("click", toggleCard);

  hintEl.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCard(e);
  });
}

const copyBtn = li.querySelector(".customer-contact-action--copy");
if (copyBtn && parsed.contact && parsed.contact !== "No contact") {
  copyBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(parsed.contact);
      toast("Contact copied.", "success");
    } catch {
      toast("Could not copy contact.", "error");
    }
  });
}

const invoiceBtn = li.querySelector(".invoice-btn");
if (invoiceBtn) {
  invoiceBtn.addEventListener("click", async (e) => {
    e.stopPropagation();

    const latestLead = repairs[0];

    if (!latestLead) {
      toast("No lead found for this customer.", "info");
      return;
    }

    if (typeof createAndSendInvoice !== "function") {
      toast("Invoice action is not wired yet.", "warning");
      return;
    }

    try {
      await createAndSendInvoice(latestLead);
    } catch (err) {
      console.error("Invoice creation failed:", err);
      toast("Could not create invoice.", "error");
    }
  });
}

li.querySelectorAll(".customer-history-download-invoice-btn").forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();

    const invoiceId = btn.dataset.invoiceId;
    const invoice = storedInvoices.find(
      (entry) => String(entry?.invoiceId || "") === String(invoiceId || "")
    );

    if (!invoice) {
      toast("Saved invoice not found.", "warning");
      return;
    }

    if (typeof downloadInvoicePdf !== "function") {
      toast("Invoice download is not wired yet.", "warning");
      return;
    }

    try {
      await downloadInvoicePdf(invoice);
      toast(`Invoice ${invoice.invoiceId} downloaded.`, "success");
    } catch (err) {
      console.error("Invoice download failed:", err);
      toast("Could not download invoice.", "error");
    }
  });
});

    const deleteBtn = li.querySelector(".customer-history-delete-btn");
    if (deleteBtn) {
      deleteBtn.onclick = async (e) => {
        e.stopPropagation();

        const ok = await verifyAdminPin();
        if (!ok) return toast("Invalid Admin PIN.");

        data.leads = (data.leads || []).filter((lead) => {
          const name = (lead.customerName || "").trim() || "Unknown";
          const contact = (lead.contactNumber || lead.email || "").trim() || "No contact";
          return `${name} (${contact})` !== customer;
        });

        addAudit("customer_history_deleted", {
          customer,
          userAction: "admin_delete",
        });

        await persist();
        renderAll();
      };
    }

    el.customerHistory.appendChild(li);
  });
}

function buildLeadSummary(lead, fmtDateShort) {
  const device = [lead?.device, lead?.series].filter(Boolean).join(" ") || "Unknown Device";
  const repair = lead?.repairType || "Unknown Repair";
  const date = lead?.dateReported ? fmtDateShort(lead.dateReported) : "No date";
  return `${device} • ${repair} • ${date}`;
}

function getBestAddress(repairs = []) {
  for (const lead of repairs) {
    const parts = [
      lead?.address,
      lead?.customerAddress,
      lead?.streetAddress,
      lead?.fullAddress,
      [lead?.street, lead?.city, lead?.state, lead?.zip].filter(Boolean).join(", "),
    ]
      .map((x) => String(x || "").trim())
      .filter(Boolean);

    if (parts.length) return parts[0];
  }

  return "No address";
}

function parseCustomer(customer) {
  const match = customer.match(/^(.*)\s\((.*)\)$/);
  if (!match) return { name: customer, contact: "" };

  return {
    name: match[1],
    contact: match[2],
  };
}

function formatCustomerTitle(customer) {
  const match = customer.match(/^(.*)\s\((.*)\)$/);

  if (!match) return escapeHtml(customer);

  const name = match[1];
  const contact = match[2];

  return `
    ${escapeHtml(name)}
    <span class="customer-history-contact">${escapeHtml(contact)}</span>
  `;
}

function buildCustomerActionToolbar(contact, showDelete = false) {
  const trimmed = String(contact || "").trim();
  const cleanNumber = trimmed.replace(/[^\d]/g, "");
  const isEmail = trimmed.includes("@");

  const actions = [];

  if (!isEmail && cleanNumber) {
    const googleVoiceCallHref = `https://voice.google.com/u/0/r/calls?a=${cleanNumber}`;
    const googleVoiceTextHref = `https://voice.google.com/u/0/messages?pli=1&text=${cleanNumber}`;

    actions.push(`
      <a
        href="${googleVoiceCallHref}"
        target="_blank"
        rel="noopener noreferrer"
        class="customer-history-toolbar-btn customer-contact-action customer-contact-action--call"
        title="Call"
        aria-label="Call"
      >📞</a>
    `);

    actions.push(`
      <a
        href="${googleVoiceTextHref}"
        target="_blank"
        rel="noopener noreferrer"
        class="customer-history-toolbar-btn customer-contact-action customer-contact-action--text"
        title="Text"
        aria-label="Text"
      >💬</a>
    `);
  }

  if (trimmed && trimmed !== "No contact") {
    actions.push(`
      <button
        type="button"
        class="customer-history-toolbar-btn customer-contact-action customer-contact-action--copy"
        title="Copy"
        aria-label="Copy"
      >📋</button>
    `);
  }

  actions.push(`
    <button
      type="button"
      class="customer-history-toolbar-btn invoice-btn"
      title="Invoice"
      aria-label="Invoice"
    >🧾</button>
  `);

  if (showDelete) {
    actions.push(`
      <button
        type="button"
        class="customer-history-toolbar-btn delete-btn customer-history-delete-btn"
        title="Delete"
        aria-label="Delete"
      >🗑️</button>
    `);
  }

  return `
    <div class="customer-history-toolbar ${showDelete ? "has-delete" : ""}">
      ${actions.join("")}
    </div>
  `;
}

function normalizeStr(value) {
  return String(value || "").trim().toLowerCase();
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
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