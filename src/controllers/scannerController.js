export function createScannerController({
  el,
  getData,
  persist,
  toast,
  addAudit,
  queueCloudSync,
  renderAll,
}) {
  let scanStream = null;
  let scanTimer = null;

  async function openScanner() {
    el.scannerPanel.classList.remove('hidden');

    if (!navigator.mediaDevices?.getUserMedia) {
      toast('Camera API unavailable. Enter code manually.');
      return;
    }

    try {
      scanStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      el.scannerVideo.srcObject = scanStream;

      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({
          formats: ['qr_code', 'code_128', 'ean_13', 'upc_a']
        });

        scanTimer = setInterval(async () => {
          try {
            const codes = await detector.detect(el.scannerVideo);
            if (codes.length) el.scanCodeInput.value = codes[0].rawValue || '';
          } catch {}
        }, 900);
      }
    } catch {
      toast('Unable to open camera. Use manual code input.');
    }
  }

  function closeScanner() {
    el.scannerPanel.classList.add('hidden');

    if (scanTimer) clearInterval(scanTimer);
    scanTimer = null;

    if (scanStream) scanStream.getTracks().forEach((t) => t.stop());
    scanStream = null;
  }

  async function applyScanToInventory() {
    const data = getData();

    const code = el.scanCodeInput.value.trim();
    const qty = Math.max(1, Number(el.scanAdjustQty.value) || 1);
    if (!code) return toast('No scanned code provided.');

    let item = data.inventory.find(
      (i) => i.itemID === code || i.itemName.toLowerCase() === code.toLowerCase()
    );

    if (!item) {
      item = {
        itemID: code,
        itemName: `Scanned-${code}`,
        category: 'Other',
        quantity: 0,
        costPerItem: 0,
        supplier: 'Scanner',
        threshold: data.settings.defaultThreshold,
        lastUpdated: new Date().toISOString(),
        notes: 'Auto-created from scan',
        usageEvents: []
      };

      data.inventory.unshift(item);
      addAudit('inventory_added_scan', { itemID: item.itemID, qty, userAction: 'scan_create' });
    }

    item.quantity += qty;
    item.lastUpdated = new Date().toISOString();

    addAudit('inventory_adjusted_scan', {
      itemID: item.itemID,
      delta: qty,
      qty: item.quantity,
      userAction: 'scan_adjust'
    });

    queueCloudSync('inventory_scan_adjust', { itemID: item.itemID, qty });

    await persist();
    renderAll();
    toast(`Applied scan to inventory: +${qty}`);
  }

  async function attachScanToLead() {
    const data = getData();

    const code = el.scanCodeInput.value.trim();
    const leadID = el.scanLeadSelect.value;
    if (!code || !leadID) return toast('Select lead and scanned code first.');

    const lead = data.leads.find((l) => l.leadID === leadID);
    if (!lead) return;

    if (!lead.inventoryUsed.includes(code)) lead.inventoryUsed.push(code);
    lead.lastUpdated = new Date().toISOString();

    addAudit('lead_attach_scan_code', { leadID, itemID: code, userAction: 'scan_attach' });
    queueCloudSync('lead_scan_attach', { leadID, code });

    await persist();
    renderAll();
  }

  return {
    openScanner,
    closeScanner,
    applyScanToInventory,
    attachScanToLead,
  };
}