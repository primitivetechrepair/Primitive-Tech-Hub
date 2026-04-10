// src/bootstrap/initAppModules.js

import { renderPartsCost } from "../ui/renderPartsCost.js";
import { createAdminGate } from "../services/adminGate.js";
import { createLeadStatusService } from "../services/leadStatusService.js";
import { createInventoryIdService } from "../services/inventoryIdService.js";
import { createInventoryController } from "../controllers/inventoryController.js";
import { createLeadsController } from "../controllers/leadsController.js";
import { createSettingsController } from "../controllers/settingsController.js";
import { getChartsCtx } from "../ui/getChartsCtx.js";
import { createConnectivityController } from "../controllers/connectivityController.js";
import { createExportBackupService } from "../services/exportBackupService.js";
import { createExportAccountingService } from "../services/exportAccountingService.js";
import { createInvoiceService } from "../services/invoiceService.js";
import { createScannerController } from "../controllers/scannerController.js";
import { createAiSuggestionService } from "../services/aiSuggestionService.js";
import { createLeadCostService } from "../services/leadCostService.js";
import { createBottomBarController } from "../controllers/bottomBarController.js";
import { createSettingsUI } from "../ui/settingsUI.js";
import { createCloudSyncQueueService } from "../services/cloudSyncQueueService.js";
import { createLeadInventoryAutoMatchService } from "../services/leadInventoryAutoMatchService.js";
import { createDeleteActions } from "../actions/deleteActions.js";
import { createEventsController } from "../controllers/eventsController.js";
import { createRenderAllController } from "../controllers/renderAllController.js";

import { countBy, leadsByWindow, commonRepairTypes } from "../utils/leadAnalytics.js";
import { getWeek } from "../utils/helpers.js";
import { renderDeletedLeads } from "../ui/renderDeletedLeads.js";

/**
 * Initializes "showApp initializer cluster" modules once.
 * Returns a bag of instances (same objects you currently store in app.js module scope).
 */
