export function maybeNotifyLowStock({
  getData,
  toast,
}) {
  const data = getData();

  const lows = data.inventory.filter(
    (i) => i.quantity < (i.threshold || data.settings.defaultThreshold)
  );

  if (!lows.length) return;

  const msg = `Low stock alert: ${lows
    .map((i) => `${i.itemName}(${i.quantity})`)
    .join(', ')}`;

  toast(msg, "warning");

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Primitive Tech Hub', { body: msg });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}