export const authStore = {
  async setAuthHash({ authKey, deriveAuthHash, createAuthSalt, password }) {
    const salt = createAuthSalt();
    const hash = await deriveAuthHash(password, salt);

    localStorage.setItem(
      authKey,
      JSON.stringify({
        v: 2,
        salt,
        hash,
      })
    );
  },

  async setPinHash({ pinKey, sha256, pin }) {
    localStorage.setItem(pinKey, pin ? await sha256(pin) : "");
  },

  setSessionOk({ sessionKey }) {
    sessionStorage.setItem(sessionKey, "ok");
  },

  clearSession({ sessionKey }) {
    sessionStorage.removeItem(sessionKey);
  },

  getAuthRecord({ authKey }) {
    const raw = localStorage.getItem(authKey);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === 2 && parsed.salt && parsed.hash) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  getAuthHash({ authKey }) {
    return localStorage.getItem(authKey);
  },

  getPinHash({ pinKey }) {
    return localStorage.getItem(pinKey);
  },

  hasSessionOk({ sessionKey }) {
    return sessionStorage.getItem(sessionKey) === "ok";
  },
};