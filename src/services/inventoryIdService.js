export function createInventoryIdService({ getData }) {
  function nextInventoryId() {
    const data = getData();
    const max = (data.inventory || []).reduce((m, item) => {
      const match = String(item.itemID || '').match(/(\d+)$/);
      if (!match) return m;
      return Math.max(m, Number(match[1]));
    }, 0);

    return `I-${String(max + 1).padStart(4, '0')}`;
  }

  return { nextInventoryId };
}