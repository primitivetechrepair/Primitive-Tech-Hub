// src/ui/renderLeads.js
export function renderLeads(ctx) {
  // ===== UI Collapse State (local only) =====
  const COLLAPSE_KEY = "primitiveTechHub_leadCollapseState";
  const collapseState = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "{}");

  function isCollapsed(id) {
    return collapseState[id] === true;
  }

  function setCollapsed(id, val) {
    collapseState[id] = val;
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapseState));
  }

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
      Array.isArray(lead.notes)
        ? lead.notes.map((n) => `${n.text || ""} ${n.tag || ""}`).join(" ")
        : lead.notes,
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

const formatRepairLabel = (type) => {
  const clean = String(type || "").trim();
  if (!clean) return "-";

  // Prevent double "Replacement"
  if (/replacement$/i.test(clean)) return clean;

  return `${clean} Replacement`;
};

const repairItemsForDisplay =
  Array.isArray(lead.repairItems) && lead.repairItems.length
    ? lead.repairItems
        .map((item) => ({
          type: formatRepairLabel(item?.type),
          amount: Number(item?.amount || 0),
        }))
        .filter((item) => item.type)
    : Array.isArray(lead.repairTypes) && lead.repairTypes.length
      ? lead.repairTypes
          .map((type) => ({
            type: formatRepairLabel(type),
            amount: 0,
          }))
          .filter((item) => item.type)
      : [
          {
            type: formatRepairLabel(lead.repairType || "-") || "-",
            amount: 0,
          },
        ];

    const repairDisplayHtml = repairItemsForDisplay.length
      ? `
        <div class="lead-repair-badges">
          ${repairItemsForDisplay
            .map(
              (item) => `
                <span class="lead-repair-badge">
                  <span class="lead-repair-badge-text">${esc(item.type)}</span>
                  ${
                    item.amount > 0
                      ? `<span class="lead-repair-badge-amount">${esc(fmtMoney(item.amount))}</span>`
                      : ""
                  }
                </span>
              `
            )
            .join("")}
        </div>
      `
      : `<span>-</span>`;

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

if (isCollapsed(lead.leadID)) {
  tr.classList.add("lead-collapsed");
}

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
  <button
    class="tiny lead-action-btn collapseToggleBtn"
    type="button"
    title="${isCollapsed(lead.leadID) ? "Show Details" : "Hide Details"}"
    aria-label="${isCollapsed(lead.leadID) ? "Show Details" : "Hide Details"}"
  >
    ${isCollapsed(lead.leadID) ? "Show Details" : "Hide Details"}
  </button>
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

          <div class="lead-card-row lead-card-row-repairs">
            <strong>Repair:</strong>
            ${repairDisplayHtml}
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

          <div class="lead-card-row lead-notes-row">
            <div class="lead-notes-header">
              <strong>Notes:</strong>
              <button
                type="button"
                class="lead-notes-preview"
                title="Open full lead notes"
                aria-label="Open full lead notes"
              >
                View Notes
              </button>
            </div>

            <div class="lead-notes-snippet">
              ${
                Array.isArray(lead.notes)
                  ? esc(
                      lead.notes.length
                        ? lead.notes
                            .slice()
                            .reverse()
                            .map((n) => `[${n.at || ""}] ${n.text || ""}`)
                            .join(" | ")
                        : "No notes added"
                    )
                  : esc(lead.notes || "No notes added")
              }
            </div>

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
    const collapseBtn = tr.querySelector(".collapseToggleBtn");
if (collapseBtn) {
  collapseBtn.onclick = () => {
    const currentlyCollapsed = tr.classList.toggle("lead-collapsed");
    setCollapsed(lead.leadID, currentlyCollapsed);

    collapseBtn.textContent = currentlyCollapsed ? "Show Details" : "Hide Details";
    collapseBtn.title = currentlyCollapsed ? "Show Details" : "Hide Details";
    collapseBtn.setAttribute(
      "aria-label",
      currentlyCollapsed ? "Show Details" : "Hide Details"
    );
  };
}

const header = tr.querySelector(".lead-card-header");

if (header) {
  header.addEventListener("click", (e) => {
    // 🚫 Prevent triggering when clicking buttons
    if (e.target.closest("button")) return;

    const collapseBtn = tr.querySelector(".collapseToggleBtn");
    if (!collapseBtn) return;

    const currentlyCollapsed = tr.classList.toggle("lead-collapsed");
    setCollapsed(lead.leadID, currentlyCollapsed);

    collapseBtn.textContent = currentlyCollapsed ? "Show Details" : "Hide Details";
    collapseBtn.title = currentlyCollapsed ? "Show Details" : "Hide Details";
    collapseBtn.setAttribute(
      "aria-label",
      currentlyCollapsed ? "Show Details" : "Hide Details"
    );
  });
}

    tr.querySelector(".deleteLeadBtn").onclick = () => deleteLead(lead.leadID);

    const notesPreviewBtn = tr.querySelector(".lead-notes-preview");
