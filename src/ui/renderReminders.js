// src/ui/renderReminders.js
export function renderReminders(ctx) {
  const { el, data, addListItem } = ctx;

  el.reminderList.innerHTML = "";

  const cutoff =
    Date.now() - (data.settings?.followupDays || 0) * 86400000;

  data.leads.forEach((lead) => {
    const stale =
      new Date(lead.lastUpdated || lead.dateReported).getTime() <
      cutoff;

    if (stale && lead.status !== "Completed") {
      addListItem(
        el.reminderList,
        `${lead.leadID} (${lead.customerName}) inactive > ${data.settings.followupDays}d`
      );
    }
  });
}