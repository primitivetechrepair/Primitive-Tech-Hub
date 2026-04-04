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
    if (!window.PDFLib) {
      throw new Error("PDFLib not loaded. Add pdf-lib script before main.js.");
    }

    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const M = 64;
    const BASE = 11;
    const SMALL = 9.5;
    const H2 = 12;

    const colorText = rgb(0.12, 0.12, 0.14);
    const colorMuted = rgb(0.45, 0.45, 0.5);
    const colorLine = rgb(0.82, 0.82, 0.86);
    const colorPanel = rgb(0.965, 0.965, 0.975);
    const colorPaid = rgb(0.0, 0.55, 0.18);

    const money = (n) => {
      const v = Number(n || 0);
      return v.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
      });
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

    const drawRightText = (txt, rightX, y, size = BASE, bold = false, color = colorText) => {
      const text = String(txt ?? "");
      const tw = widthOf(text, size, bold);
      drawText(text, rightX - tw, y, size, bold, color);
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

    // Logo
    try {
      const logoUrl = "/logo2.png";
      const logoBytes = await fetch(logoUrl).then((res) => {
        if (!res.ok) throw new Error("Logo not found");
        return res.arrayBuffer();
      });

      const logoImage = await pdfDoc.embedPng(logoBytes);
      const logoDims = logoImage.scale(0.05);

      page.drawImage(logoImage, {
        x: M,
        y: y - logoDims.height + 6,
        width: logoDims.width,
        height: logoDims.height,
      });
    } catch {
      // Safe fallback: no logo
    }

    const metaW = 220;
    const metaH = 96;
    const metaX = width - M - metaW;
    const metaY = y - 40;

    box(metaX, metaY, metaW, metaH);

    drawText("INVOICE #", metaX + 12, metaY + metaH - 18, SMALL, true, colorMuted);
    drawText(invoice.invoiceId, metaX + 12, metaY + metaH - 34, BASE, true);

    drawText("DATE", metaX + 12, metaY + metaH - 52, SMALL, true, colorMuted);
    drawText(
      formatDate(invoice.completedAt),
      metaX + 12,
      metaY + metaH - 68,
      SMALL,
      false,
      colorMuted
    );

    drawText("STATUS", metaX + 12, metaY + metaH - 84, SMALL, true, colorMuted);
    drawText(
      (invoice.paymentStatus || "Unpaid").toUpperCase(),
      metaX + 70,
      metaY + metaH - 84,
      SMALL,
      true,
      (invoice.paymentStatus || "").toLowerCase() === "paid" ? colorPaid : colorText
    );

    y = metaY - 16;
    line(M, y, width - M, y);
    y -= 18;

    const panelH = 188;
    box(M, y - panelH, width - 2 * M, panelH);

    // Left column: customer
    drawText("CUSTOMER", M + 12, y - 18, SMALL, true, colorMuted);
    drawText(invoice.customer || "—", M + 12, y - 36, BASE, true);

    if (invoice.email) {
      drawText(invoice.email, M + 12, y - 54, SMALL, false, colorMuted);
    }

    if (invoice.contact) {
      drawText(invoice.contact, M + 12, y - 70, SMALL, false, colorMuted);
    }

    if (invoice.address) {
      const addressLines = wrap(invoice.address, 250, SMALL, false);
      let ay = y - 88;

      for (const ln of addressLines) {
        drawText(ln, M + 12, ay, SMALL, false, colorMuted);
        ay -= 14;
      }
    }

    // Right column: device/service
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
    for (const ln of repairLines) {
      drawText(ln, rx, ry, SMALL, false, colorMuted);
      ry -= 14;
    }

    y = y - panelH - 18;

    drawText("Service & Parts Breakdown", M, y, H2, true);
    y -= 12;
    line(M, y, width - M, y);
    y -= 18;

    const tableRight = width - M;
    const xDesc = M;
    const xQty = width - M - 120;
    const xAmt = width - M;

    drawText("Description", xDesc, y, SMALL, true, colorMuted);
    drawText("Qty", xQty, y, SMALL, true, colorMuted);
    drawRightText("Amount", xAmt, y, SMALL, true, colorMuted);

    y -= 10;
    line(M, y, width - M, y);
    y -= 16;

    const items =
      Array.isArray(invoice.lineItems) && invoice.lineItems.length
        ? invoice.lineItems
        : [{ desc: "No items recorded", qty: "", amount: "" }];

    for (const it of items) {
      if (y < 210) break;

      const descLines = wrap(it.desc, tableRight - xDesc - 145, BASE, false);
      drawText(descLines[0] || "", xDesc, y, BASE);

      if (it.qty !== "" && it.qty !== null && it.qty !== undefined) {
        drawText(String(it.qty), xQty, y, BASE);
      }

      if (it.amount !== "" && it.amount !== null && it.amount !== undefined) {
        drawRightText(money(it.amount), xAmt, y, BASE);
      }

      y -= 14;

      for (let i = 1; i < descLines.length; i++) {
        if (y < 210) break;
        drawText(descLines[i], xDesc, y, BASE, false, colorMuted);
        y -= 14;
      }

      y -= 8;
    }

    y -= 4;
    line(M, y, width - M, y);
    y -= 18;

    const totalsW = 260;
    const totalsH = invoice.laborAmount > 0 ? 118 : 92;
    const totalsX = width - M - totalsW;
    const totalsY = -100;

    box(totalsX, totalsY, totalsW, totalsH);

    const isPaid = (invoice.paymentStatus || "").toLowerCase() === "paid";
    const totalDue = isPaid ? 0 : Number(invoice.charged || 0);

    const totals = [["Repair Cost", money(invoice.repairAmount || 0)]];

    if (Number(invoice.laborAmount || 0) > 0) {
      totals.push(["Labor", money(invoice.laborAmount || 0)]);
    }

    totals.push(["Total Due", money(totalDue)]);

    let ty = totalsY + totalsH - 22;

    if (isPaid) {
      drawText("PAID", totalsX + 12, ty, 14, true, colorPaid);
      ty -= 20;
    }

    for (const [k, v] of totals) {
      const isTotal = k === "Total Due";
      drawText(k, totalsX + 12, ty, isTotal ? 12 : 11, true, colorText);
      drawRightText(v, totalsX + totalsW - 12, ty, isTotal ? 15 : 12, true, colorText);
      ty -= isTotal ? 30 : 22;
    }

    // Payment section
    const getRemotePngBytes = async (url) => {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.arrayBuffer();
  } catch (err) {
    console.error("Remote image fetch failed:", err);
    return null;
  }
};

