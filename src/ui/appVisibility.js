// src/ui/appVisibility.js

export function showLockedUI(el) {
  el.authScreen.classList.remove("hidden");
  el.app.classList.add("hidden");

  el.loginForm.classList.remove("hidden");
  el.setupForm.classList.add("hidden");
}

export function showUnlockedUI(el) {
  el.authScreen.classList.add("hidden");
  el.app.classList.remove("hidden");
}