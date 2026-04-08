// src/ui/listManagerModal.js
export function createListManagerModal({
  el,
  getData,
  persist,
  toast,
  esc,
  isUnlocked,
  settingsUI,
  saveAppSettingsToCloud,
}) {
  const modal = document.getElementById("listManagerModal");
  const chipsEl = document.getElementById("listManagerChips");
  const inputEl = document.getElementById("listManagerInput");
  const addBtn = document.getElementById("listManagerAddBtn");
  const saveBtn = document.getElementById("listManagerSaveBtn");
  const titleEl = document.getElementById("listManagerTitle");
  const subEl = document.getElementById("listManagerSub");

  const devicesBadge = document.getElementById("devicesCountBadge");
  const brandsBadge = document.getElementById("brandsCountBadge");
  const repairsBadge = document.getElementById("repairsCountBadge");

  if (!modal || !chipsEl || !inputEl || !addBtn || !saveBtn || !titleEl || !subEl) {
    throw new Error("ListManagerModal: Missing required modal DOM elements.");
  }

  let wired = false;

  let current = {
    key: null, // "categories" | "brands" | "repairs"
    title: "Manage List",
    sub: "Add/remove items. Changes update the app immediately. Click Save to persist.",
    items: [],
  };

  let dirty = false;
  let dragIndex = null;

  function setDirty(v) {
    dirty = !!v;
    saveBtn.disabled = !dirty;
    saveBtn.classList.toggle("is-disabled", !dirty);
    saveBtn.textContent = dirty ? "Save Changes" : "Saved";
  }

  function show() {
    modal.classList.remove("hidden");
    requestAnimationFrame(() => modal.classList.add("is-open"));
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => inputEl.focus(), 0);
  }

  function hide() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      modal.classList.add("hidden");
      inputEl.value = "";
      dragIndex = null;
    }, 170);
  }

  function parseList(str) {
    return [
      ...new Set(
        String(str || "")
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    ];
  }

  function normalizeSettingsShape(settings = {}) {
    const next = { ...settings };

    const categories =
      Array.isArray(next.categories) && next.categories.length
        ? next.categories
        : ["iPhone", "Samsung", "Accessories", "Tools", "Other"];

    const repairs =
      Array.isArray(next.repairs) && next.repairs.length
        ? next.repairs
        : ["Screen", "Battery", "Charging Port", "Water Damage", "Other"];

    const brands =
      Array.isArray(next.brands) && next.brands.length
        ? next.brands
        : ["Apple", "Samsung", "LG", "Sony", "Other"];

    next.categories = [...categories];
    next.repairs = [...repairs];
    next.brands = [...brands];

    return next;
  }

  function loadItemsFromData() {
    const data = getData();
    data.settings = normalizeSettingsShape(data.settings || {});
    const arr = Array.isArray(data.settings[current.key]) ? data.settings[current.key] : [];
    current.items = [...arr];
  }

  function writeItemsToData() {
    const data = getData();
    data.settings = normalizeSettingsShape(data.settings || {});
    data.settings[current.key] = [...current.items];
  }

  function refreshCountBadges() {
    const data = getData();
    const s = normalizeSettingsShape(data.settings || {});

    if (devicesBadge) devicesBadge.textContent = String(s.categories.length);
    if (brandsBadge) brandsBadge.textContent = String(s.brands.length);
    if (repairsBadge) repairsBadge.textContent = String(s.repairs.length);
  }

  function refreshDependentUI() {
    if (settingsUI?.syncSettingsUI) {
      settingsUI.syncSettingsUI();
    } else {
      settingsUI?.refreshCategoryOptions?.();
      settingsUI?.refreshSeriesOptions?.();
      settingsUI?.refreshRepairOptions?.();
    }
    refreshCountBadges();
  }

  function applyLiveChange() {
    writeItemsToData();
    refreshDependentUI();
    setDirty(true);
  }

  function makeChip(label, index) {
    const chip = document.createElement("span");
    chip.className = "pt-chip";
    chip.setAttribute("draggable", "true");
    chip.dataset.index = String(index);

    chip.innerHTML = `
      <span class="pt-chip__label">${esc(label)}</span>
      <button type="button" class="pt-chip__x" aria-label="Remove ${esc(label)}" data-remove="${esc(label)}">✕</button>
    `;

    chip.addEventListener("dragstart", (e) => {
      dragIndex = Number(chip.dataset.index);
      chip.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", chip.dataset.index);
    });

    chip.addEventListener("dragend", () => {
      chip.classList.remove("is-dragging");
      dragIndex = null;
      [...chipsEl.querySelectorAll(".pt-chip")].forEach((c) =>
        c.classList.remove("is-drop-target")
      );
    });

    chip.addEventListener("dragover", (e) => {
      e.preventDefault();
      chip.classList.add("is-drop-target");
      e.dataTransfer.dropEffect = "move";
    });

    chip.addEventListener("dragleave", () => {
      chip.classList.remove("is-drop-target");
    });

    chip.addEventListener("drop", (e) => {
      e.preventDefault();
      chip.classList.remove("is-drop-target");

      const from = Number(e.dataTransfer.getData("text/plain"));
      const to = Number(chip.dataset.index);
      if (Number.isNaN(from) || Number.isNaN(to) || from === to) return;

      const next = [...current.items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      current.items = next;

      renderChips();
      applyLiveChange();
    });

    return chip;
  }

  function renderChips() {
    chipsEl.innerHTML = "";

    if (!current.items.length) {
      chipsEl.innerHTML = `<span class="muted" style="opacity:.8">No items yet.</span>`;
      return;
    }

    current.items.forEach((label, idx) => {
      chipsEl.appendChild(makeChip(label, idx));
    });
  }

  function open({ key, title, placeholder }) {
    current.key = key;
    current.title = title || "Manage List";
    current.sub =
      "Add/remove items. Changes update the app immediately. Click Save to persist.";

    titleEl.textContent = current.title;
    subEl.textContent = current.sub;

    if (placeholder) inputEl.placeholder = placeholder;

    loadItemsFromData();
    renderChips();
    setDirty(false);
    show();
  }

  async function addFromInput() {
    const toAdd = parseList(inputEl.value);
    if (!toAdd.length) return;

    const set = new Set(current.items.map((x) => String(x).trim()));
    toAdd.forEach((v) => set.add(v));
    current.items = [...set];

    inputEl.value = "";
    renderChips();
    applyLiveChange();
  }

  async function save() {
    if (typeof isUnlocked === "function" && !isUnlocked()) {
      toast(el, "Locked: log in to save list changes.", "error");
      return;
    }

    if (!dirty) {
      toast(el, "No changes to save.", "info");
      return;
    }

    try {
      writeItemsToData();
      await persist();

      if (saveAppSettingsToCloud) {
        try {
          await saveAppSettingsToCloud();
        } catch (err) {
          console.error("ListManagerModal cloud sync failed:", err);
          toast(el, "Saved locally, but cloud sync failed.", "warning");
        }
      }

      setDirty(false);
      refreshDependentUI();
      toast(el, "Saved.", "success");

      setTimeout(() => {
        hide();
      }, 250);
    } catch (err) {
      console.error("ListManagerModal save failed:", err);
      toast(el, "Save failed. Check console for details.", "error");
    }
  }

  function wireOnce() {
    if (wired) return;
    wired = true;

    refreshCountBadges();

    modal.addEventListener("click", (e) => {
      const target = e.target;

      if (target?.closest?.('[data-close="true"]')) {
        hide();
        return;
      }

      if (target === modal) {
        hide();
      }
    });

    chipsEl.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-remove]");
      if (!btn) return;

      const label = btn.getAttribute("data-remove");
      current.items = current.items.filter((x) => String(x) !== String(label));
      renderChips();
      applyLiveChange();
    });

    addBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await addFromInput();
    });

    inputEl.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        await addFromInput();
      }
    });

    saveBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await save();
    });

    document.getElementById("manageDevicesBtn")?.addEventListener("click", () =>
      open({
        key: "categories",
        title: "Manage Devices",
        placeholder: "iPhone, Samsung, Accessories…",
      })
    );

    document.getElementById("manageBrandsBtn")?.addEventListener("click", () =>
      open({
        key: "brands",
        title: "Manage Brands",
        placeholder: "Apple, Samsung, LG…",
      })
    );

    document.getElementById("manageRepairsBtn")?.addEventListener("click", () =>
      open({
        key: "repairs",
        title: "Manage Repairs",
        placeholder: "Screen, Battery, Charging Port…",
      })
    );
  }

  return { wireOnce, open, refreshCountBadges };
}