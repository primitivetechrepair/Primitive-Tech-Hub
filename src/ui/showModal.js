export function showModal(
  el,
  { title = 'Confirm', message = '', requireInput = false, confirmText = 'Confirm' } = {}
) {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    let focusTimer = null;

    el.modalTitle.textContent = title;

    if (typeof message === "string" && message.includes("<")) {
      el.modalMessage.innerHTML = message;
    } else {
      el.modalMessage.textContent = message;
    }

    // ✅ bind dynamic stock modal buttons safely after message injection
    el.modalMessage.onclick = (e) => {
      const btn = e.target.closest(".stock-restock-btn");
      if (!btn) return;

      const itemID = String(btn.dataset.itemId || "").trim();
      const delta = Number(btn.dataset.delta);

      if (!itemID || Number.isNaN(delta)) return;
      if (!window.handleStockAdjust) return;

      window.handleStockAdjust(itemID, delta);
    };

    el.modalConfirmBtn.textContent = confirmText;

    el.modalInput.value = '';
    el.modalInput.classList.toggle('hidden', !requireInput);

    el.appModal.classList.remove('hidden');
    requestAnimationFrame(() => el.appModal.classList.add('open'));

    // focus inside modal (timer so it can be cancelled on close)
    focusTimer = setTimeout(() => {
      if (requireInput) el.modalInput.focus();
      else el.modalConfirmBtn.focus();
    }, 0);

    const close = (result) => {
      if (focusTimer) {
        clearTimeout(focusTimer);
        focusTimer = null;
      }

      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }

      el.appModal.classList.remove('open');

      setTimeout(() => {
        el.appModal.classList.add('hidden');

        if (prevFocus && typeof prevFocus.focus === 'function') {
          try { prevFocus.focus(); } catch {}
        }
      }, 220);

      el.modalCancelBtn.onclick = null;
      el.modalConfirmBtn.onclick = null;
      el.modalMessage.onclick = null;
      resolve(result);
    };

    el.modalCancelBtn.style.display = "none";
    el.modalConfirmBtn.onclick = () => close(requireInput ? el.modalInput.value : true);
  });
}