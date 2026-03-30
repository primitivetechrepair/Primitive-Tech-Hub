export function createInventoryIdService({ getData }) {
  function nextInventoryId() {
    // Use timestamp to guarantee uniqueness across devices
    return `I-${Date.now()}`;
  }

  return { nextInventoryId };
}