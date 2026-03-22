// src/ui/applyCustomDropdowns.js
function mergeOptions(defaults, custom) {
  return [
    ...new Set(
      [...(defaults || []), ...(custom || [])]
        .map((s) => String(s).trim())
        .filter(Boolean)
    ),
  ];
}

function setSelectOptions(selectEl, placeholder, options, esc) {
  if (!selectEl) return;

  selectEl.innerHTML =
    `<option value="">${placeholder}</option>` +
    options.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
}

export function applyCustomDropdowns({ el, data, esc }) {
  data.settings = data.settings || {};

  const categories = Array.isArray(data.settings.categories)
    ? data.settings.categories
    : [];

  const brands = Array.isArray(data.settings.brands)
    ? data.settings.brands
    : [];

  const repairs = Array.isArray(data.settings.repairs)
    ? data.settings.repairs
    : [];

  data.settings.categories = [...categories];
  data.settings.brands = [...brands];
  data.settings.repairs = [...repairs];

  // Inventory
  const invDeviceDefaults = []; // Empty array to remove defaults
  const invBrandDefaults = [];  // Empty array to remove defaults

  // Set custom values for the device and brand dropdowns
  setSelectOptions(
    el.itemDevice,
    "Select Device Type",
    mergeOptions(invDeviceDefaults, categories),
    esc
  );

  setSelectOptions(
    el.itemBrand,
    "Select Brand",
    mergeOptions(invBrandDefaults, brands),
    esc
  );

  // Leads
  const leadDeviceDefaults = []; // Empty array to remove defaults
  const leadRepairDefaults = []; // Empty array to remove defaults for repairs

  setSelectOptions(
    el.deviceType,
    "Select Device",
    mergeOptions(leadDeviceDefaults, categories),
    esc
  );

  // Remove the default repair types
  setSelectOptions(
    el.repairType,
    "Select Repair",
    mergeOptions(leadRepairDefaults, repairs),
    esc
  );
}