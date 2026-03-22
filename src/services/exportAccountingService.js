export function createExportAccountingService({
  getData,
  download,
  toCsv,
  leadPartsCost,
  setIntegrationLog,
}) {
  function exportCalendarIcs() {
    const data = getData();
    const openLeads = data.leads.filter((l) => l.status !== 'Completed');

    const events = openLeads.map((l) => {
      const d = new Date(l.dateReported || Date.now());
      const dt = d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      return `BEGIN:VEVENT\nUID:${l.leadID}@primitive-tech-hub\nDTSTAMP:${dt}\nSUMMARY:Repair Follow-up ${l.leadID}\nDESCRIPTION:${(l.customerName + ' - ' + l.issueDescription).replace(/\n/g, ' ')}\nEND:VEVENT`;
    }).join('\n');

    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//PrimitiveTechHub//EN\n${events}\nEND:VCALENDAR`;
    download(`primitive-tech-hub-repairs-${Date.now()}.ics`, ics, 'text/calendar');
    setIntegrationLog('Google Calendar-compatible ICS exported.');
  }

  function exportQuickbooksCsv() {
    const data = getData();

    const rows = data.leads.map((l) => {
      const parts = leadPartsCost(l);
      const charged = Number(l.chargedAmount || 0);
      return [l.leadID, l.customerName, l.device, l.status, charged, parts, charged - parts];
    });

    const csv = toCsv(['LeadID', 'Customer', 'Device', 'Status', 'Charged', 'PartsCost', 'Profit'], rows);
    download(`primitive-tech-hub-quickbooks-export-${Date.now()}.csv`, csv, 'text/csv');
    setIntegrationLog('QuickBooks-style profit export generated.');
  }

  return { exportCalendarIcs, exportQuickbooksCsv };
}