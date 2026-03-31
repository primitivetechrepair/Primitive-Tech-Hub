import "./bootstrapLegacy.js";

if ("ontouchstart" in window) {
  let lastTouchEnd = 0;

  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );

  document.addEventListener(
    "gesturestart",
    (e) => e.preventDefault(),
    { passive: false }
  );

  document.addEventListener(
    "gesturechange",
    (e) => e.preventDefault(),
    { passive: false }
  );

  document.addEventListener(
    "gestureend",
    (e) => e.preventDefault(),
    { passive: false }
  );
}