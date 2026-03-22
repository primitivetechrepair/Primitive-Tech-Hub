# Primitive Tech Hub

Private, mobile-first, offline-capable repair shop app with encrypted local persistence.

## Implemented Features
- Inventory + Repair Leads tables with inline editing and dashboard charts.
- **Stock History / Audit Log** with timestamped actions for adds, usage, CSV updates, and manual adjustments.
- **Per-item inventory history view** via row "View" action.
- **Auto low-stock notifications** (in-app + browser notification request path) integrated with color-coded row alerts.
- **Quick Action:** "Use Inventory for Repair" deducts linked parts and updates lead status in one click.
- **Follow-up reminders** for stale leads using `lastUpdated` age.
- Dynamic charts: leads by status, device pie (optional), leads day/week/month trend, common repair types.
- **Customer history tracking** with linked repair summaries by customer.
- **Status automation:** lead auto-switches to `Waiting for Parts` when linked inventory is below threshold.
- Color-coded inventory rules: **Red < 5**, **Yellow 5–9**, **Green >= 10**.
- **Bulk CSV import** supports add-or-update behavior by `ItemID`.
- **Restock suggestions** using usage history + scheduled demand from open leads.
- **File attachments** on leads (images/docs) with downloadable links.
- **Profit tracking** per repair (`chargedAmount - parts cost`) and inventory forecasting on dashboard.
- Real-time search/filter for inventory and leads.

- Offline-first connectivity indicator with queued sync simulation when connection returns.
- Daily automated local backup snapshot + on-demand JSON/CSV downloads.
- Camera-based barcode/QR scanner panel (BarcodeDetector when supported) with manual fallback.
- Scan actions to add/update inventory and attach scanned part IDs to leads.
- Export hooks for Google Calendar (ICS) and QuickBooks-style CSV.
- Mobile refinements: swipe-left on inventory rows for quick -1 usage, scanner/table responsive tweaks.
- AI suggestions enhanced with device-specific historical repair patterns.

## Run
Open `index.html` in a modern browser (localhost recommended for service worker and notification behavior).
