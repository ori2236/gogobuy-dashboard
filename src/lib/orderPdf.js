import logoUrl from "../assets/gogobuy.ai.logo.png";

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const PAGE_WIDTH = 900;
const PAGE_HEIGHT = Math.round((PAGE_WIDTH * A4_HEIGHT_PT) / A4_WIDTH_PT);
const SCALE = 2;
const MARGIN = 46;
const MIN_FORM_ROWS = 10;
const ROWS_PER_PAGE = 14;

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

function formatMoney(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? `₪${n.toFixed(2)}` : "₪0.00";
}

function normalizePackagingCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

function formatPackagePart(count, singular, plural) {
  const n = normalizePackagingCount(count);
  if (!n) return "";
  return `${n} ${n === 1 ? singular : plural}`;
}

function formatPackagingText(order) {
  const cartons = formatPackagePart(order?.packaging_cartons_count, "קרטון", "קרטונים");
  const bags = formatPackagePart(order?.packaging_bags_count, "שקית", "שקיות");
  const parts = [cartons, bags].filter(Boolean);
  return parts.length ? parts.join(" ו-") : "";
}

function formatLocalPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("972") && digits.length >= 11) return `0${digits.slice(3)}`;
  return phone || "";
}

function displayCustomerName(order) {
  const name = String(order?.customer_name || "").trim();
  const phone = String(order?.customer_phone || "").trim();
  const nameDigits = name.replace(/\D/g, "");
  const phoneDigits = phone.replace(/\D/g, "");
  if (!name) return "";
  if (name === phone) return "";
  if (nameDigits && phoneDigits && nameDigits === phoneDigits) return "";
  if (nameDigits && phoneDigits && phoneDigits.endsWith(nameDigits)) return "";
  return name;
}

function extractBranchFromAddress(address) {
  const raw = String(address || "").trim();
  if (!raw) return "";
  const known = ["לשם", "עלי הזהב", "ברוכין", "פדואל"];
  return known.find((name) => raw.includes(name)) || "";
}

function shopTitle(shopInfo = {}) {
  const chain = String(shopInfo.chain_name || shopInfo.chainName || shopInfo.network_name || shopInfo.brand_name || "").trim();
  const branch = String(shopInfo.branch_name || shopInfo.branchName || "").trim() || extractBranchFromAddress(shopInfo.address);
  const name = String(shopInfo.name || "").trim();
  const base = chain || name || "טופס ליקוט פנימי";
  if (branch && !base.includes(branch)) return `${base} - סניף ${branch}`;
  return base;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function hasDifferentSuppliedAmount(item) {
  if (item.supplied_amount === null || item.supplied_amount === undefined || item.supplied_amount === "") {
    return false;
  }
  const supplied = Number(item.supplied_amount);
  const requested = Number(item.amount);
  return Number.isFinite(supplied) && Number.isFinite(requested) && Math.abs(supplied - requested) >= 0.0005;
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

function createPageCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_WIDTH * SCALE;
  canvas.height = PAGE_HEIGHT * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.textBaseline = "top";
  ctx.direction = "rtl";
  return { canvas, ctx };
}

function font(size, weight = 600) {
  return `${weight} ${size}px Arial, "Noto Sans Hebrew", "Segoe UI", sans-serif`;
}

function roundedRect(ctx, x, y, w, h, r, fill, stroke = null, lineWidth = 1) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function setText(ctx, size, weight = 600, color = "#0f172a") {
  ctx.font = font(size, weight);
  ctx.fillStyle = color;
}

function wrapText(ctx, text, width) {
  const paragraphs = String(text || "").split(/\r?\n/);
  const lines = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }

    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= width || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }

  return lines;
}

