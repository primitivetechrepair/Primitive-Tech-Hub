// src/controllers/settingsController.js
export function createSettingsController(ctx) {
  const {
    el,
    getData,
    isUnlocked,
    toast,
    persist,
    applyCustomDropdowns,
    renderInventoryOptions,
    renderScanLeadOptions,
    renderAll,
    esc,
    saveAppSettingsToCloud,
  } = ctx;

  async function saveSettings() {
    if (!isUnlocked()) {
      toast("Locked: log in to save settings.", "error");
      return;
    }

    const data = getData();
    data.settings = data.settings || {};

    data.settings.defaultThreshold = Number(el.defaultThreshold?.value || 5);
    data.settings.mediumOffset = Number(el.mediumOffset?.value || 5);
    data.settings.followupDays = Number(el.followupDays?.value || 3);

    const brands = Array.isArray(data.settings.brands) ? data.settings.brands : [];
    const categories = Array.isArray(data.settings.categories) ? data.settings.categories : [];
    const repairs = Array.isArray(data.settings.repairs) ? data.settings.repairs : [];

    data.settings.brands = [...brands];
    data.settings.categories = [...categories];
    data.settings.repairs = [...repairs];

    await persist();

    if (saveAppSettingsToCloud) {
      try {
        await saveAppSettingsToCloud();
      } catch (err) {
        console.error("Settings cloud sync failed:", err);
        toast("Settings saved locally, but cloud sync failed.", "warning");
      }
    }

    applyCustomDropdowns({ el, data, esc });
    renderInventoryOptions({ el, data });
    renderScanLeadOptions({ el, data, esc });
    renderAll();

    toast("Settings saved.", "success");
  }

  return { saveSettings };
}