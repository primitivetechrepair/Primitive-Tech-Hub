
/* modal.js
   A tiny modal module for Primitive Tech Hub (vanilla JS)
*/
(function () {
  function qs(id) {
    const el = document.getElementById(id);
    if (!el) console.error(`Modal element missing: #${id}`);
    return el;
  }

  const dom = {
    wrap: null,
    title: null,
    message: null,
    input: null,
    cancel: null,
    confirm: null
  };

  function init() {
    dom.wrap = qs('appModal');
    dom.title = qs('modalTitle');
    dom.message = qs('modalMessage');
    dom.input = qs('modalInput');
    dom.cancel = qs('modalCancelBtn');
    dom.confirm = qs('modalConfirmBtn');
  }

  /**
   * Opens the modal and returns a Promise:
   * - resolves with string input (if requireInput=true)
   * - resolves with true (if requireInput=false)
   * - resolves with null on cancel/escape/outside click
   */
  function open({
    title = 'Confirm',
    message = '',
    placeholder = '',
    confirmText = 'Confirm',
    requireInput = false,
    inputType = 'text'
  } = {}) {
    if (!dom.wrap) init();

    dom.title.textContent = title;
dom.message.innerHTML = message;
dom.confirm.textContent = confirmText;

    // Input behavior
    if (requireInput) {
      dom.input.classList.remove('hidden');
      dom.input.type = inputType || 'text';
      dom.input.value = '';
      dom.input.placeholder = placeholder || dom.input.placeholder || '';
    } else {
      dom.input.classList.add('hidden');
      dom.input.value = '';
    }

    // Show modal (support both hidden + open patterns)
    dom.wrap.classList.remove('hidden');
    dom.wrap.classList.add('open');
    dom.wrap.setAttribute('aria-hidden', 'false');

    // small UX: focus input (or confirm button if no input)
    setTimeout(() => {
      if (requireInput) dom.input.focus();
      else dom.confirm.focus();
    }, 0);

    return new Promise((resolve) => {
      const cleanup = (result) => {
        dom.wrap.classList.remove('open');
        dom.wrap.classList.add('hidden');
        dom.wrap.setAttribute('aria-hidden', 'true');

        dom.cancel.onclick = null;
        dom.confirm.onclick = null;
        dom.wrap.onclick = null;
        window.removeEventListener('keydown', onKey);

        resolve(result);
      };

      const onKey = (e) => {
        if (e.key === 'Escape') return cleanup(null);
        if (e.key === 'Enter') {
          // Enter confirms if input required, otherwise confirms too
          return cleanup(requireInput ? dom.input.value : true);
        }
      };

      window.addEventListener('keydown', onKey);

      dom.cancel.onclick = () => cleanup(null);
      dom.confirm.onclick = () => cleanup(requireInput ? dom.input.value : true);

      // click outside panel closes (overlay click)
      dom.wrap.onclick = (e) => {
        if (e.target === dom.wrap) cleanup(null);
      };
    });
  }

  // Helper: parse comma/newline input into tokens
  function parseList(raw) {
    return String(raw || '')
      .split(/[\n,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // expose a global
  window.Modal = { open, parseList };
})();
