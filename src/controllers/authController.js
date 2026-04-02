// ./src/controllers/authController.js

export function createAuthController({
  el,
  authStore,
  authKey,
  sessionKey,
  pinKey,
  sha256,
  deriveKey,
  deriveAuthHash,
  createAuthSalt,
  defaultData,
  loadEncrypted,
  setData,
  setCryptoKey,
  showApp,
  renderAll, // ✅ add this
  toast,
  setMsg,
}) {
  let failedLoginAttempts = 0;
  let loginLockedUntil = 0;

  function getLockSecondsRemaining() {
    return Math.max(0, Math.ceil((loginLockedUntil - Date.now()) / 1000));
  }

  function setFormBusy(formEl, isBusy, busyText = "Working...") {
    if (!formEl) return;

    const submitBtn = formEl.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    if (!submitBtn.dataset.originalText) {
      submitBtn.dataset.originalText = submitBtn.textContent;
    }

    submitBtn.disabled = isBusy;
    submitBtn.textContent = isBusy
      ? busyText
      : submitBtn.dataset.originalText;
  }

  function resetLoginFields({ clearPin = true } = {}) {
    if (el.loginPassword) el.loginPassword.value = "";
    if (clearPin && el.loginPin) el.loginPin.value = "";
    el.loginPassword?.focus();
  }

  function initAuth() {
    const hash = authStore.getAuthHash({ authKey });
    const loggedIn = authStore.hasSessionOk({ sessionKey });

    if (!hash) el.setupForm.classList.remove("hidden");
    else if (!loggedIn) el.loginForm.classList.remove("hidden");
    else showApp();

    if (window.PublicKeyCredential) el.biometricBtn.classList.remove("hidden");

    el.setupForm.addEventListener("submit", handleSetup);
    el.loginForm.addEventListener("submit", handleLogin);
    el.biometricBtn.addEventListener("click", () =>
      toast(el, "Biometric login is browser/device dependent; password+PIN are enabled.")
    );
  }

  async function handleSetup(e) {
    e.preventDefault();

    const password = el.setupPassword.value.trim();
    const pin = el.setupPin.value.trim();

    if (password.length < 6) return setMsg("Password must be at least 6 characters.");
    if (!pin || pin.length < 4) return setMsg("PIN must be at least 4 characters.");

    setFormBusy(el.setupForm, true, "Saving...");
    setMsg("", "");

    try {
      await authStore.setAuthHash({
        authKey,
        deriveAuthHash,
        createAuthSalt,
        password,
      });

      await authStore.setPinHash({ pinKey, sha256, pin });

      const ok = await unlockSession(password);
      if (!ok) return;

      authStore.setSessionOk({ sessionKey });

      showApp();

      if (typeof renderAll === "function") renderAll();
    } finally {
      setFormBusy(el.setupForm, false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();

    const now = Date.now();
    if (loginLockedUntil > now) {
      const seconds = getLockSecondsRemaining();
      return setMsg(`Too many failed attempts. Try again in ${seconds}s.`, "error");
    }

    const password = el.loginPassword.value;
    const pin = el.loginPin.value.trim();

    setFormBusy(el.loginForm, true, "Unlocking...");

    try {
      const authRecord = authStore.getAuthRecord({ authKey });

      const passOK = authRecord
        ? (await deriveAuthHash(password, authRecord.salt)) === authRecord.hash
        : false;

      const pinHash = authStore.getPinHash({ pinKey });
      const pinOK = pinHash && pin ? (await sha256(pin)) === pinHash : true;

      if (!passOK || !pinOK) {
        failedLoginAttempts += 1;

        if (failedLoginAttempts >= 5) {
          loginLockedUntil = Date.now() + 30_000;
          failedLoginAttempts = 0;
          return setMsg("Too many failed attempts. Try again in 30s.", "error");
        }

        setMsg(`Invalid credentials. (${failedLoginAttempts}/5)`, "error");
        resetLoginFields();
        return;
      }

      failedLoginAttempts = 0;
      loginLockedUntil = 0;
      setMsg("", "");

      const ok = await unlockSession(password);
      if (!ok) return;

      authStore.setSessionOk({ sessionKey });
      showApp();
    } finally {
      setFormBusy(el.loginForm, false);
    }
  }

  async function unlockSession(password) {
    if (!password) return false;

    const key = await deriveKey(password);
    setCryptoKey(key);

    const loaded = await loadEncrypted();

    if (loaded === false) {
      setCryptoKey(null);
      authStore.clearSession({ sessionKey });
      setMsg("Could not unlock saved data. Check your password.", "error");
      return false;
    }

    setData(loaded || defaultData());
    return true;
  }

  return { initAuth, unlockSession };
}