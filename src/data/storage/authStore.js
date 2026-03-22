// src/data/storage/authStore.js
export const authStore = {
  async setAuthHash({ authKey, sha256, password }) {
    localStorage.setItem(authKey, await sha256(password));
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
