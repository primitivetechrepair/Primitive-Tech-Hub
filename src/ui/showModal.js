export function showModal(
  el,
  { title = 'Confirm', message = '', requireInput = false, confirmText = 'Confirm' } = {}
) {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    let focusTimer = null;

    el.modalTitle.textContent = title;
    el.modalMessage.textContent = message;
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
      // cancel any pending focus
      if (focusTimer) {
        clearTimeout(focusTimer);
        focusTimer = null;
      }

      // force focus out of modal BEFORE hiding
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }

      el.appModal.classList.remove('open');

      setTimeout(() => {
        el.appModal.classList.add('hidden');

        // restore focus to what opened the modal
        if (prevFocus && typeof prevFocus.focus === 'function') {
          try { prevFocus.focus(); } catch {}
        }
      }, 220);

      el.modalCancelBtn.onclick = null;
      el.modalConfirmBtn.onclick = null;
      resolve(result);
    };

    el.modalCancelBtn.onclick = () => close(false);
    el.modalConfirmBtn.onclick = () => close(requireInput ? el.modalInput.value : true);
  });
}