// src/ui/appVisibility.js

function fadeOut(el, callback) {
  el.style.opacity = "0";
  setTimeout(callback, 200);
}

function fadeIn(el) {
  el.style.opacity = "0";
  el.classList.remove("hidden");

  requestAnimationFrame(() => {
    el.style.opacity = "1";
  });
}

export function showLockedUI(el) {
  fadeOut(el.app, () => {
    el.app.classList.add("hidden");

    el.authScreen.classList.remove("hidden");
    fadeIn(el.authScreen);

    el.loginForm.classList.remove("hidden");
    el.setupForm.classList.add("hidden");
  });
}

export function showUnlockedUI(el) {
  fadeOut(el.authScreen, () => {
    el.authScreen.classList.add("hidden");

    el.app.classList.remove("hidden");
    fadeIn(el.app);
  });
}