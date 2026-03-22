export function countBy(items, keyFn, preferred = []) {
  const map = Object.fromEntries(preferred.map((k) => [k, 0]));
  items.forEach((item) => {
    const key = keyFn(item) || 'Unknown';
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

export function leadsByWindow(data, windowType, getWeek) {
  const map = {};

  data.leads.forEach((lead) => {
    const d = new Date(lead.lastUpdated || lead.dateReported || Date.now());
    let key = d.toISOString().slice(0, 10);

    if (windowType === 'week') key = `${d.getUTCFullYear()}-W${String(getWeek(d)).padStart(2, '0')}`;
    if (windowType === 'month') key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

    map[key] = (map[key] || 0) + 1;
  });

  return Object.fromEntries(Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])));
}

export function commonRepairTypes(data, countByFn) {
  return countByFn(data.leads, (lead) => {
    const txt = (lead.issueDescription || '').toLowerCase();
    if (txt.includes('battery')) return 'Battery';
    if (txt.includes('screen')) return 'Screen';
    if (txt.includes('charging')) return 'Charging Port';
    if (txt.includes('water')) return 'Liquid Damage';
    return 'Other';
  });
}