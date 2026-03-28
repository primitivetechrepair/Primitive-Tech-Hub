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
      <tr class="empty-state-row">
        <td colspan="19">
          <div class="empty-state">
            <div class="empty-icon">🛠️</div>
            <div class="empty-title">No Repair Leads Yet</div>
            <div class="muted">Create a lead to start tracking repairs.</div>
          </div>
        </td>
      </tr>
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
            <button class="tiny removePartBtn" data-item="${esc(id)}" title="Remove part">✕</button>
          </div>
        `;
      })
      .join("");

    const partsCost = leadPartsCost(lead);
    const charged = Number(lead.repairCost ?? lead.chargedAmount ?? 0);
    const labor = Number(lead.laborAmount || 0);
    const profit = charged - partsCost;

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

const tr = document.createElement("tr");

if (lead.justRestored) {
  tr.classList.add("lead-just-restored");
}

tr.innerHTML = `
  <td class="lead-id copy-lead-id" title="Click to copy">
  ${esc(lead.leadID)}
  ${lead.justRestored ? `<span class="lead-restored-badge">RESTORED</span>` : ""}
</td>
  <td>${esc(lead.customerName)}</td>
  <td>${esc(lead.contactNumber || "-")}</td>
  <td>${esc(lead.email || "-")}</td>
  <td>
    <a class="address-link" href="${mapAddress}" target="_blank" rel="noopener">
      ${esc(lead.address || "-")}
    </a>
  </td>
  <td>${esc(lead.device)}</td>
  <td>${esc(lead.series || "-")}</td>
  <td>${esc(lead.repairType || "-")}</td>
  <td class="status-col">
    <select class="leadStatusSel">
      ${STATUS_ORDER.map(
        (s) =>
          `<option value="${esc(s)}" ${lead.status === s ? "selected" : ""}>${esc(s)}</option>`
      ).join("")}
    </select>
  </td>
  <td>${fmtMoney(charged)}</td>
  <td>${fmtMoney(labor)}</td>
  <td>
    ${esc(lead.notes || "-")}
    <div class="muted">Updated: ${fmtDateShort(lead.lastUpdated || lead.dateReported)}</div>
  </td>
  <td>${used || "-"}</td>
  <td>${files}</td>
  <td>${
  lead.dateReported
    ? String(lead.dateReported).split("-").length === 3
      ? `${String(lead.dateReported).split("-")[1]}/${String(lead.dateReported).split("-")[2]}/${String(lead.dateReported).split("-")[0]}`
      : fmtDateShort(lead.dateReported)
    : "-"
}</td>
  <td>
    ${fmtMoney(profit)}
    <div class="muted">${esc(aiSuggestion(lead.issueDescription, lead.device))}</div>
  </td>
  
  <!-- Payment Method Dropdown -->
  <td class="payment-method-col">
    <select class="paymentMethodSel">
      <option value="Cash" ${lead.paymentMethod === "Cash" ? "selected" : ""}>Cash</option>
      <option value="Zelle Transfer" ${lead.paymentMethod === "Zelle Transfer" ? "selected" : ""}>Zelle Transfer</option>
      <option value="CashApp" ${lead.paymentMethod === "CashApp" ? "selected" : ""}>CashApp</option>
    </select>
  </td>
  
  <!-- Payment Status Dropdown -->
  <td class="payment-status-col">
    <select class="paymentStatusSel">
      <option value="Unpaid" ${lead.paymentStatus === "Unpaid" ? "selected" : ""}>Unpaid</option>
      <option value="Partially Paid" ${lead.paymentStatus === "Partially Paid" ? "selected" : ""}>Partially Paid</option>
      <option value="Paid" ${lead.paymentStatus === "Paid" ? "selected" : ""}>Paid</option>
    </select>
  </td>
  
  <!-- Actions column -->
  <td class="action-stack actions">
    <button class="tiny copyCustomerBtn">Copy Info</button>
    <button class="tiny callCustomerBtn">Call</button>
    <button class="tiny textCustomerBtn">Text</button>
    <button class="tiny part-btn useForRepairBtn">Add Part</button>
    <button class="tiny invoiceBtn">Invoice</button>
    <button class="tiny delete-btn deleteLeadBtn">Delete</button>
  </td>
`;

    // Add event listeners for lead status, payment method, and payment status changes
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
                console.log("[STATUS] before persist snapshot", JSON.parse(JSON.stringify(data.leads.find((l) => l.leadID === lead.leadID))));
        await persist();
        console.log("[STATUS] after persist snapshot", JSON.parse(JSON.stringify(data.leads.find((l) => l.leadID === lead.leadID))));

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

    tr.querySelector(".copyCustomerBtn").onclick = async () => {
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