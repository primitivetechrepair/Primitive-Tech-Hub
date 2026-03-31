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
  function initAuth() {
    const hash = authStore.getAuthHash({ authKey });
    const loggedIn = authStore.hasSessionOk({ sessionKey });

    if (!hash) el.setupForm.classList.remove("hidden");
    else if (!loggedIn) el.loginForm.classList.remove("hidden");
    else unlockSession().then(showApp);

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
  if (pin && pin.length < 4) return setMsg("PIN must be at least 4 chars.");

await authStore.setAuthHash({
  authKey,
  deriveAuthHash,
  createAuthSalt,
  password,
});
await authStore.setPinHash({ pinKey, sha256, pin });

  authStore.setSessionOk({ sessionKey });

  const ok = await unlockSession(password);
  if (!ok) return;

  showApp();

  // ✅ Preserve your original behavior
  if (typeof renderAll === "function") renderAll();
}

  async function handleLogin(e) {
    e.preventDefault();

    const password = el.loginPassword.value;
    const pin = el.loginPin.value.trim();

    const authRecord = authStore.getAuthRecord({ authKey });

const passOK = authRecord
  ? (await deriveAuthHash(password, authRecord.salt)) === authRecord.hash
  : false;

    const pinHash = authStore.getPinHash({ pinKey });
    const pinOK = pinHash && pin ? (await sha256(pin)) === pinHash : true;

    if (!passOK || !pinOK) return setMsg("Invalid credentials.");

    const key = await deriveKey(password);
    setCryptoKey(key);

    authStore.setSessionOk({ sessionKey });

    const ok = await unlockSession(password);
    if (!ok) return;

    showApp();
  }

  async function unlockSession(password) {
    // allow callers to pass password; if missing, bail (keeps your behavior)
    if (!password) return false;

    const key = await deriveKey(password);
    setCryptoKey(key);

    const loaded = (await loadEncrypted()) || defaultData();
    setData(loaded);

    return true;
  }

  return { initAuth, unlockSession };
}