// src/ui/renderLeads.js
export function renderLeads(ctx) {
  const {
    el,
    data,
    esc,
    toast,
    isUnlocked,
    renderAll,

    // leads-specific helpers/constants
    ensureLeadPartsShape,
    leadPartsCost,
    STATUS_ORDER,
    fmtMoney,
    fmtDateShort,
    aiSuggestion,

    // actions/services used by events
    leadsService,
    queueCloudSync,
    upsertLeadToCloud,
    persist,
    addAudit,
    createAndSendInvoice,
    addPartToLead,
    removePartFromLead,
    deleteLead,
  } = ctx;

  const f = el.statusFilter.value;
  const deviceFilter = el.deviceFilter.value;
  const q = el.leadSearch.value.trim().toLowerCase();

  const devices = [...new Set((data.leads || []).map((lead) => lead.device).filter(Boolean))];
  el.deviceFilter.innerHTML =
    '<option value="all">All Devices</option>' +
    devices
      .map((d) => `<option ${deviceFilter === d ? "selected" : ""}>${esc(d)}</option>`)
      .join("");

  const leads = (data.leads || []).filter((lead) => {
    ensureLeadPartsShape(lead);

    const parts = (lead.inventoryUsed || [])
      .map((id) => data.inventory.find((i) => i.itemID === id)?.itemName || id)
      .join(" ");

    const haystack = [
      lead.leadID,
      lead.customerName,
      lead.contactNumber,
      lead.email,
      lead.address,
      lead.device,
      lead.series,
      lead.repairType,
      lead.status,
      lead.notes,
      parts,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return (
      (f === "all" || lead.status === f) &&
      (deviceFilter === "all" || lead.device === deviceFilter) &&
      haystack.includes(q)
    );
  });

  el.leadsBody.innerHTML = "";

  if (!leads.length) {
    el.leadsBody.innerHTML = `
      <div class="empty-state-row">
        <div class="empty-state">
          <div class="empty-icon">🛠️</div>
          <div class="empty-title">No Repair Leads Yet</div>
          <div class="muted">Create a lead to start tracking repairs.</div>
        </div>
      </div>
    `;
    return;
  }

  leads.forEach((lead) => {
    ensureLeadPartsShape(lead);

    const used = (lead.inventoryUsed || [])
      .map((id) => {
        const item = data.inventory.find((i) => i.itemID === id);
        const name = item?.itemName || id;
        const qty = lead.inventoryUsedQty?.[id] || 1;

        return `
          <div class="lead-part">
            <span>${esc(name)} ${qty > 1 ? `(${qty})` : ""}</span>
            <button 
              class="tiny removePartBtn premium-remove-btn" 
              data-item="${esc(id)}" 
              title="Remove part"
            >
              <span class="icon">🗑️</span>
            </button>
          </div>
        `;
      })
      .join("");

    const partsCost = leadPartsCost(lead);
const repairTotal = Number(lead.repairCost || 0);
const labor = Number(lead.laborAmount || 0);
const profit = repairTotal - partsCost;

    const files =
      (lead.files || [])
        .map(
          (fmeta) =>
            `<a href="${fmeta.data}" download="${esc(fmeta.name)}">${esc(fmeta.name)}</a>`
        )
        .join("<br/>") || "-";

    const mapAddress = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      lead.address || ""
    )}`;

    const tr = document.createElement("div");
tr.classList.add("lead-card-wrapper");

    if (lead.justRestored) {
      tr.classList.add("lead-just-restored");
    }

    tr.innerHTML = `
    <div class="lead-card">

      <div class="lead-card-header">
        <div class="lead-card-title copy-lead-id" title="Click to copy">
          ${esc(lead.customerName || "Unknown")}
          <span class="lead-card-id">
            ${esc(lead.leadID)}
            ${lead.justRestored ? ` <span class="lead-restored-badge">RESTORED</span>` : ""}
          </span>
        </div>

        <div class="lead-card-actions">
          <button class="tiny lead-action-btn copyCustomerBtn" title="Copy Info">📋</button>
          <button class="tiny lead-action-btn callCustomerBtn" title="Call">📞</button>
          <button class="tiny lead-action-btn textCustomerBtn" title="Text">💬</button>
          <button class="tiny lead-action-btn invoiceBtn" title="Invoice">🧾</button>
          <button class="tiny lead-action-btn delete-btn deleteLeadBtn" title="Delete">🗑️</button>
        </div>
      </div>

      <div class="lead-card-body">
        <div class="lead-card-row">
          <strong>Device:</strong> ${esc(lead.device || "-")} ${esc(lead.series || "")}
        </div>

        <div class="lead-card-row">
          <strong>Repair:</strong> ${esc(lead.repairType || "-")}
        </div>

        <div class="lead-card-row">
          <strong>Phone:</strong> ${esc(lead.contactNumber || "-")}
        </div>

        <div class="lead-card-row">
          <strong>Email:</strong> ${esc(lead.email || "-")}
        </div>

        <div class="lead-card-row">
          <strong>Address:</strong>
          <a class="address-link" href="${mapAddress}" target="_blank" rel="noopener">
            ${esc(lead.address || "-")}
          </a>
        </div>

        <div class="lead-card-row">
          <strong>Status:</strong>
          <select class="leadStatusSel">
            ${STATUS_ORDER.map(
              (s) =>
                `<option value="${esc(s)}" ${lead.status === s ? "selected" : ""}>${esc(s)}</option>`
            ).join("")}
          </select>
        </div>

        <div class="lead-card-row">
          <strong>Repair Cost:</strong>
          <input
            type="number"
            class="repairCostInput"
            value="${Number(lead.repairCost ?? lead.chargedAmount ?? 0)}"
            min="0"
            step="0.01"
          />
        </div>

        <div class="lead-card-row">
          <strong>Labor:</strong>
          <input
            type="number"
            class="laborAmountInput"
            value="${Number(lead.laborAmount || 0)}"
            min="0"
            step="0.01"
          />
        </div>

        <div class="lead-card-row">
          <strong>Payment Method:</strong>
          <select class="paymentMethodSel">
            <option value="Cash" ${lead.paymentMethod === "Cash" ? "selected" : ""}>Cash</option>
            <option value="Zelle Transfer" ${lead.paymentMethod === "Zelle Transfer" ? "selected" : ""}>Zelle Transfer</option>
            <option value="CashApp" ${lead.paymentMethod === "CashApp" ? "selected" : ""}>CashApp</option>
          </select>
        </div>

        <div class="lead-card-row">
          <strong>Payment Status:</strong>
          <select class="paymentStatusSel">
            <option value="Unpaid" ${lead.paymentStatus === "Unpaid" ? "selected" : ""}>Unpaid</option>
            <option value="Partially Paid" ${lead.paymentStatus === "Partially Paid" ? "selected" : ""}>Partially Paid</option>
            <option value="Paid" ${lead.paymentStatus === "Paid" ? "selected" : ""}>Paid</option>
          </select>
        </div>

        <div class="lead-card-row">
          <strong>Parts:</strong>
          <div class="lead-parts-list">${used || "-"}</div>
          <button class="tiny lead-action-btn part-btn useForRepairBtn" title="Add Part">🧩 Add Part</button>
        </div>

        <div class="lead-card-row">
          <strong>Files:</strong>
          <div>${files}</div>
        </div>

        <div class="lead-card-row">
          <strong>Date Reported:</strong>
          ${
            lead.dateReported
              ? String(lead.dateReported).split("-").length === 3
                ? `${String(lead.dateReported).split("-")[1]}/${String(lead.dateReported).split("-")[2]}/${String(lead.dateReported).split("-")[0]}`
                : fmtDateShort(lead.dateReported)
              : "-"
          }
        </div>

        <div class="lead-card-row">
          <strong>Profit:</strong>
          ${fmtMoney(profit)}
          <div class="muted">${esc(aiSuggestion(lead.issueDescription, lead.device))}</div>
        </div>

        <div class="lead-card-row">
          <strong>Notes:</strong>
          ${esc(lead.notes || "-")}
          <div class="muted">Updated: ${fmtDateShort(lead.lastUpdated || lead.dateReported)}</div>
        </div>
      </div>

    </div>
`;

    tr.querySelector(".leadStatusSel").addEventListener("change", async (e) => {
      const newStatus = e.target.value;
      const prevStatus = lead.status;

      if (!isUnlocked()) {
        e.target.value = prevStatus;
        toast(el, "Locked: log in to update lead status.", "error");
        return;
      }

      lead.status = newStatus;
      lead.lastUpdated = new Date().toISOString();

      addAudit("lead_status_updated", {
        leadID: lead.leadID,
        from: prevStatus,
        to: newStatus,
        userAction: "status_change",
      });

      try {
        await persist();

        queueCloudSync("lead_status_update", {
          leadID: lead.leadID,
          status: newStatus,
        });

        try {
          await upsertLeadToCloud(lead);
        } catch (err) {
          console.error("Lead status cloud sync failed:", err);
          toast(el, "Lead status saved locally, but cloud sync failed.", "warning");
        }

        renderAll();
        toast(el, `Lead ${lead.leadID} updated to ${newStatus}.`, "success");
      } catch (err) {
        console.error("Lead status persist failed:", err);
        lead.status = prevStatus;
        e.target.value = prevStatus;
        toast(el, "Failed to update lead status.", "error");
      }
    });

    tr.querySelector(".repairCostInput").addEventListener("change", async (e) => {
      const newValue = Number(e.target.value || 0);
      const prevValue = Number(lead.repairCost ?? lead.chargedAmount ?? 0);

      if (!isUnlocked()) {
        e.target.value = prevValue;
        toast(el, "Locked: log in to update repair cost.", "error");
        return;
      }

      lead.repairCost = newValue;
      lead.lastUpdated = new Date().toISOString();

      addAudit("lead_repair_cost_updated", {
        leadID: lead.leadID,
        repairCost: newValue,
        userAction: "repair_cost_change",
      });

      try {
        await persist();

        queueCloudSync("lead_repair_cost_update", {
          leadID: lead.leadID,
          repairCost: newValue,
        });

        try {
          await upsertLeadToCloud(lead);
        } catch (err) {
          console.error("Repair cost cloud sync failed:", err);
          toast(el, "Repair cost saved locally, but cloud sync failed.", "warning");
        }

        renderAll();
      } catch (err) {
        console.error("Repair cost persist failed:", err);
        lead.repairCost = prevValue;
        e.target.value = prevValue;
        toast(el, "Repair cost update failed.", "error");
      }
    });

    tr.querySelector(".laborAmountInput").addEventListener("change", async (e) => {
      const newValue = Number(e.target.value || 0);
      const prevValue = Number(lead.laborAmount || 0);

      if (!isUnlocked()) {
        e.target.value = prevValue;
        toast(el, "Locked: log in to update labor.", "error");
        return;
      }

      lead.laborAmount = newValue;
      lead.lastUpdated = new Date().toISOString();

      addAudit("lead_labor_updated", {
        leadID: lead.leadID,
        laborAmount: newValue,
        userAction: "labor_amount_change",
      });

      try {
        await persist();

        queueCloudSync("lead_labor_amount_update", {
          leadID: lead.leadID,
          laborAmount: newValue,
        });

        try {
          await upsertLeadToCloud(lead);
        } catch (err) {
          console.error("Labor cloud sync failed:", err);
          toast(el, "Labor saved locally, but cloud sync failed.", "warning");
        }

        renderAll();
      } catch (err) {
        console.error("Labor persist failed:", err);
        lead.laborAmount = prevValue;
        e.target.value = prevValue;
        toast(el, "Labor update failed.", "error");
      }
    });

    tr.querySelector(".paymentMethodSel").addEventListener("change", async (e) => {
      const newPaymentMethod = e.target.value;
      const prevPaymentMethod = lead.paymentMethod;

      if (!isUnlocked()) {
        e.target.value = prevPaymentMethod || "Cash";
        toast(el, "Locked: log in to update payment method.", "error");
        return;
      }

      lead.paymentMethod = newPaymentMethod;
      lead.lastUpdated = new Date().toISOString();

      addAudit("lead_payment_method_updated", {
        leadID: lead.leadID,
        paymentMethod: newPaymentMethod,
        userAction: "payment_method_change",
      });

      try {
        await persist();

        queueCloudSync("lead_payment_method_update", {
          leadID: lead.leadID,
          paymentMethod: newPaymentMethod,
        });

        try {
          await upsertLeadToCloud(lead);
        } catch (err) {
          console.error("Payment method cloud sync failed:", err);
          toast(el, "Payment method saved locally, but cloud sync failed.", "warning");
        }

        renderAll();
      } catch (err) {
        console.error("Payment method persist failed:", err);
        lead.paymentMethod = prevPaymentMethod;
        e.target.value = prevPaymentMethod || "Cash";
        toast(el, "Payment method update failed.", "error");
      }
    });

    tr.querySelector(".paymentStatusSel").addEventListener("change", async (e) => {
      const newPaymentStatus = e.target.value;
      const prevPaymentStatus = lead.paymentStatus;

      if (!isUnlocked()) {
        e.target.value = prevPaymentStatus || "Unpaid";
        toast(el, "Locked: log in to update payment status.", "error");
        return;
      }

      lead.paymentStatus = newPaymentStatus;
      lead.lastUpdated = new Date().toISOString();

      addAudit("lead_payment_status_updated", {
        leadID: lead.leadID,
        paymentStatus: newPaymentStatus,
        userAction: "payment_status_change",
      });

      try {
        await persist();

        queueCloudSync("lead_payment_status_update", {
          leadID: lead.leadID,
          paymentStatus: newPaymentStatus,
        });

        try {
          await upsertLeadToCloud(lead);
        } catch (err) {
          console.error("Payment status cloud sync failed:", err);
          toast(el, "Payment status saved locally, but cloud sync failed.", "warning");
        }

        renderAll();
      } catch (err) {
        console.error("Payment status persist failed:", err);
        lead.paymentStatus = prevPaymentStatus;
        e.target.value = prevPaymentStatus || "Unpaid";
        toast(el, "Payment status update failed.", "error");
      }
    });

    tr.querySelector(".useForRepairBtn").onclick = () => addPartToLead(lead.leadID);
    tr.querySelector(".invoiceBtn").onclick = () => createAndSendInvoice(lead);
    tr.querySelector(".deleteLeadBtn").onclick = () => deleteLead(lead.leadID);

    tr.querySelector(".copyCustomerBtn").onclick = async (e) => {
      e.stopPropagation();

      const customerInfo = [
        `Lead ID: ${lead.leadID || "-"}`,
        `Name: ${lead.customerName || "-"}`,
        `Phone: ${lead.contactNumber || "-"}`,
        `Email: ${lead.email || "-"}`,
        `Address: ${lead.address || "-"}`,
        `Device: ${lead.device || "-"}`,
        `Series: ${lead.series || "-"}`,
        `Repair: ${lead.repairType || "-"}`,
      ].join("\n");

      try {
        await navigator.clipboard.writeText(customerInfo);
        toast(el, "Customer info copied.", "success");
      } catch {
        toast(el, "Copy failed.", "error");
      }
    };

    tr.querySelector(".callCustomerBtn").onclick = () => {
      const digits = String(lead.contactNumber || "").replace(/\D/g, "");
      if (!digits) {
        toast(el, "No customer phone number found.", "warning");
        return;
      }

      window.open(`tel:${digits}`, "_self");
    };

    tr.querySelector(".textCustomerBtn").onclick = async () => {
      const digits = String(lead.contactNumber || "").replace(/\D/g, "");
      if (!digits) {
        toast(el, "No customer phone number found.", "warning");
        return;
      }

      try {
        await navigator.clipboard.writeText(digits);
        window.open("https://voice.google.com/u/0/messages", "_blank", "noopener");
        toast(el, "Phone number copied. Paste it into Google Voice Messages.", "success");
      } catch {
        window.open("https://voice.google.com/u/0/messages", "_blank", "noopener");
        toast(el, "Opened Google Voice Messages.", "success");
      }
    };

    const idCell = tr.querySelector(".copy-lead-id");
    if (idCell) {
      idCell.onclick = async () => {
        try {
          await navigator.clipboard.writeText(lead.leadID);
          toast(el, `Lead ID ${lead.leadID} copied.`, "success");
        } catch {
          toast(el, "Copy failed.", "error");
        }
      };
    }

    tr.querySelectorAll(".removePartBtn").forEach((btn) => {
      btn.onclick = async () => {
        const itemID = btn.dataset.item;
        if (!itemID) return;

        try {
          await removePartFromLead(lead.leadID, itemID);
          renderAll();
          toast(el, "Part removed from repair.", "success");
        } catch (err) {
          console.error(err);
          toast(el, "Failed to remove part.", "error");
        }
      };
    });

    el.leadsBody.appendChild(tr);

    if (lead.justRestored) {
      requestAnimationFrame(() => {
        tr.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      setTimeout(() => {
        lead.justRestored = false;
        tr.classList.remove("lead-just-restored");
      }, 2500);
    }
  });
}