function drawRtl(ctx, text, right, y, width, options = {}) {
  const {
    size = 14,
    weight = 600,
    color = "#0f172a",
    lineHeight = Math.round(size * 1.45),
    maxLines = 1,
  } = options;
  setText(ctx, size, weight, color);
  ctx.direction = "rtl";
  ctx.textAlign = "right";

  const lines = wrapText(ctx, text, width).slice(0, maxLines);
  lines.forEach((line, idx) => {
    const finalLine = idx === maxLines - 1 && wrapText(ctx, text, width).length > maxLines
      ? `${line.replace(/\s+$/, "")}…`
      : line;
    ctx.fillText(finalLine, right, y + idx * lineHeight);
  });

  return lines.length * lineHeight;
}

function drawLtr(ctx, text, left, y, width, options = {}) {
  const {
    size = 14,
    weight = 600,
    color = "#0f172a",
    align = "left",
  } = options;
  setText(ctx, size, weight, color);
  ctx.direction = "ltr";
  ctx.textAlign = align;
  const x = align === "center" ? left + width / 2 : align === "right" ? left + width : left;
  ctx.fillText(String(text || ""), x, y);
  ctx.direction = "rtl";
}

function drawField(ctx, x, y, w, label, value, { ltr = false } = {}) {
  roundedRect(ctx, x, y, w, 62, 14, "#f8fafc", "#e2e8f0");
  drawRtl(ctx, label, x + w - 14, y + 10, w - 28, {
    size: 11,
    weight: 800,
    color: "#64748b",
  });
  if (ltr) {
    drawLtr(ctx, value, x + 14, y + 33, w - 28, {
      size: 15,
      weight: 800,
      color: "#0f172a",
      align: "left",
    });
  } else {
    drawRtl(ctx, value, x + w - 14, y + 33, w - 28, {
      size: 15,
      weight: 800,
      color: "#0f172a",
    });
  }
}

function isGiftOrderItem(item) {
  return Boolean(item?.is_gift) || Boolean(item?.cart_promotion_rule_id && Number(item?.line_price || 0) === 0);
}

function moneyText(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `₪${n.toFixed(2)}`;
}

function formatShortQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toFixed(3).replace(/\.?0+$/, "");
}

