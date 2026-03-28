import { appDataStore } from "./src/data/storage/appDataStore.js";
import { authStore } from "./src/data/storage/authStore.js";

import { defaultData } from "./src/data/defaultData.js";

import { createInventoryService } from "./src/services/inventoryService.js";
import { createLeadsService } from "./src/services/leadsService.js";
import { createAuditService } from "./src/services/auditService.js";
import { createSyncService } from "./src/services/syncService.js";

import { sha256, deriveKey, encryptJSON, decryptJSON } from "./src/services/cryptoService.js";

import { mapEls } from "./src/ui/mapEls.js";
import { initTheme, toggleTheme } from "./src/ui/theme.js";
import { showModal } from "./src/ui/showModal.js";
import { toast, setMsg } from "./src/ui/notify.js";
import { setIntegrationLog } from "./src/ui/integrationLog.js";

import { registerServiceWorker } from "./src/services/registerServiceWorker.js";
import { maybeNotifyLowStock as maybeNotifyLowStockService } from "./src/services/stockNotificationService.js";

import { renderCustomerHistory } from "./src/ui/renderCustomerHistory.js";
import { renderInventory } from "./src/ui/renderInventory.js";
import { renderLeads } from "./src/ui/renderLeads.js";
import { renderCharts } from "./src/ui/renderCharts.js";
import { renderAuditLog } from "./src/ui/renderAuditLog.js";
import { renderForecast } from "./src/ui/renderForecast.js";
import { renderProfit } from "./src/ui/renderProfit.js";
import { renderRestock } from "./src/ui/renderRestock.js";
import { renderReminders } from "./src/ui/renderReminders.js";
import { renderInventoryOptions } from "./src/ui/renderInventoryOptions.js";
import { renderScanLeadOptions } from "./src/ui/renderScanLeadOptions.js";
import { applyCustomDropdowns } from "./src/ui/applyCustomDropdowns.js";
import { showItemHistory } from "./src/ui/showItemHistory.js";
import { showSkeletonsOnce } from "./src/ui/skeletons.js";

import { getWeek, fmtDate, fmtDateShort, fmtMoney, addListItem, toCsv, download, esc } from "./src/utils/helpers.js";
import { countBy, leadsByWindow, commonRepairTypes } from "./src/utils/leadAnalytics.js";
import { drawBarChart, drawPieChart } from "./src/ui/chartPrimitives.js";

import { toggleDeviceChart } from "./src/ui/toggleDeviceChart.js";
import { inventoryStatusByColorRule } from "./src/services/inventoryStatusService.js";
import { ensureLeadPartsShape } from "./src/services/leadPartsShapeService.js";

import { val, safeVal } from "./src/utils/domUtils.js";
import { fileToMeta } from "./src/utils/fileUtils.js";

import { createCsvImportService } from "./src/services/csvImportService.js";
import { createAuthController } from "./src/controllers/authController.js";

import { initAppModules } from "./src/bootstrap/initAppModules.js";

import { createLeadPartsController } from "./src/controllers/leadPartsController.js";
import { createSessionFacade } from "./src/bootstrap/sessionFacade.js";
import { runAfterUnlock } from "./src/bootstrap/runAfterUnlock.js";
import { showLockedUI, showUnlockedUI } from "./src/ui/appVisibility.js";
import { createListManagerModal } from "./src/ui/listManagerModal.js";

import {
  fetchInventoryFromCloud,
  fetchLeadsFromCloud,
  upsertLeadToCloud,
  fetchAppSettingsFromCloud,
  upsertAppSettingsToCloud,
} from "./src/services/cloudInventoryService.js";

import { renderInvoiceHistory } from "./src/ui/renderInvoiceHistory.js";

const STORAGE_KEY = "primitiveTechHubDataEnc";
const AUTH_KEY = "primitiveTechHubAuth";
const SESSION_KEY = "primitiveTechHubSession";
const PIN_KEY = "primitiveTechHubPin";
const THEME_KEY = "primitiveTechHubTheme";
const STATUS_ORDER = [
  "New",
  "In Progress",
  "Waiting for Parts",
  "Completed",
  "Cancelled",
];

let cryptoKey = null;
let data = defaultData();
let showDevicePie = true;

// still used directly in app.js after init
let connectivityController = null;
let csvImportService = null;
let cloudSyncQueueService = null;
let eventsController = null;
let renderAllController = null;
let settingsUI = null;

let renderAll = () => {};
const renderAllNow = () => renderAll();
let authController = null;
let eventsWired = false;

let leadPartsController = null;
let sessionFacade = null;
let listManagerModal = null;

function isUnlocked() {
  return !!cryptoKey;
}

function getData() {
  return data;
}

function setData(next) {
  data = next;
}

