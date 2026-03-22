// src/ui/renderCharts.js
export function renderCharts(ctx) {
  const {
    el,
    data,
    STATUS_ORDER,
    showDevicePie,
    drawBarChart,
    drawPieChart,
    countBy,
    leadsByWindow,
    commonRepairTypes,
  } = ctx;

  const statusTitle = el.statusChart?.parentElement?.querySelector("h3");
  if (statusTitle) statusTitle.classList.add("status-chart-title");

  drawBarChart(el.statusChart, countBy(data.leads, (l) => l.status, STATUS_ORDER));

  if (showDevicePie) {
    el.deviceChart.classList.remove("hidden");
    drawPieChart(el.deviceChart, countBy(data.leads, (l) => l.device));
    if (el.deviceChartToggleBtn) el.deviceChartToggleBtn.textContent = "Hide Device Pie";
  } else {
    el.deviceChart.classList.add("hidden");
    if (el.deviceChartToggleBtn) el.deviceChartToggleBtn.textContent = "Show Device Pie";
  }

  drawBarChart(el.trendChart, leadsByWindow(el.trendWindow.value));
  drawBarChart(el.repairTypeChart, commonRepairTypes());
}