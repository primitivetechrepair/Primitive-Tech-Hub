export function createAiSuggestionService({ getData, countBy }) {
  function aiSuggestion(issue = '', device = '') {
    const data = getData();

    const text = String(issue || '').toLowerCase();
    if (text.includes('battery')) return 'Check battery health and replacement cycle.';
    if (text.includes('screen')) return 'Inspect display, digitizer, and connector.';
    if (text.includes('water')) return 'Perform corrosion treatment and board diagnostics.';

    const deviceLeads = (data.leads || []).filter(
      (l) => (l.device || '').toLowerCase() === (device || '').toLowerCase()
    );

    const top = countBy(deviceLeads, (l) => {
      const t = (l.issueDescription || '').toLowerCase();
      if (t.includes('battery')) return 'battery';
      if (t.includes('screen')) return 'screen';
      if (t.includes('charging')) return 'charging';
      if (t.includes('water')) return 'water';
      return 'other';
    });

    const likely = Object.entries(top).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (likely && likely !== 'other') {
      return `AI hint: ${device || 'Device'} commonly has ${likely}-related repairs.`;
    }
    return 'Run diagnostics and estimate parts/labor for quote.';
  }

  return { aiSuggestion };
}