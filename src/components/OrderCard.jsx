import { useState } from "react";
import {
  CheckCheck,
  Download,
  PlayCircle,
  RefreshCw,
  Send,
  ShoppingBasket,
  Truck,
} from "lucide-react";
import { cn, formatDateTime } from "../lib/utils";
import { canMarkReady, pickedCount, progressPct } from "../lib/hooks";
import { downloadOrderPdf } from "../lib/orderPdf";
import { OrderItemRow } from "./OrderItemRow";

function formatLocalPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("972") && digits.length >= 11) return `0${digits.slice(3)}`;
  return phone || "";
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? `₪${n.toFixed(2)}` : "";
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

function getPackagingPills(order) {
  const cartonsCount = normalizePackagingCount(order.packaging_cartons_count);
  const bagsCount = normalizePackagingCount(order.packaging_bags_count);
  return [
    cartonsCount ? { key: "cartons", count: cartonsCount, label: cartonsCount === 1 ? "קרטון" : "קרטונים", emoji: "📦" } : null,
    bagsCount ? { key: "bags", count: bagsCount, label: bagsCount === 1 ? "שקית" : "שקיות", emoji: "🛍️" } : null,
  ].filter(Boolean);
}

function OrderPill({ children, className = "", ...props }) {
  return (
    <span className={cn("pill border border-slate-100 bg-slate-50 text-slate-700 shadow-sm", className)} {...props}>
      {children}
    </span>
  );
}

function OrderMetaPills({ order, isDelivery }) {
  const price = formatMoney(order.price);
  const deliveryFee = Number(order.delivery_fee || 0);
  const packagingPills = getPackagingPills(order);
  const showPackaging =
    packagingPills.length > 0 && !["confirmed", "preparing"].includes(order.status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <OrderPill className={isDelivery ? "bg-blue-50 text-blue-700" : "bg-cyan-50 text-cyan-700"}>
        {isDelivery ? "📦 משלוח" : "🛍️ איסוף עצמי"}
      </OrderPill>
      {price ? (
        <OrderPill className="bg-emerald-50 text-emerald-700">
          💰 לתשלום {price}
        </OrderPill>
      ) : null}
      {isDelivery && deliveryFee > 0 ? (
        <OrderPill className="bg-orange-50 text-orange-700">
          🚚 דמי משלוח {formatMoney(deliveryFee)}
        </OrderPill>
      ) : isDelivery ? (
        <OrderPill className="bg-emerald-50 text-emerald-700">
          🚚 משלוח חינם
        </OrderPill>
      ) : null}
      {showPackaging
        ? packagingPills.map((pill) => (
            <OrderPill key={pill.key} className="bg-violet-50 text-slate-900 border-violet-100" dir="rtl">
              <span className="tabular-nums font-bold">{pill.count}</span>
              <span>{pill.label}</span>
              <span>{pill.emoji}</span>
            </OrderPill>
          ))
        : null}
    </div>
  );
}

function DeliveryDetailsBox({ order, compact = false }) {
  const hasAddress = Boolean(String(order.delivery_address || "").trim());
  const hasNotes = Boolean(String(order.delivery_notes || "").trim());
  if (!hasAddress && !hasNotes) return null;

  return (
    <div className="mt-3 grid gap-1 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-right text-sm text-slate-700" dir="rtl">
      {hasAddress ? (
        <div className={cn("font-semibold text-slate-900", compact && "line-clamp-1")}>
          📍 {order.delivery_address}
        </div>
      ) : null}
      {hasNotes ? (
        <div className="whitespace-pre-wrap text-xs font-semibold text-slate-600">
          📝 הערה לשליח: {order.delivery_notes}
        </div>
      ) : null}
    </div>
  );
}


function isGiftOrderItem(item) {
  return Boolean(item?.is_gift) || Boolean(item?.cart_promotion_rule_id && Number(item?.line_price || 0) === 0);
}

function CartPromotionsCard({ lines, items }) {
  const cleanLines = Array.isArray(lines)
    ? lines.map((line) => String(line || "").trim()).filter(Boolean)
    : [];
  const giftLines = Array.isArray(items)
    ? items
        .filter(isGiftOrderItem)
        .map((item) => `🎁 צריך ללקט מתנה: ${item.name || "מוצר מתנה"}`)
    : [];
  const allLines = Array.from(new Set([...cleanLines, ...giftLines]));
  if (!allLines.length) return null;

  return (
    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-right shadow-sm" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-emerald-900">מבצעי סל שחלים על ההזמנה</div>
        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-emerald-700">
          למלקט
        </span>
      </div>
      <div className="mt-2 grid gap-1 text-sm font-semibold leading-6 text-emerald-950">
        {allLines.map((line, idx) => (
          <div key={`${line}-${idx}`}>• {line}</div>
        ))}
      </div>
    </div>
  );
}

