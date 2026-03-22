// src/ui/getChartsCtx.js
export function getChartsCtx(deps) {
  const {
    el,
    data,
    STATUS_ORDER,
    drawBarChart,
    drawPieChart,
    countBy,
    leadsByWindow,
    commonRepairTypes,
  } = deps;

  return () => ({
    el,
    data,
    STATUS_ORDER,
    showDevicePie: deps.showDevicePie, // pull latest value each call
    drawBarChart,
    drawPieChart,
    countBy,
    leadsByWindow,
    commonRepairTypes,
  });
}