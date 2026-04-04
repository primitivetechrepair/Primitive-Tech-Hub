export function mapEls() {
  const ids = [
    'authScreen', 'app', 'setupForm', 'loginForm', 'setupPassword', 'setupPin',
    'loginPassword', 'loginPin', 'authMessage', 'logoutBtn', 'biometricBtn',

    // Inventory
    'inventoryForm', 'inventoryBody', 'inventorySearch',
    'itemName', 'itemDevice', 'itemPartType', 'itemBrand',
    'itemSeries', 'itemQuantity', 'itemCost',
    'itemSupplier', 'itemColor', 'itemNotes',
    'itemHistoryTitle',
    'itemHistoryList',

    // Leads
    'leadForm', 'leadsBody', 'leadSearch', 'statusFilter',
    'deviceFilter', 'leadInventoryUsed',
    'customerName', 'contactNumber',
    'customerEmail', 'customerAddress',
    'deviceType', 'leadSeries', 'repairType',
    'leadStatus', 'dateReported',
    'repairCost', 'laborOnly', 'leadNotes',

    // Charts
    'statusChart', 'deviceChart', 'deviceChartToggleBtn',
    'trendWindow', 'trendChart', 'repairTypeChart',

    // Lists
    'forecastList',
    'profitList',
    'laborList',
    'restockList',  
    'reminderList',
    'invoiceHistoryList',
    'auditLog',
    'customerHistory',
    'deletedLeadsList',
    'undoDeleteLeadBtn',

    // CSV + Export
    'csvInput', 'csvFile', 'importCsvBtn',
    'exportJsonBtn', 'exportCsvBtn',

    // Settings
    'defaultThreshold', 'mediumOffset',
    'followupDays', 'saveSettingsBtn',

    // Scanner
    'openScannerBtn', 'closeScannerBtn',
    'scannerPanel', 'scannerVideo',
    'scanCodeInput', 'scanAdjustQty',
    'applyScanToInventory', 'attachScanToLead',
    'scanLeadSelect',

    // Other
    'calendarBtn', 'accountingBtn',
    'integrationLog', 'networkStatus',
    'themeToggleBtn',

    // Modal
    'appModal', 'modalTitle', 'modalMessage',
    'modalInput', 'modalCancelBtn', 'modalConfirmBtn',

    // Toast
    'toast'
  ];

  // Safe mapping
  const els = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

  // Helpful console warnings if elements are missing
  Object.entries(els).forEach(([id, node]) => {
    if (!node) console.warn(`mapEls(): Element with id "${id}" not found`);
  });

  return els;
}