export function createExportBackupService({ getData, persist, download, toCsv }) {
  async function exportJsonBackup() {
    const data = getData();
    await persist();
    download(
      `primitive-tech-hub-backup-${Date.now()}.json`,
      JSON.stringify(data, null, 2),
      'application/json'
    );
  }

  function exportCsvBackup() {
    const data = getData();

    const inv = toCsv(
      ['ItemID', 'ItemName', 'Device', 'Series', 'Quantity', 'CostPerItem', 'Supplier', 'LastUpdated', 'Threshold', 'Notes'],
      data.inventory.map((i) => [
        i.itemID, i.itemName, i.category, i.brand, i.series,
        i.supplier || '', i.quantity, i.costPerItem, i.supplier,
        i.lastUpdated, i.threshold, i.notes
      ])
    );

    const leads = toCsv(
      ['LeadID', 'CustomerName', 'ContactNumber', 'Email', 'Address', 'Device', 'Series', 'IssueDescription', 'Status', 'DateReported', 'LastUpdated', 'RepairCost', 'Labor', 'InventoryUsed'],
      data.leads.map((l) => [
        l.leadID, l.customerName, l.contactNumber, l.email, l.address,
        l.device, l.series || '', l.issueDescription, l.status,
        l.dateReported, l.lastUpdated, l.repairCost ?? l.chargedAmount,
        l.laborAmount || 0, (l.inventoryUsed || []).join('|')
      ])
    );

    download(`primitive-tech-hub-inventory-${Date.now()}.csv`, inv, 'text/csv');
    download(`primitive-tech-hub-leads-${Date.now()}.csv`, leads, 'text/csv');
  }

  return { exportJsonBackup, exportCsvBackup };
}