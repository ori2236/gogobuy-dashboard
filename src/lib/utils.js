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

export function formatQty(n, unit) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "";

  const s = x.toFixed(3).replace(/\.?0+$/, "");
  return unit ? `${s} ${unit}` : s;
}