function appThreshold(app) {
  if (app?.threshold_amount !== null && app?.threshold_amount !== undefined) {
    const n = Number(app.threshold_amount);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const raw = app?.metadata;
  let meta = raw;
  if (raw && typeof raw === "string") {
    try { meta = JSON.parse(raw); } catch { meta = {}; }
  }
  const n = Number(meta?.threshold_amount);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatCartPromotionApplication(app) {
  const type = String(app?.rule_type || "");
  const threshold = appThreshold(app);
  const prefix = threshold ? `בקנייה מעל ${moneyText(threshold)} — ` : "";
  const rewardName = String(app?.reward_product_name || app?.reward_display_name_en || "").trim();

  if (type === "DELIVERY_FEE_OVERRIDE") {
    const fee = Number(app?.applied_value);
    if (Number.isFinite(fee) && fee <= 0) return `🚚 ${prefix}משלוח חינם`;
    return `🚚 ${prefix}משלוח ב-${moneyText(fee) || "—"}`;
  }

  if (type === "GIFT_PRODUCT") {
    return `🎁 ${prefix}מתנה${rewardName ? `: ${rewardName}` : ""}`;
  }

  if (type === "THRESHOLD_PRODUCT_FIXED_PRICE") {
    const maxText = app?.reward_max_qty ? `, עד ${formatShortQty(app.reward_max_qty)} יח׳` : "";
    return `🏷️ ${prefix}${rewardName || "מוצר נבחר"} ב-${moneyText(app?.applied_value) || "—"}${maxText}`;
  }

  return String(app?.text_he || app?.title || "").trim();
}

function cartPromotionLines(order) {
  const lines = [];

  const apps = Array.isArray(order.cart_promotion_applications)
    ? order.cart_promotion_applications
    : [];
  for (const app of apps) {
    const text = formatCartPromotionApplication(app) || String(app.text_he || app.title || "").trim();
    if (text) lines.push(text);
  }

  if (!lines.length && Array.isArray(order.cart_promotion_lines)) {
    lines.push(...order.cart_promotion_lines.map((line) => String(line || "").trim()).filter(Boolean));
  }

  const giftLines = Array.isArray(order.items)
    ? order.items
        .filter(isGiftOrderItem)
        .filter((item) => {
          const name = String(item.name || "").trim();
          return !name || !lines.some((line) => line.includes(name));
        })
        .map((item) => `🎁 מתנה ממבצע סל: ${item.name || "מוצר מתנה"}`)
    : [];

  return Array.from(new Set([...lines, ...giftLines]));
}

function drawCartPromotionBox(ctx, order, y) {
  const lines = cartPromotionLines(order).slice(0, 4);
  if (!lines.length) return y;
  const tableW = PAGE_WIDTH - MARGIN * 2;
  const boxH = 48 + lines.length * 20;
  roundedRect(ctx, MARGIN, y, tableW, boxH, 16, "#ecfdf5", "#bbf7d0");
  drawRtl(ctx, "מבצעי סל שחלים על ההזמנה", PAGE_WIDTH - MARGIN - 16, y + 10, tableW - 32, {
    size: 13,
    weight: 900,
    color: "#065f46",
  });
  lines.forEach((line, idx) => {
    drawRtl(ctx, `• ${line}`, PAGE_WIDTH - MARGIN - 16, y + 34 + idx * 20, tableW - 32, {
      size: 13,
      weight: 750,
      color: "#064e3b",
      maxLines: 1,
    });
  });
  return y + boxH + 14;
}

function drawHeader(ctx, order, shopInfo, pageNumber, totalPages, logoImage) {
  const shopName = shopTitle(shopInfo);
  const y = 36;
  const right = PAGE_WIDTH - MARGIN;

  roundedRect(ctx, right - 64, y, 64, 64, 18, "#0f172a");
  if (logoImage) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect?.(right - 58, y + 6, 52, 52, 12);
    ctx.clip?.();
    ctx.drawImage(logoImage, right - 58, y + 6, 52, 52);
    ctx.restore();
  } else {
    setText(ctx, 24, 900, "#ffffff");
    ctx.textAlign = "center";
    ctx.direction = "ltr";
    ctx.fillText("G", right - 32, y + 17);
    ctx.direction = "rtl";
  }

  drawRtl(ctx, shopName, right - 78, y + 2, 460, {
    size: 27,
    weight: 900,
    color: "#0f172a",
  });
  drawRtl(ctx, "טופס ליקוט משודרג - להדפסה או שמירה", right - 78, y + 36, 460, {
    size: 13,
    weight: 700,
    color: "#64748b",
  });

  roundedRect(ctx, MARGIN, y, 190, 58, 18, "#f8fafc", "#e2e8f0");
  drawRtl(ctx, "מספר הזמנה", MARGIN + 174, y + 9, 160, {
    size: 11,
    weight: 800,
    color: "#64748b",
  });
  drawLtr(ctx, `#${order.id || ""}`, MARGIN + 16, y + 29, 158, {
    size: 22,
    weight: 900,
    color: "#0f172a",
    align: "left",
  });

  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGIN, y + 82);
  ctx.lineTo(PAGE_WIDTH - MARGIN, y + 82);
  ctx.stroke();

  if (totalPages > 1) {
    drawLtr(ctx, `${pageNumber}/${totalPages}`, MARGIN, y + 90, 70, {
      size: 12,
      weight: 800,
      color: "#64748b",
    });
  }

  return y + 104;
}

