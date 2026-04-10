export function showModal(
  el,
  {
    title = "Confirm",
    message = "",
    requireInput = false,
    confirmText = "Confirm",
    cancelText = "Cancel",
    showCancel = false,
    confirmDisabled = false,
    onRender = null,
  } = {}
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

    el.modalConfirmBtn.textContent = confirmText;
    el.modalConfirmBtn.disabled = !!confirmDisabled;

    el.modalCancelBtn.textContent = cancelText;
    el.modalCancelBtn.style.display = showCancel ? "" : "none";

    el.modalInput.value = "";
    el.modalInput.classList.toggle("hidden", !requireInput);

    el.appModal.classList.remove("hidden");
    requestAnimationFrame(() => el.appModal.classList.add("open"));

    focusTimer = setTimeout(() => {
      if (requireInput) el.modalInput.focus();
      else if (!el.modalConfirmBtn.disabled) el.modalConfirmBtn.focus();
      else if (showCancel) el.modalCancelBtn.focus();
    }, 0);

    const close = (result) => {
      if (focusTimer) {
        clearTimeout(focusTimer);
        focusTimer = null;
      }

      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }

      el.appModal.classList.remove("open");

      setTimeout(() => {
        el.appModal.classList.add("hidden");

        if (prevFocus && typeof prevFocus.focus === "function") {
          try { prevFocus.focus(); } catch {}
        }
      }, 220);

      el.modalCancelBtn.onclick = null;
      el.modalConfirmBtn.onclick = null;
      el.modalMessage.onclick = null;
      resolve(result);
    };

    el.modalCancelBtn.onclick = () => close(false);
    el.modalConfirmBtn.onclick = () => {
      if (el.modalConfirmBtn.disabled) return;
      close(requireInput ? el.modalInput.value : true);
    };

    if (typeof onRender === "function") {
      onRender({
        el,
        close,
      });
    }
  });
}