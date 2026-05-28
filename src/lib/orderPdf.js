const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const CANVAS_WIDTH_PX = 900;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(3).replace(/\.?0+$/, "");
}

function formatDate(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("he-IL");
}

function formatDateTime(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function qtyWithUnit(value, unit) {
  const q = formatQty(value);
  return q ? `${q} ${unit || ""}`.trim() : "";
}

function hasDifferentSuppliedAmount(item) {
  if (item.supplied_amount === null || item.supplied_amount === undefined || item.supplied_amount === "") {
    return false;
  }
  const supplied = Number(item.supplied_amount);
  const requested = Number(item.amount);
  return Number.isFinite(supplied) && Number.isFinite(requested) && Math.abs(supplied - requested) >= 0.0005;
}

function buildPrintableHtml(order, shopInfo = {}) {
  const shopName = shopInfo.name || "";
  const customerName = (order.customer_name || "").trim();
  const customerPhone = (order.customer_phone || "").trim();
  const orderDate = formatDate(order.created_at || new Date());
  const createdAt = formatDateTime(order.created_at || new Date());
  const items = Array.isArray(order.items) ? order.items : [];
  const isDelivery = String(order.fulfillment_method || "") === "delivery";
  const fulfillmentLabel = isDelivery ? "משלוח עד הבית" : "איסוף עצמי";

  const rows = items
    .map((item, index) => {
      const unit = item.unit || item.unit_label || (item.sold_by_weight ? 'ק"ג' : "יח'");
      const requested = qtyWithUnit(item.amount, unit);
      const suppliedValue =
        item.supplied_amount !== null && item.supplied_amount !== undefined && item.supplied_amount !== ""
          ? item.supplied_amount
          : item.amount;
      const supplied = qtyWithUnit(suppliedValue, unit);
      const note = String(item.picker_note || item.notes || "").trim();
      const changed = hasDifferentSuppliedAmount(item);
      const extraNote = changed ? `סופק שונה מהמבוקש${note ? " - " : ""}` : "";

      return `
        <tr>
          <td class="num">${index + 1}</td>
          <td class="name">${escapeHtml(item.name || "")}</td>
          <td>${escapeHtml(requested)}</td>
          <td class="supplied ${changed ? "changed" : ""}">${escapeHtml(supplied)}</td>
          <td class="note">${escapeHtml(`${extraNote}${note}`)}</td>
        </tr>`;
    })
    .join("");

  return `
    <div class="pdf-root" dir="rtl">
      <style>
        .pdf-root {
          box-sizing: border-box;
          width: ${CANVAS_WIDTH_PX}px;
          min-height: 1220px;
          padding: 42px 44px;
          background: #ffffff;
          color: #0f172a;
          font-family: Arial, "Noto Sans Hebrew", "Segoe UI", sans-serif;
          direction: rtl;
        }
        .top-line {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 22px;
          border-bottom: 3px solid #0f172a;
          padding-bottom: 18px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .mark {
          width: 54px;
          height: 54px;
          border-radius: 18px;
          background: #0f172a;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          font-weight: 900;
        }
        h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.15;
          font-weight: 900;
        }
        .subtitle {
          margin-top: 6px;
          color: #475569;
          font-size: 15px;
          font-weight: 700;
        }
        .order-box {
          min-width: 210px;
          border: 1px solid #cbd5e1;
          border-radius: 18px;
          padding: 14px 16px;
          text-align: right;
          background: #f8fafc;
        }
        .order-box .label {
          font-size: 12px;
          color: #64748b;
          font-weight: 800;
        }
        .order-box .value {
          margin-top: 4px;
          font-size: 24px;
          font-weight: 900;
        }
        .details {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 12px;
          margin-top: 24px;
        }
        .field {
          border: 1px solid #dbe3ec;
          border-radius: 16px;
          padding: 12px 14px;
          min-height: 58px;
          background: #ffffff;
        }
        .field .label {
          font-size: 12px;
          color: #64748b;
          font-weight: 900;
        }
        .field .value {
          margin-top: 6px;
          font-size: 16px;
          font-weight: 800;
          min-height: 20px;
          word-break: break-word;
        }
        .note-box {
          margin-top: 16px;
          border: 1px solid #fde68a;
          border-radius: 18px;
          background: #fffbeb;
          padding: 13px 16px;
        }
        .note-box .label {
          color: #92400e;
          font-size: 12px;
          font-weight: 900;
        }
        .note-box .value {
          margin-top: 6px;
          white-space: pre-wrap;
          font-size: 15px;
          font-weight: 700;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 26px;
          table-layout: fixed;
          font-size: 14px;
        }
        th {
          background: #0f172a;
          color: #ffffff;
          padding: 12px 10px;
          border: 1px solid #0f172a;
          font-size: 13px;
          font-weight: 900;
        }
        td {
          border: 1px solid #cbd5e1;
          padding: 10px 10px;
          vertical-align: top;
          min-height: 34px;
          overflow-wrap: anywhere;
          font-weight: 650;
        }
        tbody tr:nth-child(even) td {
          background: #f8fafc;
        }
        .num { width: 44px; text-align: center; font-weight: 900; }
        .name { width: 285px; font-weight: 850; }
        .supplied.changed { color: #be123c; font-weight: 900; }
        .note { color: #334155; }
        .footer {
          margin-top: 24px;
          display: flex;
          justify-content: space-between;
          gap: 18px;
          color: #64748b;
          font-size: 12px;
          font-weight: 700;
        }
      </style>

      <div class="top-line">
        <div class="brand">
          <div class="mark">G</div>
          <div>
            <h1>${escapeHtml(shopName || "טופס ליקוט הזמנה")}</h1>
            <div class="subtitle">טופס ליקוט ממוחשב ומוכן להדפסה</div>
          </div>
        </div>
        <div class="order-box">
          <div class="label">מספר הזמנה</div>
          <div class="value">#${escapeHtml(order.id)}</div>
        </div>
      </div>

      <div class="details">
        <div class="field">
          <div class="label">שם הלקוח</div>
          <div class="value">${escapeHtml(customerName)}</div>
        </div>
        <div class="field">
          <div class="label">תאריך</div>
          <div class="value">${escapeHtml(orderDate)}</div>
        </div>
        <div class="field">
          <div class="label">טלפון</div>
          <div class="value" dir="ltr">${escapeHtml(customerPhone)}</div>
        </div>
        <div class="field">
          <div class="label">אופן קבלה</div>
          <div class="value">${escapeHtml(fulfillmentLabel)}</div>
        </div>
      </div>

      ${isDelivery ? `
        <div class="note-box">
          <div class="label">פרטי משלוח</div>
          <div class="value">כתובת: ${escapeHtml(order.delivery_address || "")}<br/>דמי משלוח: ₪${escapeHtml(Number(order.delivery_fee || 0).toFixed(2))}${order.delivery_notes ? `<br/>הערה לשליח: ${escapeHtml(order.delivery_notes)}` : ""}</div>
        </div>
      ` : ""}

      ${order.customer_note_to_picker ? `
        <div class="note-box">
          <div class="label">הודעה מהלקוח למלקט</div>
          <div class="value">${escapeHtml(order.customer_note_to_picker)}</div>
        </div>
      ` : ""}

      <table>
        <thead>
          <tr>
            <th style="width: 46px;">מס׳</th>
            <th>שם הפריט</th>
            <th style="width: 150px;">כמות נדרשת ביחידות או ק״ג</th>
            <th style="width: 145px;">כמות שסופקה</th>
            <th style="width: 190px;">הערות</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="5" style="text-align:center; padding: 30px;">אין פריטים להזמנה</td></tr>`}
        </tbody>
      </table>

      <div class="footer">
        <div>נוצר אוטומטית בדשבורד gogobuy.ai</div>
        <div>${escapeHtml(createdAt)}</div>
      </div>
    </div>`;
}

function textBytes(str) {
  return new TextEncoder().encode(str);
}

function dataUrlToBytes(dataUrl) {
  const base64 = String(dataUrl).split(",")[1] || "";
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function byteLength(part) {
  return typeof part === "string" ? textBytes(part).length : part.length;
}

function buildPdf(images) {
  const objectCount = 2 + images.length * 3;
  const objects = new Array(objectCount + 1);
  const pageRefs = [];

  objects[1] = [`<< /Type /Catalog /Pages 2 0 R >>`];

  images.forEach((image, index) => {
    const pageObj = 3 + index * 3;
    const contentObj = pageObj + 1;
    const imageObj = pageObj + 2;
    pageRefs.push(`${pageObj} 0 R`);

    const imageName = `Im${index + 1}`;
    const content = `q\n${A4_WIDTH_PT} 0 0 ${A4_HEIGHT_PT} 0 0 cm\n/${imageName} Do\nQ\n`;

    objects[pageObj] = [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH_PT} ${A4_HEIGHT_PT}] /Resources << /XObject << /${imageName} ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>`,
    ];
    objects[contentObj] = [`<< /Length ${byteLength(content)} >>\nstream\n${content}endstream`];
    objects[imageObj] = [
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
      image.bytes,
      `\nendstream`,
    ];
  });

  objects[2] = [`<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${images.length} >>`];

  const parts = ["%PDF-1.4\n"];
  let offset = byteLength(parts[0]);
  const offsets = [0];

  for (let i = 1; i <= objectCount; i += 1) {
    offsets[i] = offset;
    const prefix = `${i} 0 obj\n`;
    const suffix = "\nendobj\n";
    parts.push(prefix, ...objects[i], suffix);
    offset += byteLength(prefix) + objects[i].reduce((sum, part) => sum + byteLength(part), 0) + byteLength(suffix);
  }

  const startXref = offset;
  const xrefRows = offsets
    .slice(1)
    .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
    .join("");
  const trailer =
    `xref\n0 ${objectCount + 1}\n` +
    `0000000000 65535 f \n` +
    xrefRows +
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
  parts.push(trailer);

  return new Blob(parts, { type: "application/pdf" });
}

