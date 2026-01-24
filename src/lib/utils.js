export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export function formatQty(amount, unit) {
  if (!Number.isFinite(amount)) return "";
  const s = Number.isInteger(amount)
    ? String(amount)
    : String(Number(amount.toFixed(2)).toString());
  return unit ? `${s} ${unit}` : s;
}
