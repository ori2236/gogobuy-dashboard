import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getPickerOrders,
  setOrderStatus,
  getStockCategories,
  getStockProductsPage,
  createStockProduct,
  updateStockProduct,
  deleteStockProduct,
} from "./api";

export function useOrders(statuses) {
  const key = Array.isArray(statuses) ? statuses.join(",") : "";
  return useQuery({
    queryKey: ["pickerOrders", key],
    queryFn: () => getPickerOrders(statuses),
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

export function useStockCategories() {
  return useQuery({
    queryKey: ["stockCategories"],
    queryFn: () => getStockCategories(),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Rules:
// - if category is empty => require q length >= 2
// - if category exists => allow any q length (including empty)
export function useStockProductsInfinite({
  q,
  category,
  sub_category,
  enabled,
}) {
  const key = [
    "stockProducts",
    {
      q: q ?? "",
      category: category ?? "",
      sub_category: sub_category ?? "",
    },
  ];

  return useInfiniteQuery({
    queryKey: key,
    enabled: Boolean(enabled),
    queryFn: ({ pageParam }) =>
      getStockProductsPage({
        q,
        category,
        sub_category,
        cursor: pageParam ?? null,
        limit: 40,
      }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.next_cursor ?? null,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

function invalidateAfterStockChange(qc) {
  qc.invalidateQueries({ queryKey: ["stockProducts"] });
  qc.invalidateQueries({ queryKey: ["pickerOrders"] }); // כדי שעדכון/מחיקה שישפיעו על הזמנות יתעדכן UI
}

export function useCreateStockProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createStockProduct(payload),
    onSuccess: () => invalidateAfterStockChange(qc),
  });
}

export function useUpdateStockProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateStockProduct(id, payload),
    onSuccess: () => invalidateAfterStockChange(qc),
  });
}

export function useDeleteStockProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteStockProduct(id),
    onSuccess: () => invalidateAfterStockChange(qc),
  });
}