// src/bootstrap/runAfterUnlock.js

export function runAfterUnlock(ctx) {
  const {
    el,
    data,
    esc,

    appDataStore,
    themeKey,
    initTheme,

    settingsUI,
    connectivityController,
    applyCustomDropdowns,

    renderAllController,
    renderAll,

    showSkeletonsOnce,

    maybeNotifyLowStockService,
    getData,
    toast,
  } = ctx;

  initTheme({ el, appDataStore, themeKey });

  settingsUI.syncSettingsUI();
  connectivityController.setupConnectivity();

  applyCustomDropdowns({ el, data, esc });

  renderAllController.renderAll();
  showSkeletonsOnce({ el, renderAll });

  maybeNotifyLowStockService({
    getData,
    toast: (msg, type) => toast(el, msg, type),
  });
}