function drawOrderDetails(ctx, order, startY) {
  const customerName = displayCustomerName(order);
  const customerPhone = formatLocalPhone(String(order.customer_phone || "").trim());
  const isDelivery = String(order.fulfillment_method || "") === "delivery";
  const fulfillmentLabel = isDelivery ? "משלוח עד הבית" : "איסוף עצמי";
  const tableW = PAGE_WIDTH - MARGIN * 2;
  const gap = 10;
  const boxW = (tableW - gap * 3) / 4;
  let y = startY;

  drawField(ctx, MARGIN + (boxW + gap) * 3, y, boxW, "שם הלקוח", customerName);
  drawField(ctx, MARGIN + (boxW + gap) * 2, y, boxW, "תאריך", formatDate(order.created_at || new Date()));
  drawField(ctx, MARGIN + (boxW + gap), y, boxW, "טלפון", customerPhone, { ltr: true });
  drawField(ctx, MARGIN, y, boxW, "אופן קבלה", fulfillmentLabel);
  y += 76;

  const packagingText = formatPackagingText(order);
  const bubbleGap = 10;
  const bubbleH = 52;
  const hasPackagingBubble = Boolean(packagingText);
  const paymentBubbleW = hasPackagingBubble ? (tableW - bubbleGap) / 2 : tableW;
  const packagingBubbleW = hasPackagingBubble ? (tableW - bubbleGap) / 2 : 0;

  roundedRect(ctx, PAGE_WIDTH - MARGIN - paymentBubbleW, y, paymentBubbleW, bubbleH, 16, "#f8fafc", "#e2e8f0");
  drawRtl(ctx, `תשלום: ${formatMoney(order.price)}`, PAGE_WIDTH - MARGIN - 16, y + 16, paymentBubbleW - 32, {
    size: 15,
    weight: 800,
    color: "#0f172a",
    maxLines: 1,
  });

  if (hasPackagingBubble) {
    roundedRect(ctx, MARGIN, y, packagingBubbleW, bubbleH, 16, "#f5f3ff", "#ddd6fe");
    drawRtl(ctx, `אריזה: ${packagingText}`, MARGIN + packagingBubbleW - 16, y + 16, packagingBubbleW - 32, {
      size: 15,
      weight: 800,
      color: "#0f172a",
      maxLines: 1,
    });
  }
  y += 66;

  if (isDelivery) {
    roundedRect(ctx, MARGIN, y, tableW, 72, 16, "#f8fafc", "#e2e8f0");
    drawRtl(ctx, "פרטי משלוח", PAGE_WIDTH - MARGIN - 16, y + 10, tableW - 32, {
      size: 12,
      weight: 900,
      color: "#334155",
    });
    const details = [
      order.delivery_address ? `כתובת: ${order.delivery_address}` : "כתובת: -",
      `דמי משלוח: ₪${Number(order.delivery_fee || 0).toFixed(2)}`,
      order.delivery_notes ? `הערה לשליח: ${order.delivery_notes}` : "",
    ].filter(Boolean).join("   |   ");
    drawRtl(ctx, details, PAGE_WIDTH - MARGIN - 16, y + 35, tableW - 32, {
      size: 14,
      weight: 700,
      color: "#0f172a",
      maxLines: 2,
      lineHeight: 18,
    });
    y += 86;
  }

  y = drawCartPromotionBox(ctx, order, y);

  const customerNote = String(order.customer_note_to_picker || "").trim();
  if (customerNote) {
    roundedRect(ctx, MARGIN, y, tableW, 74, 16, "#fffdf6", "#fde68a");
    drawRtl(ctx, "הערה מהלקוח למלקט", PAGE_WIDTH - MARGIN - 16, y + 10, tableW - 32, {
      size: 13,
      weight: 900,
      color: "#92400e",
    });
    drawRtl(ctx, customerNote, PAGE_WIDTH - MARGIN - 16, y + 34, tableW - 32, {
      size: 15,
      weight: 700,
      color: "#334155",
      maxLines: 2,
      lineHeight: 19,
    });
    y += 88;
  }

  const pickerNote = String(order.picker_note || "").trim();
  if (pickerNote) {
    roundedRect(ctx, MARGIN, y, tableW, 74, 16, "#f8fafc", "#cbd5e1");
    drawRtl(ctx, "הערת המלקט ללקוח", PAGE_WIDTH - MARGIN - 16, y + 10, tableW - 32, {
      size: 13,
      weight: 900,
      color: "#334155",
    });
    drawRtl(ctx, pickerNote, PAGE_WIDTH - MARGIN - 16, y + 34, tableW - 32, {
      size: 15,
      weight: 700,
      color: "#0f172a",
      maxLines: 2,
      lineHeight: 19,
    });
    y += 88;
  }

  return y;
}

