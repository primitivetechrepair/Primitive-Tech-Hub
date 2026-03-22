export function createInvoiceService({
  getData,
  persist,
  download,
  leadPartsCost,
  setIntegrationLog,
  queueCloudSync,
  addAudit,
  toast,
}) {
async function buildInvoicePdfBytes(invoice) {
  if (!window.PDFLib) throw new Error("PDFLib not loaded. Add pdf-lib script before main.js.");
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const M = 48;
  const BASE = 11;
  const SMALL = 9.5;
  const H1 = 20;
  const H2 = 12;

  const colorText = rgb(0.12, 0.12, 0.14);
  const colorMuted = rgb(0.45, 0.45, 0.5);
  const colorLine = rgb(0.82, 0.82, 0.86);
  const colorPanel = rgb(0.965, 0.965, 0.975);

  const money = (n) => {
    const v = Number(n || 0);
    return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
  };

  const formatDate = (iso) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return String(iso || "");
    }
  };

  const widthOf = (txt, size, bold = false) =>
    (bold ? fontBold : font).widthOfTextAtSize(String(txt || ""), size);

  const drawText = (txt, x, y, size = BASE, bold = false, color = colorText) => {
    page.drawText(String(txt ?? ""), {
      x,
      y,
      size,
      font: bold ? fontBold : font,
      color,
    });
  };

  const line = (x1, y1, x2, y2) =>
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness: 1,
      color: colorLine,
    });

  const box = (x, y, w, h) =>
    page.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      color: colorPanel,
      borderColor: colorLine,
      borderWidth: 1,
    });

  const wrap = (txt, maxWidth, size = BASE, bold = false) => {
    const words = String(txt || "").split(/\s+/).filter(Boolean);
    if (!words.length) return [""];
    const lines = [];
    let cur = words[0];
    for (let i = 1; i < words.length; i++) {
      const t = `${cur} ${words[i]}`;
      if (widthOf(t, size, bold) <= maxWidth) cur = t;
      else {
        lines.push(cur);
        cur = words[i];
      }
    }
    lines.push(cur);
    return lines;
  };

  let y = height - M;

  const logoUrl = "/logo2.png";
  const logoBytes = await fetch(logoUrl).then((res) => res.arrayBuffer());
  const logoImage = await pdfDoc.embedPng(logoBytes);
  const logoDims = logoImage.scale(0.05);

  page.drawImage(logoImage, {
    x: M,
    y: y - logoDims.height,
    width: logoDims.width,
    height: logoDims.height,
  });

  const metaW = 240;
  const metaH = 82;
  const metaX = width - M - metaW;
  const metaY = y - 56;

  box(metaX, metaY, metaW, metaH);

  drawText("INVOICE #", metaX + 12, metaY + metaH - 18, SMALL, true, colorMuted);
  drawText(invoice.invoiceId, metaX + 12, metaY + metaH - 34, BASE, true);

  drawText("DATE", metaX + 12, metaY + metaH - 52, SMALL, true, colorMuted);
  drawText(formatDate(invoice.completedAt), metaX + 12, metaY + metaH - 68, SMALL, false, colorMuted);

  y = metaY - 16;
  line(M, y, width - M, y);
  y -= 18;

  const panelH = 180;
  box(M, y - panelH, width - 2 * M, panelH);

  drawText("CUSTOMER", M + 12, y - 18, SMALL, true, colorMuted);
  drawText(invoice.customer || "—", M + 12, y - 36, BASE, true);
  if (invoice.email) drawText(invoice.email, M + 12, y - 52, SMALL, false, colorMuted);
  if (invoice.contact) drawText(invoice.contact, M + 12, y - 66, SMALL, false, colorMuted);

  const rx = M + 320;
  let ry = y - 18;

  drawText("DEVICE", rx, ry, SMALL, true, colorMuted);
  ry -= 18;
  drawText(invoice.device || "—", rx, ry, BASE, true);

  ry -= 26;
  drawText("SERIES", rx, ry, SMALL, true, colorMuted);
  ry -= 18;
  drawText(invoice.series || "—", rx, ry, SMALL, false, colorMuted);

  ry -= 26;
  drawText("IMEI / SERIAL", rx, ry, SMALL, true, colorMuted);
  ry -= 18;
  drawText(invoice.imeiSerial || "—", rx, ry, SMALL, false, colorMuted);

  ry -= 26;
  drawText("REPAIR", rx, ry, SMALL, true, colorMuted);
  ry -= 18;

  const repairLines = wrap(invoice.repair || "—", width - M - rx - 12, SMALL, false);
  drawText(repairLines[0] || "—", rx, ry, SMALL, false, colorMuted);

  y = y - panelH - 18;

  drawText("Repair Summary", M, y, H2, true);
  y -= 12;
  line(M, y, width - M, y);
  y -= 18;

  const tableW = width - 2 * M;
  const xDesc = M;
  const xQty = width - M - 60;

  drawText("Description", xDesc, y, SMALL, true, colorMuted);
  drawText("Qty", xQty, y, SMALL, true, colorMuted);
  y -= 10;
  line(M, y, width - M, y);
  y -= 16;

  const items = Array.isArray(invoice.lineItems) && invoice.lineItems.length
    ? invoice.lineItems
    : [{ desc: "No parts recorded", qty: "" }];

  for (const it of items) {
    if (y < 190) break;

    const descLines = wrap(it.desc, tableW - 90, BASE, false);
    drawText(descLines[0], xDesc, y, BASE);

    if (it.qty !== "") {
      drawText(String(it.qty), xQty, y, BASE);
    }

    y -= 14;

    for (let i = 1; i < descLines.length; i++) {
      if (y < 190) break;
      drawText(descLines[i], xDesc, y, BASE, false, colorMuted);
      y -= 14;
    }

    y -= 6;
  }

  y -= 6;
  line(M, y, width - M, y);
  y -= 16;

  const totalsW = 260;
  const totalsH = 100;
  const totalsX = width - M - totalsW;
  const totalsY = 120;

  box(totalsX, totalsY, totalsW, totalsH);

  const isPaid = (invoice.paymentStatus || "").toLowerCase() === "paid";
  const totalDue = isPaid ? 0 : Number(invoice.charged || 0);

  const totals = [
    ["Total Due", money(totalDue)]
  ];

  // Highlight PAID
  if (isPaid) {
    drawText("PAID", totalsX + 12, totalsY - 20, 14, true, rgb(0, 0.6, 0));

    // Add the payment method to the invoice
    drawText("Payment Method:", M + 12, y - 50, SMALL, true, colorMuted);
    drawText(invoice.paymentMethod || "Unspecified", M + 12, y - 66, BASE, true);  // Display payment method
  }

  let ty = totalsY + totalsH - 24;
  for (const [k, v] of totals) {
    drawText(k, totalsX + 12, ty, 11, true, colorText);
    const vw = widthOf(v, 15, true);
    drawText(v, totalsX + totalsW - 12 - vw, ty - 18, 15, true, colorText);
    ty -= 34;
  }

  box(M, 96, 180, 24);
  drawText("90-DAY REPAIR WARRANTY", M + 12, 104, 9, true, colorText);

  drawText("Thank you for choosing Primitive Tech.", M, 72, SMALL, false, colorMuted);
  drawText("Support: primitiverepairs@gmail.com  |  (786) 404-7011  |  www.primitiverepairs.com", M, 58, SMALL, false, colorMuted);

  return await pdfDoc.save();
}

  async function downloadInvoicePdf(invoice) {
    const bytes = await buildInvoicePdfBytes(invoice);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.invoiceId}.pdf`;
    a.click();

    URL.revokeObjectURL(url);
  }

  async function createAndSendInvoice(lead) {
    const partsCost = leadPartsCost(lead);

    const data = getData();

    const invoiceNumber = String(data.invoiceCounter || 1).padStart(4, "0");

    data.invoiceCounter = (data.invoiceCounter || 1) + 1;

    const repairAmount = Number(lead.repairCost ?? lead.chargedAmount ?? 0);
    const laborAmount = Number(lead.laborAmount || 0);

    const charged = repairAmount + laborAmount;
    const profit = charged - partsCost;

    const money = (n) =>
      Number(n || 0).toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
      });

const invoice = {
  invoiceId: `INV-${invoiceNumber}`,
  leadID: lead.leadID,
  customer: lead.customerName,
  email: lead.email || "",
  contact: lead.contactNumber || "",
  device: lead.device,
  series: lead.series,
  imeiSerial: lead.imeiSerial || lead.serialNumber || "",
  repair: lead.repairType || lead.issueDescription || "",
  inventoryUsed: lead.inventoryUsed,
  charged,
  partsCost,
  profit,
  completedAt: new Date().toISOString(),
  paymentMethod: lead.paymentMethod || "",  // Ensure payment method is passed
  paymentStatus: lead.paymentStatus || "Unpaid", // Ensure payment status is passed
};

    data.invoices = Array.isArray(data.invoices) ? data.invoices : [];
    data.invoices.unshift({
      ...invoice,
      laborAmount,
      repairAmount,
    });

    const repairDesc = [
      lead.device,
      lead.series,
      lead.repairType || lead.issueDescription
    ]
      .filter(Boolean)
      .join(" ");

    invoice.lineItems = [
      {
        desc: repairDesc,
        qty: 1,
      },
    ];

    if (lead.laborAmount) {
      invoice.lineItems.push({
        desc: `Labor - ${money(lead.laborAmount)}`,
        qty: "",
      });
    }

    await downloadInvoicePdf(invoice);

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoice),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Invoice backend HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`
        );
      }

      setIntegrationLog(`Invoice sent to backend for ${lead.leadID}.`);
    } catch (err) {
      queueCloudSync("invoice_pending", invoice);
      const msg = err?.message ? ` (${err.message})` : "";
      setIntegrationLog(`Backend unavailable; invoice queued for ${lead.leadID}.${msg}`);
    }

    addAudit("invoice_generated", {
      leadID: lead.leadID,
      invoiceId: invoice.invoiceId,
      userAction: "invoice_export",
    });

    toast(`Invoice ${invoice.invoiceId} generated.`, "success");
    await persist();
  }

  return { createAndSendInvoice };
}