function CustomerNoteCard({ note, className = "" }) {
  if (!note) return null;

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm", className)} dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold text-slate-800">הערה שנשלחה מהלקוח</div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
          למלקט
        </span>
      </div>
      <div className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">
        {note}
      </div>
    </div>
  );
}

export function OrderCard({
  order,
  busyOrderId,
  busyItemId,
  onStartPicking,
  onMarkReady,
  onMarkShipped,
  onMarkCompleted,
  onToggleItem,
  onUpdateItemDetails,
  pickerNote,
  onChangeNote,
  shopInfo,
}) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [openDetailsItemId, setOpenDetailsItemId] = useState(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const busy = busyOrderId === order.id;

  const isConfirmed = order.status === "confirmed";
  const isPreparing = order.status === "preparing";
  const isReady = order.status === "ready";
  const isDelivering = order.status === "delivering";
  const isCompleted = order.status === "completed";
  const isDelivery = order.fulfillment_method === "delivery";
  const readonly = isReady || isDelivering || isCompleted;
  const itemDetailsEditable = isPreparing && !readonly;
  const compactEligible = isReady || isDelivering || isCompleted;
  const compactCollapsed = compactEligible && !detailsExpanded;

  const showProgress = isConfirmed || isPreparing;

  const pct = progressPct(order);
  const picked = pickedCount(order);
  const total = order.items.length;

  const name = (order.customer_name || "").trim();
  const phone = (order.customer_phone || "").trim();
  const displayPhone = formatLocalPhone(phone);
  const showName = Boolean(name) && name !== phone;

  const sentNote = (order.picker_note || "").trim();
  const hasSentNote = Boolean(sentNote);
  const customerNoteToPicker = (order.customer_note_to_picker || "").trim();

  async function handleDownloadPdf() {
    try {
      setPdfBusy(true);
      await downloadOrderPdf(order, shopInfo || {});
    } catch (err) {
      console.error("[OrderCard.handleDownloadPdf]", err);
      alert("לא הצלחנו ליצור PDF להזמנה. נסה לרענן את הדשבורד ולנסות שוב.");
    } finally {
      setPdfBusy(false);
    }
  }

  function renderPdfButton(className = "btn-outline") {
    return (
      <button
        className={className}
        dir="rtl"
        onClick={handleDownloadPdf}
        disabled={pdfBusy}
      >
        {pdfBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        הורד PDF
      </button>
    );
  }

  function renderReadonlyActions() {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-start" dir="ltr">
        {renderPdfButton()}

        {compactCollapsed ? (
          <button className="btn-outline" dir="rtl" onClick={() => setDetailsExpanded(true)}>
            הצג פרטים
          </button>
        ) : compactEligible ? (
          <button className="btn-outline" dir="rtl" onClick={() => setDetailsExpanded(false)}>
            הסתר פרטים
          </button>
        ) : null}

        {isReady && isDelivery ? (
          <button className="btn-success" dir="rtl" onClick={onMarkShipped} disabled={busy}>
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            סמן כנשלחה
          </button>
        ) : null}

        {isReady && !isDelivery ? (
          <button className="btn-success" dir="rtl" onClick={onMarkCompleted} disabled={busy}>
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            סמן כנאספה
          </button>
        ) : null}

        {isDelivering ? (
          <button className="btn-success" dir="rtl" onClick={onMarkCompleted} disabled={busy}>
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            סמן כנמסרה
          </button>
        ) : null}
      </div>
    );
  }

  if (compactCollapsed) {
    return (
      <div className="order-card card overflow-hidden p-4 font-sans">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-slate-700" />
            <div className="text-base font-bold">הזמנה #{order.id}</div>
          </div>
          <OrderMetaPills order={order} isDelivery={isDelivery} />

          <div className="ms-auto flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            {showName ? <span className="pill bg-slate-100 text-slate-700">{name}</span> : null}
            {displayPhone ? <span className="pill bg-slate-100 text-slate-700">{displayPhone}</span> : null}
            {order.created_at ? <span className="pill bg-slate-100 text-slate-700">{formatDateTime(order.created_at)}</span> : null}
          </div>
        </div>

        {isDelivery ? <DeliveryDetailsBox order={order} compact /> : null}

        <CustomerNoteCard note={customerNoteToPicker} className="mt-3" />

        <div className="mt-4">{renderReadonlyActions()}</div>
      </div>
    );
  }

  return (
    <div className="order-card card overflow-hidden font-sans">
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-slate-700" />
            <div className="text-base font-bold">הזמנה #{order.id}</div>
          </div>

          <OrderMetaPills order={order} isDelivery={isDelivery} />

          <div className="ms-auto flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            {showName ? (
              <span className="pill bg-slate-100 text-slate-700">{name}</span>
            ) : null}
            {phone ? (
              <span className="pill bg-slate-100 text-slate-700">{displayPhone}</span>
            ) : null}
            {order.created_at ? (
              <span className="pill bg-slate-100 text-slate-700">
                {formatDateTime(order.created_at)}
              </span>
            ) : null}
          </div>
        </div>

        {isDelivery ? <DeliveryDetailsBox order={order} /> : null}

        {showProgress ? (
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold text-slate-600">
                {picked}/{total} לוקטו
              </div>
              <div className="ms-auto text-xs font-semibold text-slate-600">
                {pct}%
              </div>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : null}

        <CustomerNoteCard note={customerNoteToPicker} className="mt-4" />
        <CartPromotionsCard lines={order.cart_promotion_lines} items={order.items} />

        {isPreparing ? (
          <div className="mt-4 text-right text-[11px] font-semibold text-slate-500">
            פרטי דו״ח למוצר הם אופציונליים. אם לא משנים כלום, הכמות שסופקה תיחשב כמו הכמות שנדרשה.
          </div>
        ) : null}

        {(() => {
          const scroll = order.items.length > 4;

          return (
            <div
              className={cn(
                "mt-5",
                scroll && "max-h-[330px] overflow-y-auto pe-1",
              )}
            >
              <div className="grid gap-2">
                {order.items.length ? (
                  order.items.map((item) => (
                    <OrderItemRow
                      key={item.id}
                      item={item}
                      disabled={readonly}
                      busy={busyItemId === item.id}
                      showCheckbox={!readonly}
                      editableDetails={itemDetailsEditable}
                      detailsOpen={openDetailsItemId === item.id}
                      onToggleDetails={() =>
                        setOpenDetailsItemId((current) =>
                          current === item.id ? null : item.id,
                        )
                      }
                      detailsBusy={busyItemId === item.id}
                      onToggle={(pickedNow) => onToggleItem(item.id, pickedNow)}
                      onSaveDetails={(details) =>
                        onUpdateItemDetails?.(item.id, details)
                      }
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600 text-right">
                    אין מוצרים להזמנה הזו
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        <div className="mt-5">
          {readonly ? (
            <div className="grid gap-3">
              {hasSentNote ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right">
                  <div className="text-xs font-bold text-slate-700">
                    {isCompleted
                      ? isDelivery
                        ? "הערה שנשלחה ללקוח (הזמנה נמסרה)"
                        : "הערה שנשלחה ללקוח (הזמנה נאספה)"
                      : "הערה שנשלחה ללקוח"}
                  </div>
                  <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                    {sentNote}
                  </div>
                </div>
              ) : null}

              {renderReadonlyActions()}
            </div>
          ) : isConfirmed ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="text-right text-xs font-semibold text-slate-500">
                התחלת ליקוט תעדכן את הלקוח שההזמנה בטיפול.
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {renderPdfButton()}
                <button className="btn-primary" onClick={onStartPicking} disabled={busy}>
                  {busy ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  התחל ללקט
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-2 text-xs font-bold text-slate-700 text-right">
                הערת מלקט ללקוח{" "}
                <span className="text-slate-500 font-medium">(אופציונלי)</span>
              </div>

              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex w-full flex-col gap-2 sm:w-[170px] sm:shrink-0">
                  {renderPdfButton("btn-outline w-full")}
                  <button
                    className={cn(
                      canMarkReady(order) ? "btn-success" : "btn-secondary",
                      "w-full",
                    )}
                    onClick={onMarkReady}
                    disabled={busy || !canMarkReady(order) || isReady}
                    title={
                      !canMarkReady(order)
                        ? "אפשר רק אחרי שכל המוצרים מסומנים ובסטטוס 'בליקוט'"
                        : ""
                    }
                  >
                  {busy ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                    הזמנה מוכנה
                  </button>
                </div>

                <textarea
                  className="w-full flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-900 text-right"
                  rows={2}
                  value={pickerNote || ""}
                  onChange={(e) => onChangeNote(e.target.value)}
                  placeholder="לדוגמה: שמתי את המוצרים בקירור בשקית נפרדת"
                />
              </div>

              <div className="mt-1 text-[11px] text-slate-500 text-right">
                ההערה תשלח ללקוח כהודעה
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
