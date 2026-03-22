export function createBottomBarController() {
  let bottomBarWired = false;

  function wireBottomBarOnce() {
    if (bottomBarWired) return;
    bottomBarWired = true;

    document.querySelectorAll('.bottom-bar .bb-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        const action = btn.getAttribute('data-action');

        if (target) {
          const section = document.querySelector(target);
          if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (action === 'addLead') {
          const leadsSection = document.querySelector('#leadsSection');
          if (leadsSection) leadsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

          setTimeout(() => {
            const leadIdInput = document.getElementById('leadID');
            if (leadIdInput) leadIdInput.focus();
          }, 300);
        }
      });
    });
  }

  return { wireBottomBarOnce };
}