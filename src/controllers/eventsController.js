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

    el.logoutBtn.onclick = () => {
      sessionStorage.removeItem(sessionKey);
      location.reload();
    };

    el.themeToggleBtn.onclick = () =>
      toggleTheme({ el, appDataStore, themeKey });

    el.inventoryForm.onsubmit = inventoryController.addInventory;
    el.leadForm.onsubmit = leadsController.addLead;

    function buildRepairRow() {
      const row = document.createElement("div");
      row.className = "repair-row";
      row.innerHTML = `
        <select class="repairTypeSelect" required>
          <option value="">Select Repair</option>
          <option value="Screen">Screen</option>
          <option value="Battery">Battery</option>
          <option value="Charging Port">Charging Port</option>
          <option value="Water Damage">Water Damage</option>
          <option value="Other">Other</option>
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

    el.calendarBtn.onclick = () => exportAccountingService.exportCalendarIcs();
    el.accountingBtn.onclick = () => exportAccountingService.exportQuickbooksCsv();

    bottomBarController.wireBottomBarOnce();
  }

  return { wireOnce };
}