function buildRows(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const rows = [...items];
  while (rows.length < MIN_FORM_ROWS) rows.push(null);
  return rows;
}

function drawTable(ctx, rows, startIndex, y) {
  const tableW = PAGE_WIDTH - MARGIN * 2;
  const rowH = 50;
  const headerH = 44;
  const cols = [
    { key: "num", title: "מס׳", w: 48 },
    { key: "name", title: "שם הפריט", w: 280 },
    { key: "requested", title: "כמות נדרשת", w: 150 },
    { key: "supplied", title: "כמות שסופקה", w: 150 },
    { key: "note", title: "הערות", w: tableW - 48 - 280 - 150 - 150 },
  ];

  let xRight = PAGE_WIDTH - MARGIN;
  for (const col of cols) {
    const x = xRight - col.w;
    roundedRect(ctx, x, y, col.w, headerH, 0, "#0f172a", "#0f172a");
    drawRtl(ctx, col.title, x + col.w - 10, y + 12, col.w - 20, {
      size: 14,
      weight: 900,
      color: "#ffffff",
    });
    xRight = x;
  }

  rows.forEach((item, idx) => {
    const rowY = y + headerH + idx * rowH;
    const rowFill = idx % 2 ? "#ffffff" : "#f8fafc";
    let cellRight = PAGE_WIDTH - MARGIN;

    const unit = item ? item.unit || item.unit_label || (item.sold_by_weight ? 'ק"ג' : "יח'") : "";
    const requested = item ? qtyWithUnit(item.amount, unit) : "";
    const requestedUnits = item?.requested_units != null ? formatQty(item.requested_units) : "";
    const supplied = item?.supplied_amount != null ? qtyWithUnit(item.supplied_amount, unit) : "";
    const isGift = item ? isGiftOrderItem(item) : false;
    const note = item
      ? [item.picker_note || "", isGift ? "מתנה ממבצע סל" : ""].filter(Boolean).join(" | ")
      : "";
    const itemName = isGift ? `${item?.name || ""} 🎁 מתנה` : item?.name || "";

    const values = {
      num: String(startIndex + idx + 1),
      name: itemName,
      requested: requestedUnits ? `${requested} (${requestedUnits} יח')` : requested,
      supplied,
      note,
    };

    for (const col of cols) {
      const x = cellRight - col.w;
      ctx.fillStyle = rowFill;
      ctx.fillRect(x, rowY, col.w, rowH);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, rowY, col.w, rowH);

      if (col.key === "num") {
        drawLtr(ctx, values.num, x, rowY + 14, col.w, {
          size: 15,
          weight: 900,
          color: "#0f172a",
          align: "center",
        });
      } else {
        drawRtl(ctx, values[col.key], x + col.w - 9, rowY + 10, col.w - 18, {
          size: col.key === "name" ? 15 : 14,
          weight: col.key === "name" ? 850 : 750,
          color: "#0f172a",
          maxLines: 2,
          lineHeight: 18,
        });
      }

      cellRight = x;
    }
  });

  return y + headerH + rows.length * rowH;
}

function drawFooter(ctx, pageNumber, totalPages) {
  const y = PAGE_HEIGHT - 40;
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN, y - 12);
  ctx.lineTo(PAGE_WIDTH - MARGIN, y - 12);
  ctx.stroke();

  drawRtl(ctx, "נוצר אוטומטית בדשבורד gogobuy.ai", PAGE_WIDTH - MARGIN, y, 360, {
    size: 11,
    weight: 700,
    color: "#64748b",
  });
  drawLtr(ctx, `${formatDateTime(new Date())}   |   עמוד ${pageNumber}/${totalPages}`, MARGIN, y, 360, {
    size: 11,
    weight: 700,
    color: "#64748b",
  });
}

function canvasToJpegBytes(canvas) {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  return dataUrlToBytes(dataUrl);
}

