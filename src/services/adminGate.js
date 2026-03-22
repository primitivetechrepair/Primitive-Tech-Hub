// ./src/services/adminGate.js
export function createAdminGate({ authStore, pinKey, sha256, showModal, toast, el }) {
  function isAdminEnabled() {
    return !!authStore.getPinHash({ pinKey });
  }

  async function verifyAdminPin() {
    const pinHash = authStore.getPinHash({ pinKey });
    if (!pinHash) {
      toast(el, "Admin PIN is not configured.", "error");
      return false;
    }

    const entered = showModal(el, {
      title: "Admin Verification",
      message: "Enter Admin PIN to continue.",
      requireInput: true,
      confirmText: "Verify",
    });

    if (!entered) return false;
    return (await sha256(String(entered).trim())) === pinHash;
  }

  return { isAdminEnabled, verifyAdminPin };
}