const paymentBoxW = 220;
const paymentBoxH = 170;
const paymentBoxX = width - M - paymentBoxW;
const paymentBoxY = 70;

box(paymentBoxX, paymentBoxY, paymentBoxW, paymentBoxH);

drawText("PAYMENT", paymentBoxX + 12, paymentBoxY + paymentBoxH - 18, SMALL, true, colorMuted);

// Zelle QR (real uploaded image)
try {
  const zelleBytes = await fetch("/public/zelle-qr.jpg").then((res) => {
    if (!res.ok) throw new Error("Zelle QR not found");
    return res.arrayBuffer();
  });

  const zelleImage = await pdfDoc.embedJpg(zelleBytes);

  page.drawImage(zelleImage, {
    x: paymentBoxX + 16,
    y: paymentBoxY + 58,
    width: 82,
    height: 82,
  });

  drawText("Zelle", paymentBoxX + 40, paymentBoxY + 46, 9, true, colorText);
} catch (err) {
  drawText("Zelle QR missing", paymentBoxX + 16, paymentBoxY + 92, 9, true, colorMuted);
}

// Cash App QR (generated from actual Cash App URL)
try {
  const cashAppQrUrl =
    "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" +
    encodeURIComponent("https://cash.app/$Primitiverepairs");

  const cashBytes = await getRemotePngBytes(cashAppQrUrl);

  if (cashBytes) {
    const cashImage = await pdfDoc.embedPng(cashBytes);

    page.drawImage(cashImage, {
      x: paymentBoxX + 122,
      y: paymentBoxY + 58,
      width: 82,
      height: 82,
    });

    drawText("Cash App", paymentBoxX + 138, paymentBoxY + 46, 9, true, colorText);
  } else {
    drawText("Cash App QR missing", paymentBoxX + 118, paymentBoxY + 92, 9, true, colorMuted);
  }
} catch (err) {
  drawText("Cash App QR missing", paymentBoxX + 118, paymentBoxY + 92, 9, true, colorMuted);
}

drawText("Use invoice # when paying", paymentBoxX + 30, paymentBoxY + 18, 8.5, false, colorMuted);

    if (invoice.paymentMethod) {
      drawText(
        `Payment Method: ${invoice.paymentMethod}`,
        M,
        116,
        SMALL,
        true,
        colorMuted
      );
    }

    box(M, 88, 196, 24);
    drawText("90-DAY REPAIR WARRANTY", M + 12, 96, 9, true, colorText);

    drawText("Thank you for choosing Primitive Tech.", M, 64, SMALL, false, colorMuted);
    drawText(
      "Support: primitiverepairs@gmail.com  |  (786) 404-7011  |  www.primitiverepairs.com",
      M,
      50,
      SMALL,
      false,
      colorMuted
    );

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

    const inventory = Array.isArray(data.inventory) ? data.inventory : [];
    const used = Array.isArray(lead.inventoryUsed) ? lead.inventoryUsed : [];
    const qtyMap = lead.inventoryUsedQty || {};

    const partLines = used.map((id) => {
      const item = inventory.find((x) => x.itemID === id);
      const qty = Number(qtyMap[id] || 1);
      const name = item?.itemName || id;

      const meta = [
        item?.brand ? `Brand: ${item.brand}` : "",
        item?.series ? `Series: ${item.series}` : "",
        item?.partType ? `Part: ${item.partType}` : "",
      ]
        .filter(Boolean)
        .join(" • ");

      return {
        desc: meta ? `Part Used: ${name} (${meta})` : `Part Used: ${name}`,
        qty,
        amount: "",
      };
    });

    const repairDesc = [lead.device, lead.series, lead.repairType || lead.issueDescription]
      .filter(Boolean)
      .join(" ");

    const invoice = {
      invoiceId: `INV-${invoiceNumber}`,
      leadID: lead.leadID,
      customer: lead.customerName,
      email: lead.email || "",
      contact: lead.contactNumber || "",
      address: lead.address || "",
      device: lead.device,
      series: lead.series,
      imeiSerial: lead.imeiSerial || lead.serialNumber || "",
      repair: lead.repairType || lead.issueDescription || "",
      inventoryUsed: lead.inventoryUsed,
      charged,
      partsCost,
      profit,
      completedAt: new Date().toISOString(),
      paymentMethod: lead.paymentMethod || "",
      paymentStatus: lead.paymentStatus || "Unpaid",
      laborAmount,
      repairAmount,
    };

    invoice.lineItems = [
      {
        desc: repairDesc || "Repair Service",
        qty: 1,
        amount: repairAmount,
      },
      ...partLines,
    ];

    if (laborAmount > 0) {
      invoice.lineItems.push({
        desc: "Labor",
        qty: "",
        amount: laborAmount,
      });
    }

    data.invoices = Array.isArray(data.invoices) ? data.invoices : [];
    data.invoices.unshift({ ...invoice });

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