function buildCanvases(order, shopInfo, logoImage) {
  const allRows = buildRows(order);
  const tableHeaderH = 44;
  const tableRowH = 50;
  const maxTableBottom = PAGE_HEIGHT - 72;

  const preview = createPageCanvas();
  let firstY = drawHeader(preview.ctx, order, shopInfo, 1, 1, logoImage);
  firstY = drawOrderDetails(preview.ctx, order, firstY) + 10;
  const firstPageCapacity = Math.max(
    1,
    Math.min(
      ROWS_PER_PAGE,
      Math.floor((maxTableBottom - firstY - tableHeaderH) / tableRowH),
    ),
  );

  const chunks = [];
  chunks.push(allRows.slice(0, firstPageCapacity));
  for (let i = firstPageCapacity; i < allRows.length; i += ROWS_PER_PAGE) {
    chunks.push(allRows.slice(i, i + ROWS_PER_PAGE));
  }

  return chunks.map((chunk, index) => {
    const { canvas, ctx } = createPageCanvas();
    const pageNumber = index + 1;
    const totalPages = chunks.length;
    let y = drawHeader(ctx, order, shopInfo, pageNumber, totalPages, logoImage);

    if (index === 0) {
      y = drawOrderDetails(ctx, order, y);
    } else {
      roundedRect(ctx, MARGIN, y, PAGE_WIDTH - MARGIN * 2, 46, 14, "#f8fafc", "#e2e8f0");
      drawRtl(ctx, "המשך טופס ליקוט", PAGE_WIDTH - MARGIN - 16, y + 13, 420, {
        size: 15,
        weight: 900,
        color: "#334155",
      });
      y += 62;
    }

    y += 10;
    drawTable(ctx, chunk, index === 0 ? 0 : firstPageCapacity + (index - 1) * ROWS_PER_PAGE, y);
    drawFooter(ctx, pageNumber, totalPages);
    return canvas;
  });
}

function openPdfPreview(url, fileName) {
  const previewUrl = `${url}#toolbar=0&navpanes=0&view=Fit&zoom=page-fit`;

  try {
    const win = window.open("", "_blank");
    if (!win) {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
      return;
    }

    win.document.write(`<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>${fileName}</title>
  <style>
    html, body { margin:0; width:100%; height:100%; background:#f8fafc; overflow:hidden; font-family: Arial, system-ui, sans-serif; }
    .bar { height:46px; display:flex; align-items:center; justify-content:space-between; padding:0 16px; box-sizing:border-box; background:white; border-bottom:1px solid #e2e8f0; color:#0f172a; font-weight:800; }
    .bar a { color:#0f172a; text-decoration:none; border:1px solid #cbd5e1; border-radius:12px; padding:7px 12px; font-size:13px; }
    .viewer { width:100%; height:calc(100% - 46px); border:0; display:block; }
  </style>
</head>
<body>
  <div class="bar">
    <div>תצוגת PDF</div>
    <a href="${url}" download="${fileName}">הורד שוב</a>
  </div>
  <iframe class="viewer" src="${previewUrl}" title="PDF"></iframe>
</body>
</html>`);
    win.document.close();
  } catch {
    try {
      window.open(previewUrl, "_blank", "noopener,noreferrer");
    } catch {
      // Browsers can block auto-open. The PDF is still downloaded.
    }
  }
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  openPdfPreview(url, fileName);

  setTimeout(() => URL.revokeObjectURL(url), 120_000);
}

export async function downloadOrderPdf(order, shopInfo = {}) {
  const fileName = `gogobuy-picking-form-${order.id || ""}.pdf`;

  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => null);
  }

  const logoImage = await loadImage(logoUrl);
  const canvases = buildCanvases(order, shopInfo, logoImage);
  const pages = canvases.map((canvas) => ({
    width: canvas.width,
    height: canvas.height,
    bytes: canvasToJpegBytes(canvas),
  }));
  const pdf = buildPdf(pages);
  downloadBlob(pdf, fileName);
}
