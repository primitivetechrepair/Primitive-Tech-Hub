// src/ui/notify.js
export function setMsg(el, msg = "", type = "") {
  if (!el) return;

  el.textContent = msg;

  if (!type) {
    el.className = "";
    return;
  }

  el.className = type;
}

export function toast(el, msg, type = "info") {
  const host = el?.toast || el?.toastEl || document.getElementById("toast");
  if (!host) {
    console.warn("toast(): toast host not found");
    return;
  }

  host.textContent = msg;
  host.className = `toast show ${type}`;

  clearTimeout(host._toastTimer);
  host._toastTimer = setTimeout(() => {
    host.className = "toast";
  }, 2200);
}