function canvasToJpegBytes(canvas) {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  return dataUrlToBytes(dataUrl);
}

async function renderHtmlToCanvas(html) {
  const holder = document.createElement("div");
  holder.style.position = "fixed";
  holder.style.left = "-10000px";
  holder.style.top = "0";
  holder.style.width = `${CANVAS_WIDTH_PX}px`;
  holder.innerHTML = html;
  document.body.appendChild(holder);

  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => null);
  }

  const height = Math.max(1220, Math.ceil(holder.scrollHeight + 8));
  const xhtml = holder.innerHTML;
  document.body.removeChild(holder);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH_PX}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${xhtml}</div>
      </foreignObject>
    </svg>`;

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.decoding = "async";
    const loaded = new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    img.src = url;
    await loaded;

    const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 2));
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(CANVAS_WIDTH_PX * scale);
    canvas.height = Math.ceil(height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function splitCanvasToPages(canvas) {
  const pageHeight = Math.floor((canvas.width * A4_HEIGHT_PT) / A4_WIDTH_PT);
  const pages = [];

  for (let y = 0; y < canvas.height; y += pageHeight) {
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = pageHeight;
    const ctx = pageCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      y,
      canvas.width,
      Math.min(pageHeight, canvas.height - y),
      0,
      0,
      pageCanvas.width,
      Math.min(pageHeight, canvas.height - y),
    );
    pages.push({
      width: pageCanvas.width,
      height: pageCanvas.height,
      bytes: canvasToJpegBytes(pageCanvas),
    });
  }

  return pages;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openPrintableFallback(html) {
  const w = window.open("", "_blank", "noopener,noreferrer,width=980,height=1200");
  if (!w) return;
  w.document.write(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>טופס הזמנה</title></head><body>${html}<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>`);
  w.document.close();
}

export async function downloadOrderPdf(order, shopInfo = {}) {
  const html = buildPrintableHtml(order, shopInfo);
  const fileName = `gogobuy-order-${order.id || ""}.pdf`;

  try {
    const canvas = await renderHtmlToCanvas(html);
    const pages = splitCanvasToPages(canvas);
    const pdf = buildPdf(pages);
    downloadBlob(pdf, fileName);
  } catch (err) {
    console.error("[downloadOrderPdf] PDF generation failed, opening printable fallback", err);
    openPrintableFallback(html);
  }
}
