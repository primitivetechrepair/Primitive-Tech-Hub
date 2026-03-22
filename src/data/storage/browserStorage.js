// src/data/storage/browserStorage.js
export const browserStorage = {
  lsGet(key) {
    return localStorage.getItem(key);
  },
  lsSet(key, value) {
    localStorage.setItem(key, value);
  },
  lsRemove(key) {
    localStorage.removeItem(key);
  },

  ssGet(key) {
    return sessionStorage.getItem(key);
  },
  ssSet(key, value) {
    sessionStorage.setItem(key, value);
  },
  ssRemove(key) {
    sessionStorage.removeItem(key);
  },
};