function normalizeSettingsShape(settings = {}) {
  const next = { ...settings };

  const categories =
    Array.isArray(next.categories) && next.categories.length
      ? next.categories
      : ["iPhone", "Samsung", "Accessories", "Tools", "Other"];

  const repairs =
    Array.isArray(next.repairs) && next.repairs.length
      ? next.repairs
      : ["Screen", "Battery", "Charging Port", "Water Damage", "Other"];

  const brands =
    Array.isArray(next.brands) && next.brands.length
      ? next.brands
      : ["Apple", "Samsung", "LG", "Sony", "Other"];

  next.categories = [...categories];
  next.repairs = [...repairs];
  next.brands = [...brands];

  next.defaultThreshold = Number(next.defaultThreshold ?? 5);
  next.mediumOffset = Number(next.mediumOffset ?? 5);
  next.followupDays = Number(next.followupDays ?? 3);

  if (!Array.isArray(next.series) || !next.series.length) {
    next.series = ["Standard", "Other"];
  }

  return next;
}

async function hydrateAppSettingsFromCloud() {
  try {
    const cloudSettings = await fetchAppSettingsFromCloud();
    if (!cloudSettings) return;

    data.settings = normalizeSettingsShape({
      ...data.settings,
      categories:
        Array.isArray(cloudSettings.categories) && cloudSettings.categories.length
          ? cloudSettings.categories
          : data.settings?.categories,
      repairs:
        Array.isArray(cloudSettings.repairs) && cloudSettings.repairs.length
          ? cloudSettings.repairs
          : data.settings?.repairs,
      brands:
        Array.isArray(cloudSettings.brands) && cloudSettings.brands.length
          ? cloudSettings.brands
          : data.settings?.brands,
    });

    await persist();
  } catch (err) {
    console.error("hydrateAppSettingsFromCloud failed:", err);
  }
}

let settingsSavePromise = null;
let lastSettingsSaveAt = 0;

async function saveAppSettingsToCloud() {
  const now = Date.now();

  if (settingsSavePromise && now - lastSettingsSaveAt < 800) {
    return settingsSavePromise;
  }

  lastSettingsSaveAt = now;

  settingsSavePromise = upsertAppSettingsToCloud(
    normalizeSettingsShape(data.settings)
  ).finally(() => {
    settingsSavePromise = null;
  });

  return settingsSavePromise;
}

const inventoryService = createInventoryService({
  getData,
  setData,
  persist,
  addAudit,
});

const leadsService = createLeadsService({
  getData,
  setData,
  persist,
});

const auditService = createAuditService({
  getData,
  setData,
  persist,
});

const syncService = createSyncService({
  getData,
  setData,
  persist,
});

const el = mapEls();

if (location.hostname !== "127.0.0.1" && location.hostname !== "localhost") {
  registerServiceWorker();
}

if (!sessionFacade) {
  sessionFacade = createSessionFacade({
    defaultData,
    appDataStore,
    encryptJSON,
    decryptJSON,
    storageKey: STORAGE_KEY,
    getData,
    toast,
    setIntegrationLog: (text) => setIntegrationLog(el, text),
    getEl: () => el,
  });
}

if (!authController) {
  authController = createAuthController({
    el,
    authStore,
    authKey: AUTH_KEY,
    sessionKey: SESSION_KEY,
    pinKey: PIN_KEY,
    sha256,
    deriveKey,
    defaultData,
    loadEncrypted,
    setData,
    setCryptoKey: (k) => {
      cryptoKey = k;
    },
    showApp,
    renderAll: renderAllNow,
    toast,
    setMsg,
  });
}

authController.initAuth();

async function hydrateInventoryFromCloud() {
  try {
    const cloudInventory = await fetchInventoryFromCloud();
    console.log("[HYDRATE] inventory rows from cloud:", Array.isArray(cloudInventory) ? cloudInventory.length : "not-array");

    if (!Array.isArray(cloudInventory)) return;

    data.inventory = cloudInventory;
    console.log("[HYDRATE] data.inventory after assign:", Array.isArray(data.inventory) ? data.inventory.length : "not-array");
  } catch (err) {
    console.error("hydrateInventoryFromCloud failed:", err);
  }
}

async function hydrateLeadsFromCloud() {
  try {
    const cloudLeads = await fetchLeadsFromCloud();
    console.log("[HYDRATE] leads rows from cloud:", Array.isArray(cloudLeads) ? cloudLeads.length : "not-array");

    if (!Array.isArray(cloudLeads)) return;

    data.leads = cloudLeads;
    console.log("[HYDRATE] data.leads after assign:", Array.isArray(data.leads) ? data.leads.length : "not-array");
  } catch (err) {
    console.error("hydrateLeadsFromCloud failed:", err);
  }
}

