// src/ui/settingsUI.js
export function createSettingsUI({ el, getData, esc }) {
  function ensureSettingsShape() {
    const data = getData();
    const s = data.settings || (data.settings = {});

    if (!Array.isArray(s.brands) || !s.brands.length) {
      s.brands = ["Apple", "Samsung", "LG", "Sony", "Other"];
    }

    if (!Array.isArray(s.categories) || !s.categories.length) {
      s.categories = ["iPhone", "Samsung", "Accessories", "Tools", "Other"];
    }

    if (!Array.isArray(s.repairs) || !s.repairs.length) {
      s.repairs = ["Screen", "Battery", "Charging Port", "Water Damage", "Other"];
    }

    if (!Array.isArray(s.series) || !s.series.length) {
      s.series = ["Standard", "Other"];
    }

    return s;
  }

  function syncSettingsUI() {
    const s = ensureSettingsShape();

    if (el.defaultThreshold) el.defaultThreshold.value = s.defaultThreshold ?? 5;
    if (el.mediumOffset) el.mediumOffset.value = s.mediumOffset ?? 5;
    if (el.followupDays) el.followupDays.value = s.followupDays ?? 3;

    refreshCategoryOptions();
    refreshSeriesOptions();
    refreshRepairOptions();
  }

  function parseList(str) {
    return [
      ...new Set(
        String(str || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    ];
  }

  function refreshCategoryOptions() {
    const s = ensureSettingsShape();

    if (el.itemDevice) {
      const current = el.itemDevice.value;
      const categories = Array.isArray(s.categories) ? s.categories : [];

      el.itemDevice.innerHTML = [
        '<option value="">Device</option>',
        ...categories.map((c) => `<option>${esc(c)}</option>`),
      ].join("");

      if (categories.includes(current)) el.itemDevice.value = current;
    }

    if (el.itemBrand) {
      const currentBrand = el.itemBrand.value;
      const brands = Array.isArray(s.brands) ? s.brands : [];

      el.itemBrand.innerHTML = [
        '<option value="">Select Brand</option>',
        ...brands.map((b) => `<option>${esc(b)}</option>`),
      ].join("");

      if (brands.includes(currentBrand)) el.itemBrand.value = currentBrand;
    }
  }

  function refreshSeriesOptions() {
    const s = ensureSettingsShape();

    const inventorySeries = document.getElementById("itemSeries");
    const leadSeries = document.getElementById("leadSeries");
    const repairInput = document.getElementById("issueDescription");

    const seriesLabel = (s.series || []).join(", ");
    const repairsLabel = (s.repairs || []).join(", ");

    if (inventorySeries) {
      inventorySeries.placeholder = `Series (${seriesLabel || "Custom"})`;
    }

    if (leadSeries) {
      leadSeries.placeholder = `Series (${seriesLabel || "Custom"})`;
    }

    if (repairInput) {
      repairInput.placeholder = `Repair (${repairsLabel || "Custom"})`;
    }
  }

  function refreshRepairOptions() {
    const s = ensureSettingsShape();

    const categories = Array.isArray(s.categories) ? s.categories : [];
    const repairs = Array.isArray(s.repairs) ? s.repairs : [];

    const leadDevice = document.getElementById("deviceType");
    const leadRepair = document.getElementById("repairType");

    if (leadDevice) {
      const current = leadDevice.value;

      leadDevice.innerHTML = [
        '<option value="">Device</option>',
        ...categories.map((c) => `<option>${esc(c)}</option>`),
      ].join("");

      if (categories.includes(current)) leadDevice.value = current;
      leadDevice.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (leadRepair) {
      const current = leadRepair.value;

      leadRepair.innerHTML = [
        '<option value="">Repair</option>',
        ...repairs.map((r) => `<option>${esc(r)}</option>`),
      ].join("");

      if (repairs.includes(current)) leadRepair.value = current;
      leadRepair.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  return {
    syncSettingsUI,
    parseList,
    refreshCategoryOptions,
    refreshSeriesOptions,
    refreshRepairOptions,
    ensureSettingsShape,
  };
}