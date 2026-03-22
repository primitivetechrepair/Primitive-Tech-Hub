// src/ui/renderInventoryOptions.js
export function renderInventoryOptions(ctx) {
  const { el, data } = ctx;

  el.leadInventoryUsed.innerHTML = "";

  data.inventory.forEach((item) => {
    const o = document.createElement("option");
    o.value = item.itemID;
    o.textContent = `${item.itemName} (${item.itemID}) qty:${item.quantity}`;
    el.leadInventoryUsed.appendChild(o);
  });
}