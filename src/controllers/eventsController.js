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