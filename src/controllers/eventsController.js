// ./src/controllers/eventsController.js

export function createEventsController({
  el,
  sessionKey,
  toggleTheme,
  appDataStore,
  themeKey,
  renderAll,

  inventoryController,
  leadsController,
  settingsController,
  scannerController,

  renderLeads,
  renderInventory,
  renderCharts,
  chartsCtx, // function that returns ctx object
  toggleDeviceChart,

  exportBackupService,
  exportAccountingService,

  csvImportService,
  bottomBarController,
}) {
  let wired = false;

  function wireOnce({
    getShowDevicePie,
    setShowDevicePie,
  }) {
    if (wired) return;
    wired = true;

    function setAuditLogModalOpen(el, isOpen) {
      if (!el.auditLogModal) return;

      if (isOpen) {
        renderAll();
      }

      el.auditLogModal.classList.toggle("hidden", !isOpen);
      el.auditLogModal.setAttribute("aria-hidden", isOpen ? "false" : "true");

      document.body.style.overflow = isOpen ? "hidden" : "";

      if (isOpen) {
        if (el.closeAuditLogBtn) {
          requestAnimationFrame(() => el.closeAuditLogBtn.focus());
        }
      } else {
        if (el.openAuditLogBtn) {
          requestAnimationFrame(() => el.openAuditLogBtn.focus());
        }
      }
    }

    el.logoutBtn.onclick = () => {
      sessionStorage.removeItem(sessionKey);
      location.reload();
    };

    el.themeToggleBtn.onclick = () =>
      toggleTheme({ el, appDataStore, themeKey });

    el.inventoryForm.onsubmit = inventoryController.addInventory;
    el.leadForm.onsubmit = leadsController.addLead;

    function buildRepairRow() {
  const savedRepairs =
    Array.isArray(window.__PTH_REPAIRS__) && window.__PTH_REPAIRS__.length
      ? window.__PTH_REPAIRS__
      : ["Screen", "Battery", "Charging Port", "Water Damage", "Other"];

  const repairOptions = [
    '<option value="">Select Repair</option>',
    ...savedRepairs.map((repair) => `<option value="${repair}">${repair}</option>`),
  ].join("");

  const row = document.createElement("div");
  row.className = "repair-row";
  row.innerHTML = `
    <select class="repairTypeSelect" required>
      ${repairOptions}
    </select>

    <input
      type="number"
      class="repairAmountInput"
      min="0"
      step="0.01"
      placeholder="Amount ($)"
    />

    <button type="button" class="removeRepairRowBtn mini-btn">✖</button>
  `;
  return row;
}

    const repairRowsContainer = document.getElementById("repairRowsContainer");
    const addRepairRowBtn = document.getElementById("addRepairRowBtn");

    if (addRepairRowBtn && repairRowsContainer) {
  addRepairRowBtn.onclick = () => {
    const row = buildRepairRow();

    row.style.opacity = "0";
    row.style.transform = "translateY(10px)";
    row.style.transition = "opacity 220ms ease, transform 220ms ease";

    repairRowsContainer.appendChild(row);

    requestAnimationFrame(() => {
      row.style.opacity = "1";
      row.style.transform = "translateY(0)";
    });

    const newSelect = row.querySelector(".repairTypeSelect");
if (newSelect) {
  setTimeout(() => {
    newSelect.focus();
    row.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 100);
}
  };

  repairRowsContainer.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".removeRepairRowBtn");
    if (!removeBtn) return;

    const rows = repairRowsContainer.querySelectorAll(".repair-row");
    if (rows.length <= 1) return;

    const row = removeBtn.closest(".repair-row");
    if (!row) return;

    row.style.opacity = "0";
    row.style.transform = "translateY(-8px)";
    row.style.transition = "opacity 180ms ease, transform 180ms ease";

    setTimeout(() => {
      row.remove();
    }, 180);
  });
}

    el.statusFilter.onchange = () => renderAll();
    el.deviceFilter.onchange = () => renderAll();

    el.deviceChartToggleBtn.onclick = () =>
      toggleDeviceChart({
        getShowDevicePie,
        setShowDevicePie,
        chartsCtx,
        renderCharts,
      });

    el.trendWindow.onchange = () => renderCharts(chartsCtx());

    el.inventorySearch.oninput = () => renderAll();
    el.leadSearch.oninput = () => renderAll();

    el.importCsvBtn.onclick = () => csvImportService.importCsv();

    el.exportJsonBtn.onclick = exportBackupService.exportJsonBackup;
    el.exportCsvBtn.onclick = exportBackupService.exportCsvBackup;

    el.saveSettingsBtn.onclick = settingsController.saveSettings;

    el.openScannerBtn.onclick = scannerController.openScanner;
    el.closeScannerBtn.onclick = scannerController.closeScanner;
    el.applyScanToInventory.onclick = scannerController.applyScanToInventory;
    el.attachScanToLead.onclick = scannerController.attachScanToLead;

    if (el.calendarBtn && exportAccountingService && exportAccountingService.exportCalendarIcs) {
      el.calendarBtn.onclick = () => exportAccountingService.exportCalendarIcs();
    }

    if (el.accountingBtn && exportAccountingService && exportAccountingService.exportQuickbooksCsv) {
      el.accountingBtn.onclick = () => exportAccountingService.exportQuickbooksCsv();
    }

    if (el.openAuditLogBtn) {
      el.openAuditLogBtn.onclick = () => {
        setAuditLogModalOpen(el, true);
      };
    }

    if (el.closeAuditLogBtn) {
      el.closeAuditLogBtn.onclick = () => {
        setAuditLogModalOpen(el, false);
      };
    }

    if (el.auditLogModal) {
      el.auditLogModal.addEventListener("click", (e) => {
        if (
          e.target &&
          e.target.dataset &&
          e.target.dataset.close === "true"
        ) {
          setAuditLogModalOpen(el, false);
        }
      });
    }

    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        el.auditLogModal &&
        !el.auditLogModal.classList.contains("hidden")
      ) {
        setAuditLogModalOpen(el, false);
      }
    });

    bottomBarController.wireBottomBarOnce();
  }

  return { wireOnce };
}