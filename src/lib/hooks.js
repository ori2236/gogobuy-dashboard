import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPickerOrders, setOrderStatus } from "./api";

const REFRESH_MS = Number(import.meta.env.VITE_REFRESH_MS || "10000");

export function useOrders() {
  return useQuery({
    queryKey: ["pickerOrders"],
    queryFn: getPickerOrders,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}


export function useSetOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status, pickerNote }) =>
      setOrderStatus(orderId, status, pickerNote),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pickerOrders"] }),
  });
}

export function allPicked(order) {
  return order.items.length > 0 && order.items.every((i) => i.picked);
}
export function pickedCount(order) {
  return order.items.reduce((acc, i) => acc + (i.picked ? 1 : 0), 0);
}
export function progressPct(order) {
  if (!order.items.length) return 0;
  return Math.round((pickedCount(order) / order.items.length) * 100);
}
export function canMarkReady(order) {
  const allowPartial =
    String(import.meta.env.VITE_ALLOW_READY_PARTIAL || "0") === "1";
  if (order.status !== "preparing") return false;
  return allowPartial ? true : allPicked(order);
}
