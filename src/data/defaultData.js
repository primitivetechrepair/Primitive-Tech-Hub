export function defaultData() {
  return {
    settings: {
      defaultThreshold: 5,
      mediumOffset: 5,

      // ✅ Removed default dropdown values (you now use custom only)
      categories: [],
      series: [],
      repairs: [],
      brands: [],

      followupDays: 3
    },

    inventory: [],
    leads: [],

    // ✅ NEW: Deleted leads archive (for restore system)
    deletedLeads: [],

    auditLog: [],

    // sequential invoice numbering
    invoiceCounter: 1,

    // saved invoice history
    invoices: [],

    backups: {
      lastAutoBackup: 0
    },

    pendingCloudSync: []
  };
}