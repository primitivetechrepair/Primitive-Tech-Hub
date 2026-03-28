// ./src/controllers/renderAllController.js

export function createRenderAllController({
  el,

  // data access
  getData,
  isUnlocked,

  // utils
  esc,
  fmtDate,
  fmtDateShort,
  fmtMoney,
  addListItem,

  // constants
  STATUS_ORDER,

  // services/controllers used by renderers
  inventoryService,
  leadsService,
  leadCostService,
  aiSuggestionService,
  invoiceService,
  inventoryController,
  leadsController,
  auditService,
  upsertLeadToCloud,
  upsertInventoryItemToCloud,

  // actions
  deleteActions,
  addPartToLead,
  removePartFromLead,
  showItemHistory,
  addSwipeQuickUse,

  // lead parts shape normalizer
  ensureLeadPartsShape,

  // cloud sync + notifications
  queueCloudSync,
  maybeNotifyLowStock,

  // admin gate
  isAdminEnabled,
  verifyAdminPin,

  // charts
  chartsCtx,
  renderCharts,

  // renderers
  renderInventory,
  renderInventoryOptions,
  renderLeads,
  renderForecast,
  renderProfit,
  renderInvoiceHistory,
  renderRestock,
  renderReminders,
  renderAuditLog,
  renderCustomerHistory,
  renderDeletedLeads,
  renderScanLeadOptions,

  // inventory UI helpers
  inventoryStatusByColorRule,

  // toast
  toast,

  // optional injections
  addAudit,
  persist,
}) {
  function renderAll() {
    const data = getData();

    renderInventory({
      el,
      data,
      inventoryStatusByColorRule,
      esc,
      fmtDate,
      addListItem,
      isUnlocked,
      toast,
      inventoryService,
      addAudit,
      persist,
      upsertInventoryItemToCloud,
      renderAll,
      maybeNotifyLowStock,
      quickUseItem: inventoryController.quickUseItem,
      showItemHistory,
      deleteInventoryItem: deleteActions.deleteInventoryItem,
      addSwipeQuickUse,
    });

    renderInventoryOptions({ el, data });

    renderLeads({
      el,
      data,
      esc,
      toast,
      isUnlocked,
      renderAll,

      ensureLeadPartsShape,
      leadPartsCost: leadCostService.leadPartsCost,
      STATUS_ORDER,
      fmtMoney,
      fmtDateShort,
      aiSuggestion: aiSuggestionService.aiSuggestion,

      leadsService,
      queueCloudSync,
      upsertLeadToCloud,
      persist,
      addAudit,
      createAndSendInvoice: invoiceService.createAndSendInvoice,
      addPartToLead,
      removePartFromLead,
      deleteLead: deleteActions.deleteLead,
    });

    renderCharts(chartsCtx());

    renderForecast({ el, data, addListItem });

    renderProfit({
      el,
      data,
      addListItem,
      leadPartsCost: leadCostService.leadPartsCost,
    });

    renderInvoiceHistory({
      el,
      data,
      addListItem,
      fmtDateShort,
      fmtMoney,
    });

    renderRestock({ el, data, addListItem });
    renderReminders({ el, data, addListItem });

    renderAuditLog({
      el,
      data,
      fmtDate,
      toast,
      isAdminEnabled,
      verifyAdminPin,
      auditService,
      renderAuditLog,
    });

    renderCustomerHistory({
      el,
      data,
      fmtDateShort,
      isAdminEnabled,
      verifyAdminPin,
      toast,
      addAudit,
      persist,
      renderAll,
      createAndSendInvoice: invoiceService.createAndSendInvoice,
    });

        renderDeletedLeads({
      el,
      data,
      fmtDateShort,
      restoreLead: deleteActions.restoreLead,
    });

    if (el.undoDeleteLeadBtn) {
      el.undoDeleteLeadBtn.onclick = () => deleteActions.undoDeleteLead();
    }

    renderScanLeadOptions({ el, data, esc });
  }

  return { renderAll };
}