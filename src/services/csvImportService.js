// ./src/services/csvImportService.js
export function createCsvImportService({
  el,
  getCryptoKey,       // () => cryptoKey
  ensureUnlocked,     // async () => boolean  (must ensure cryptoKey exists)
  inventoryService,   // has upsertFromCsvRow
  persist,            // async () => void
  renderAll,          // () => void
  toast,              // toast(el, msg, type)
  maybeNotifyLowStock // () => void OR async () => void
}) {
  async function importCsv() {
    // Ensure we have cryptoKey so persist() actually writes
    if (!getCryptoKey()) {
      const ok = await ensureUnlocked();
      if (!ok) return; // user cancelled / failed
    }

    let text = el.csvInput.value.trim();
    if (!text && el.csvFile.files[0]) text = await el.csvFile.files[0].text();
    if (!text) return toast(el, "Provide CSV content/file.");

    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines
      .slice(1)
      .map((line) => line.split(",").map((v) => v.trim()));

    for (const row of rows) {
      const o = Object.fromEntries(headers.map((h, i) => [h, row[i] || ""]));
      if (!o.ItemID) continue;

      // Centralized mutation
      inventoryService.upsertFromCsvRow(o);
    }

    // Force save AFTER all rows are processed (this is what makes refresh safe)
    await persist();

    renderAll();
    await maybeNotifyLowStock?.();
    toast(el, "CSV import finished (add/update).");
  }

  return { importCsv };
}