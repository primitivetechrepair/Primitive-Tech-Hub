// ./src/ui/skeletons.js
let initialSkeletonShown = false;

export function showSkeletonsOnce({ el, renderAll }) {
  if (initialSkeletonShown) return;
  initialSkeletonShown = true;

  document.querySelectorAll('.charts > div').forEach((card) => card.classList.add('skeleton-card'));
  [el.inventoryBody, el.leadsBody].forEach((tb) => {
    if (!tb) return;
    tb.innerHTML = '<tr><td colspan="16"><div class="skeleton-row"></div><div class="skeleton-row"></div></td></tr>';
  });

  setTimeout(() => {
    document.querySelectorAll('.skeleton-card').forEach((card) => card.classList.remove('skeleton-card'));
    renderAll();
  }, 450);
}