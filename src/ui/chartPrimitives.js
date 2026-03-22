// ./src/ui/chartPrimitives.js
import { esc } from "../utils/stringUtils.js"; // use the correct esc module you already have

export function drawBarChart(container, counts) {
  container.innerHTML = '';
  const entries = Object.entries(counts);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  entries.forEach(([label, value]) => {
    const width = Math.round((value / max) * 100);
    const div = document.createElement('div');
    div.className = `bar ${label === 'Completed' ? 'completed-margin' : ''}`;
    div.innerHTML = `<div class="bar-label">${esc(label)} (${value})</div><div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>`;
    container.appendChild(div);
  });
}

export function drawPieChart(container, counts) {
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  const total = entries.reduce((sum, [, v]) => v + sum, 0) || 1;
  const max = Math.max(1, ...entries.map(([, v]) => v));
  let cursor = 0;
  const slices = entries.map(([, val]) => {
    const start = (cursor / total) * 100;
    cursor += val;
    const end = (cursor / total) * 100;
    const alpha = 0.35 + (val / max) * 0.65;
    const color = `rgba(234,82,111,${alpha.toFixed(2)})`;
    return `${color} ${start}% ${end}%`;
  }).join(', ');
  const legend = entries.map(([k, v]) => {
    const alpha = 0.35 + (v / max) * 0.65;
    return `<li><span class="dot" style="background:rgba(234,82,111,${alpha.toFixed(2)})"></span>${esc(k)} (${v})</li>`;
  }).join('');
  container.innerHTML = `<div class="pie" style="background:conic-gradient(${slices || '#334155 0 100%'});"></div><ul class="legend">${legend || '<li>No data</li>'}</ul>`;
}