export function initAppModules(ctx) {
  const {
  el,
  data,
  getData,
  setData,
  isUnlocked,

  saveAppSettingsToCloud,

    // constants
    PIN_KEY,
    SESSION_KEY,
    THEME_KEY,
    STATUS_ORDER,

    // crypto/auth
    authStore,
    sha256,
    authController,

    // generic utilities
    toast,
    showModal,
    esc,
    val,
    safeVal,
    fileToMeta,
    persist,
    renderAll,

    // UI / renderers
    applyCustomDropdowns,
    renderInventoryOptions,
    renderScanLeadOptions,
    renderLeads,
    renderInventory,
    renderCharts,
    renderForecast,
    renderProfit,
    renderLabor,
    renderRestock,
    renderReminders,
    renderAuditLog,
    renderCustomerHistory,
    renderInvoiceHistory,
    showItemHistory,
    settingsUIFactory: _settingsUIFactory, // not used (kept for compatibility)

    // chart primitives
    drawBarChart,
    drawPieChart,

    // services (already created in app.js)
    inventoryService,
    leadsService,
    auditService,
    syncService,
    upsertLeadToCloud,

    // other services
    download,
    toCsv,
    setIntegrationLog,
    toggleTheme,
    toggleDeviceChart,
    inventoryStatusByColorRule,
    ensureLeadPartsShape,

    maybeAutoBackupService, // not used here
    maybeNotifyLowStockService,
    maybeNotifyLowStock, // not used here

    // “capabilities” used by renderAllController / other modules
    addPartToLead,
    removePartFromLead,
    addSwipeQuickUse,

    // showDevicePie control used by charts ctx
    getShowDevicePie,

    // instance bag + factories that need injection
    instances,

    // passthrough: get cryptoKey
    getCryptoKey,

    // existing initTheme call stays in app.js, not here
    appDataStore,
  } = ctx;

  const out = { ...(instances || {}) };
  const toastMsg = (msg, type) => toast(el, msg, type);

  if (!out.adminGate) {
    out.adminGate = createAdminGate({
      authStore,
      pinKey: PIN_KEY,
      sha256,
      showModal,
      toast,
      el,
    });
  }

  if (!out.leadStatusService) {
    out.leadStatusService = createLeadStatusService({ getData });
  }

  if (!out.inventoryIdService) {
    out.inventoryIdService = createInventoryIdService({ getData });
  }

  if (!out.connectivityController) {
    out.connectivityController = createConnectivityController({
      el,
      getData,
      persist,
      toast: toastMsg,
      syncService,
    });
  }

  if (!out.exportBackupService) {
    out.exportBackupService = createExportBackupService({
      getData,
      persist,
      download,
      toCsv,
    });
  }

  if (!out.leadCostService) {
    out.leadCostService = createLeadCostService({ getData });
  }

  if (!out.exportAccountingService) {
    out.exportAccountingService = createExportAccountingService({
      getData,
      download,
      toCsv,
      leadPartsCost: out.leadCostService.leadPartsCost,
      setIntegrationLog: (text) => setIntegrationLog(el, text),
    });
  }

  if (!out.invoiceService) {
    out.invoiceService = createInvoiceService({
      getData,
      persist,
      download,
      leadPartsCost: out.leadCostService.leadPartsCost,
      setIntegrationLog: (text) => setIntegrationLog(el, text),
      queueCloudSync: (...args) => out.connectivityController.queueCloudSync(...args),
      addAudit: ctx.addAudit,
      toast: toastMsg,
    });
  }

  if (!out.inventoryController) {
    out.inventoryController = createInventoryController({
      el,
      getData,
      setData,
      isUnlocked,
      toast,
      nextInventoryId: out.inventoryIdService.nextInventoryId,
      safeVal,
      addAudit: ctx.addAudit,
      queueCloudSync: (...args) => out.connectivityController.queueCloudSync(...args),
      persist,
      renderAll,
      maybeNotifyLowStock: () =>
        maybeNotifyLowStockService({
  getData,
  showModal,
}),
      inventoryService,
    });
  }

  window.inventoryController = out.inventoryController;

  window.handleStockAdjust = (itemID, delta) => {
    if (!itemID) return;
    if (!window.inventoryController?.quickUseItem) return;
    window.inventoryController.quickUseItem(itemID, delta);
  };

  if (!out.leadsController) {
    out.leadsController = createLeadsController({
      el,
      data,
      isUnlocked,
      toast: toastMsg,
      val,
      fileToMeta,
      leadsService,
      addAudit: ctx.addAudit,
      queueCloudSync: (...args) => out.connectivityController.queueCloudSync(...args),
      renderAll,
      persist,
      maybeNotifyLowStock: () =>
        maybeNotifyLowStockService({
          getData,
          showModal,
        }),
    });
  }

  if (!out.settingsController) {
    out.settingsController = createSettingsController({
      el,
      getData,
      isUnlocked,
      toast: toastMsg,
      persist,
      applyCustomDropdowns,
      renderInventoryOptions,
      renderScanLeadOptions,
      renderAll,
      esc,
      saveAppSettingsToCloud,
    });
  }

  if (!out.chartsCtx) {
    out.chartsCtx = getChartsCtx({
      el,
      data,
      STATUS_ORDER,
      drawBarChart,
      drawPieChart,
      countBy,
      leadsByWindow: (windowType) => leadsByWindow(data, windowType, getWeek),
      commonRepairTypes: () => commonRepairTypes(data, countBy),
      get showDevicePie() {
        return getShowDevicePie();
      },
    });
  }

  if (!out.scannerController) {
    out.scannerController = createScannerController({
      el,
      getData,
      persist,
      toast: toastMsg,
      addAudit: ctx.addAudit,
      queueCloudSync: (...args) => out.connectivityController.queueCloudSync(...args),
      renderAll,
    });
  }

  if (!out.aiSuggestionService) {
    out.aiSuggestionService = createAiSuggestionService({
      getData,
      countBy,
    });
  }

  if (!out.bottomBarController) {
    out.bottomBarController = createBottomBarController();
  }

  if (!out.settingsUI) {
    out.settingsUI = createSettingsUI({ el, getData, esc });
  }

  if (!out.cloudSyncQueueService) {
    out.cloudSyncQueueService = createCloudSyncQueueService({
      getData,
      setData,
      persist,
      syncService,
      el,
      toast,
    });
  }

  if (!out.leadInventoryAutoMatchService) {
    out.leadInventoryAutoMatchService = createLeadInventoryAutoMatchService({
      getData,
      persist,
      renderAll,
      addAudit: ctx.addAudit,
      toast,
      el,
      maybeNotifyLowStock: () =>
        maybeNotifyLowStockService({
  getData,
  showModal,
}),
    });
  }

  if (!out.deleteActions) {
    out.deleteActions = createDeleteActions({
      el,
      isUnlocked,
      toast,
      showModal,
      inventoryService,
      getData,
      setData,
      persist,
      renderAll,
      addAudit: ctx.addAudit,
      cloudSyncQueueService: out.cloudSyncQueueService,
    });
  }

  if (!out.eventsController) {
        out.eventsController = createEventsController({
      el,
      sessionKey: SESSION_KEY,
      toggleTheme,
      appDataStore,
      themeKey: THEME_KEY,
      renderAll,

      inventoryController: out.inventoryController,
      leadsController: out.leadsController,
      settingsController: out.settingsController,
      scannerController: out.scannerController,

      renderLeads,
      renderInventory,
      renderCharts,
      chartsCtx: out.chartsCtx,

      toggleDeviceChart,

      exportBackupService: out.exportBackupService,
      exportAccountingService: out.exportAccountingService,

      csvImportService: ctx.csvImportService,
      bottomBarController: out.bottomBarController,
    });
  }

  if (!out.renderAllController) {
    out.renderAllController = createRenderAllController({
      el,
      getData,
      isUnlocked,

      esc: ctx.esc,
      fmtDate: ctx.fmtDate,
      fmtDateShort: ctx.fmtDateShort,
      fmtMoney: ctx.fmtMoney,
      addListItem: ctx.addListItem,

      STATUS_ORDER,

      inventoryService,
      leadsService,
      leadCostService: out.leadCostService,
      aiSuggestionService: out.aiSuggestionService,
      invoiceService: out.invoiceService,
      inventoryController: out.inventoryController,
      leadsController: out.leadsController,
      auditService,
      upsertLeadToCloud,

      deleteActions: out.deleteActions,
      addPartToLead,
      removePartFromLead,
      showItemHistory,
      addSwipeQuickUse,

      ensureLeadPartsShape,

      queueCloudSync: (...args) => out.cloudSyncQueueService.queueCloudSync(...args),
      maybeNotifyLowStock: () =>
        maybeNotifyLowStockService({
  getData,
  showModal,
}),

      isAdminEnabled: out.adminGate.isAdminEnabled,
      verifyAdminPin: out.adminGate.verifyAdminPin,

      chartsCtx: out.chartsCtx,
      renderCharts,

      renderInventory,
      renderInventoryOptions,
      renderLeads,
      renderForecast,
      renderProfit,
      renderLabor,
      renderPartsCost,
      renderInvoiceHistory,
      renderRestock,
      renderReminders,
      renderAuditLog,
      renderCustomerHistory,
      renderDeletedLeads,
      renderScanLeadOptions,

      inventoryStatusByColorRule,

      toast,
      addAudit: ctx.addAudit,
      persist,
    });
  }

  return out;
}