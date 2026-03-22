export function createLeadStatusService({ getData }) {
  function autoStatus(lead) {
    const data = getData();

    if (lead.status === 'Completed') return 'Completed';

    const lowForLead = (lead.inventoryUsed || []).some((id) => {
      const item = (data.inventory || []).find((i) => i.itemID === id);
      return !item || item.quantity < (item.threshold || data.settings.defaultThreshold);
    });

    return lowForLead ? 'Waiting for Parts' : lead.status;
  }

  return { autoStatus };
}