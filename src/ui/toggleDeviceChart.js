export function toggleDeviceChart({ getShowDevicePie, setShowDevicePie, chartsCtx, renderCharts }) {
  setShowDevicePie(!getShowDevicePie());
  renderCharts(chartsCtx());
}