if (notesPreviewBtn) {
  notesPreviewBtn.onclick = async () => {
    if (!isUnlocked()) {
      toast(el, "Locked: log in to update notes.", "error");
      return;
    }

    const modalPromise = window.Modal?.open({
  title: "Add / Update Notes",
  message: `
    <div class="notes-modal">
      <div id="leadNotesExisting" class="notes-existing">
        ${
          Array.isArray(lead.notes)
            ? lead.notes.length
              ? lead.notes
                  .slice()
                  .reverse()
                  .map(
                    (note) => `
                      <div class="lead-note-entry" data-note-id="${esc(String(note.id || ""))}">
                        <div class="lead-note-entry-head" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                          <div class="muted">[${esc(note.at || "")}]${note.tag ? ` ${esc(note.tag)}` : ""}</div>
                          <button
                            type="button"
                            class="tiny lead-action-btn deleteLeadNoteBtn"
                            data-note-id="${esc(String(note.id || ""))}"
                            title="Delete note"
                          >
                            Delete
                          </button>
                        </div>
                        <pre>${esc(note.text || "")}</pre>
                      </div>
                    `
                  )
                  .join("")
              : "<div class='muted'>No notes yet.</div>"
            : lead.notes
              ? `<pre>${esc(lead.notes)}</pre>`
              : "<div class='muted'>No notes yet.</div>"
        }
      </div>

      <textarea
        id="leadNoteInput"
        placeholder="Add a new note..."
        style="width:100%;min-height:100px;margin-top:10px;"
      ></textarea>
    </div>
  `,
  confirmText: "Save Note",
  requireInput: false,
});

    const confirmBtn = document.getElementById("modalConfirmBtn");
const cancelBtn = document.getElementById("modalCancelBtn");

// style + behavior
if (confirmBtn && cancelBtn) {
  confirmBtn.dataset.keepOpen = "true";

  confirmBtn.style.background = "#00c853"; // green
  confirmBtn.style.color = "#fff";

  cancelBtn.style.display = "";
  cancelBtn.textContent = "Close";
  cancelBtn.style.background = "#1f2937"; // dark
  cancelBtn.style.color = "#fff";

  const renderNotesExisting = () => {
    if (!existingEl) return;

    existingEl.innerHTML = Array.isArray(lead.notes) && lead.notes.length
      ? lead.notes
          .slice()
          .reverse()
          .map(
            (note) => `
              <div class="lead-note-entry" data-note-id="${esc(String(note.id || ""))}">
                <div class="lead-note-entry-head" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                  <div class="muted">[${esc(note.at || "")}]${note.tag ? ` ${esc(note.tag)}` : ""}</div>
                  <button
                    type="button"
                    class="tiny lead-action-btn deleteLeadNoteBtn"
                    data-note-id="${esc(String(note.id || ""))}"
                    title="Delete note"
                  >
                    Delete
                  </button>
                </div>
                <pre>${esc(note.text || "")}</pre>
              </div>
            `
          )
          .join("")
      : "<div class='muted'>No notes yet.</div>";
  };

  existingEl.onclick = async (e) => {
    const deleteBtn = e.target.closest(".deleteLeadNoteBtn");
    if (!deleteBtn) return;

    const noteID = String(deleteBtn.dataset.noteId || "").trim();
    if (!noteID || !Array.isArray(lead.notes)) return;

    const nextNotes = lead.notes.filter((note) => String(note.id || "") !== noteID);
    if (nextNotes.length === lead.notes.length) return;

    const prevNotes = [...lead.notes];
    lead.notes = nextNotes;
    lead.lastUpdated = new Date().toISOString();

    addAudit("lead_note_deleted", {
      leadID: lead.leadID,
      noteID,
      userAction: "note_deleted",
    });

    try {
      await persist();

      queueCloudSync("lead_note_update", {
        leadID: lead.leadID,
        notes: lead.notes,
      });

      await upsertLeadToCloud(lead);

      renderNotesExisting();
      toast(el, "Note deleted.", "success");
      renderAll();
    } catch (err) {
      console.error(err);
      lead.notes = prevNotes;
      toast(el, "Failed to delete note.", "error");
    }
  };

  confirmBtn.onclick = async () => {
    const inputEl = document.getElementById("leadNoteInput");
    const existingEl = document.getElementById("leadNotesExisting");

    const noteText = inputEl?.value?.trim();
    if (!noteText) {
      toast(el, "Enter a note first.", "warning");
      return;
    }

    const timestamp = new Date().toLocaleString();

    if (!Array.isArray(lead.notes)) {
      lead.notes = lead.notes
        ? [
            {
              id: `legacy-${Date.now()}`,
              text: String(lead.notes),
              at: timestamp,
              tag: "general",
              files: [],
            },
          ]
        : [];
    }

    lead.notes.push({
      id: `note-${Date.now()}`,
      text: noteText,
      at: timestamp,
      tag: "general",
      files: [],
    });

    lead.lastUpdated = new Date().toISOString();

    addAudit("lead_note_added", {
      leadID: lead.leadID,
      note: noteText,
      userAction: "note_added",
    });

    try {
      await persist();

      queueCloudSync("lead_note_update", {
        leadID: lead.leadID,
        notes: lead.notes,
      });

      await upsertLeadToCloud(lead);

      renderNotesExisting();
      inputEl.value = "";

      toast(el, "Note added.", "success");
      renderAll();
    } catch (err) {
      console.error(err);
      toast(el, "Failed to save note.", "error");
    }
  };
}

    await modalPromise;
  };
}

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