async function showApp() {
  if (!isUnlocked()) {
    showLockedUI(el);
    return;
  }

  showUnlockedUI(el);

  data.settings = normalizeSettingsShape(data.settings);
  await hydrateAppSettingsFromCloud();
  await hydrateInventoryFromCloud();
  await hydrateLeadsFromCloud();

  console.log("[SHOWAPP] before persist", {
    inventory: Array.isArray(data.inventory) ? data.inventory.length : "not-array",
    leads: Array.isArray(data.leads) ? data.leads.length : "not-array",
  });

  await persist();

  console.log("[SHOWAPP] after persist", {
    inventory: Array.isArray(data.inventory) ? data.inventory.length : "not-array",
    leads: Array.isArray(data.leads) ? data.leads.length : "not-array",
  });

  renderAllNow();

  if (!csvImportService) {
    csvImportService = createCsvImportService({
      el,
      getCryptoKey: () => cryptoKey,
      ensureUnlocked: async () => {
        if (isUnlocked()) return true;
        toast(el, "Locked: please log in to import CSV.", "error");
        return false;
      },
      inventoryService,
      persist,
      renderAll: renderAllNow,
      toast,
      maybeNotifyLowStock: () =>
        maybeNotifyLowStockService({
          getData,
          toast: (msg, type) => toast(el, msg, type),
        }),
    });
  }

  ({
    connectivityController,
    settingsUI,
    cloudSyncQueueService,
    eventsController,
    renderAllController,
  } = initAppModules({
    // core
    el,
    data,
    getData,
    setData,
    isUnlocked,

    // constants
    PIN_KEY,
    SESSION_KEY,
    THEME_KEY,
    STATUS_ORDER,

    // auth/crypto
    authStore,
    sha256,
    authController,

    // formatting + helpers used by renderAllController
    esc,
    fmtDate,
    fmtDateShort,
    fmtMoney,
    addListItem,

    // generic utils / wiring
    toast,
    showModal,
    val,
    safeVal,
    fileToMeta,
    addAudit,
    persist,
    renderAll: renderAllNow,
    download,
    toCsv,
    toggleTheme,
    toggleDeviceChart,
    inventoryStatusByColorRule,
    ensureLeadPartsShape,
    showItemHistory,
    setIntegrationLog: (text) => setIntegrationLog(el, text),
    saveAppSettingsToCloud,

    // renderers/ui
    applyCustomDropdowns,
    renderInventoryOptions,
    renderScanLeadOptions,
    renderLeads,
    renderInventory: (ctx) => renderInventory({ ...ctx, addAudit }),
    renderCharts,
    renderForecast,
    renderProfit,
    renderRestock,
    renderReminders,
    renderAuditLog,
    renderCustomerHistory,
    renderInvoiceHistory,

    // chart primitives + analytics
    drawBarChart,
    drawPieChart,
    countBy,
    leadsByWindow,
    commonRepairTypes,
    getWeek,
    getShowDevicePie: () => showDevicePie,

    // services already created in app.js
    inventoryService,
    leadsService,
    auditService,
    syncService,
    upsertLeadToCloud,

    // low-stock factory
    maybeNotifyLowStockService,

    // lead parts controller wiring
    addPartToLead: (...args) => leadPartsController.addPartToLead(...args),
    removePartFromLead: (...args) => leadPartsController.removePartFromLead(...args),
    addSwipeQuickUse: (...args) => leadPartsController.addSwipeQuickUse(...args),

    // csvImportService already built above
    csvImportService,

    instances: {
      connectivityController,
      settingsUI,
      cloudSyncQueueService,
      eventsController,
      renderAllController,
    },
  }));

  renderAll = () => renderAllController.renderAll();

  if (!listManagerModal) {
    listManagerModal = createListManagerModal({
      el,
      getData,
      persist,
      toast,
      esc,
      isUnlocked,
      settingsUI,
      saveAppSettingsToCloud,
    });
    listManagerModal.wireOnce();
  }

  if (!leadPartsController) {
    leadPartsController = createLeadPartsController({
      el,
      getData,
      persist,
      toast,
      renderAll: renderAllNow,
    });
  }

  if (!eventsWired) {
    eventsController.wireOnce({
      getShowDevicePie: () => showDevicePie,
      setShowDevicePie: (v) => {
        showDevicePie = v;
      },
    });
    eventsWired = true;
  }

  runAfterUnlock({
    el,
    data,
    esc,
    appDataStore,
    themeKey: THEME_KEY,
    initTheme,
    settingsUI,
    connectivityController,
    applyCustomDropdowns,
    renderAllController,
    renderAll: renderAllNow,
    showSkeletonsOnce,
    maybeNotifyLowStockService,
    getData,
    toast,
  });
}

function addAudit(action, details = {}) {
  return auditService.add(action, details, { persistNow: false });
}

async function persist() {
  return sessionFacade.persist(data, cryptoKey);
}

async function loadEncrypted() {
  return await sessionFacade.loadEncrypted(cryptoKey);
}