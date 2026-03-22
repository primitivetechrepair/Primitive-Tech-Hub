// src/services/leadsService.js
export function createLeadsService({ getData, setData, persist }) {
  return {
    list() {
      return getData().leads || [];
    },

    addLead(lead) {
      const data = getData();
      data.leads = data.leads || [];
      data.leads.unshift(lead);
      setData(data);
      persist();
      return lead;
    },

    // ✅ ADD THIS METHOD
    updateLead(leadID, patch) {
      const data = getData();
      const lead = (data.leads || []).find((l) => l.leadID === leadID);
      if (!lead) return null;

      Object.assign(lead, patch);
      lead.lastUpdated = new Date().toISOString();

      setData(data);
      persist();

      return lead;
    },
  };
}
