export function getWeek(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

export function fmtDate(v) {
  if (!v) return "-";

  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";

  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${mm}/${dd}/${yyyy} ${hours}:${minutes} ${ampm}`;
}

export function fmtDateShort(v) {
  const d = new Date(v || Date.now());
  if (Number.isNaN(d.getTime())) return "-";

  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();

  return `${mm}/${dd}/${yyyy}`;
}

export function fmtMoney(v) {
  return `$${Number(v || 0).toFixed(2)}`;
}

export function addListItem(target, text, cls = '') {
  const li = document.createElement('li');
  li.textContent = text;
  if (cls) li.classList.add(cls);
  target.appendChild(li);
}

export function toCsv(headers, rows) {
  const escCsv = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  return [headers.map(escCsv).join(','), ...rows.map((r) => r.map(escCsv).join(','))].join('\n');
}

export function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function esc(v) {
  return String(v)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}