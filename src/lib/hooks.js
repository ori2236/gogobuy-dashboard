import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getPickerOrders,
  setOrderStatus,
  setOrderItemPickerDetails,
  getStockCategories,
  getStockProductsPage,
  createStockProduct,
  updateStockProduct,
  deleteStockProduct,
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  getProductGroupPromotions,
  createProductGroupPromotion,
  updateProductGroupPromotion,
  deleteProductGroupPromotion,
  getCartPromotionRules,
  createCartPromotionRule,
  updateCartPromotionRule,
  deleteCartPromotionRule,
  getBusinessSettings,
  updateBusinessSettings,
  getStaffWhatsappRecipients,
  createStaffWhatsappRecipient,
  updateStaffWhatsappRecipient,
  deleteStaffWhatsappRecipient,
  sendStaffWhatsappRecipientTest,
  getMarketDayPromotions,
  getMarketDayRecipients,
  createMarketDayRecipient,
  updateMarketDayRecipient,
  deleteMarketDayRecipient,
  sendMarketDayTemplate,
  sendMarketDayTemplateToRecipient,
  getShopId,
} from "./api";

export function useOrders(statuses) {
  const key = Array.isArray(statuses) ? statuses.join(",") : "";
  const shopId = getShopId();
  return useQuery({
    queryKey: ["pickerOrders", shopId, key],
    queryFn: () => getPickerOrders(statuses),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useSetOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status, pickerNote, packagingBagsCount, packagingCartonsCount }) =>
      setOrderStatus(orderId, status, pickerNote, {
        packaging_bags_count: packagingBagsCount,
        packaging_cartons_count: packagingCartonsCount,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pickerOrders"] }),
  });
}

export function useUpdateOrderItemPickerDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, itemId, suppliedAmount, pickerNote }) =>
      setOrderItemPickerDetails(orderId, itemId, {
        supplied_amount: suppliedAmount,
        picker_note: pickerNote,
      }),
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
    queryKey: ["stockCategories", getShopId()],
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
    getShopId(),
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
    staleTime: 60_000,
    gcTime: 5 * 60_000,
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

export function usePromotions({
  status,
  q,
  category,
  sub_category,
  sort_by,
  sort_dir,
}) {
  return useQuery({
    queryKey: [
      "promotions",
      getShopId(),
      {
        status: status ?? "all",
        q: q ?? "",
        category: category ?? "",
        sub_category: sub_category ?? "",
        sort_by: sort_by ?? "default",
        sort_dir: sort_dir ?? "desc",
      },
    ],
    queryFn: () =>
      getPromotions({ status, q, category, sub_category, sort_by, sort_dir }),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
  });
}

function invalidateAfterPromotionChange(qc) {
  qc.invalidateQueries({ queryKey: ["promotions"] });
  qc.invalidateQueries({ queryKey: ["marketDayPromotions"] });
  qc.invalidateQueries({ queryKey: ["pickerOrders"] });
}

export function useCreatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createPromotion(payload),
    onSuccess: () => invalidateAfterPromotionChange(qc),
  });
}

export function useUpdatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updatePromotion(id, payload),
    onSuccess: () => invalidateAfterPromotionChange(qc),
  });
}

export function useDeletePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deletePromotion(id),
    onSuccess: () => invalidateAfterPromotionChange(qc),
  });
}



export function useProductGroupPromotions({ status, q, sort_by, sort_dir } = {}) {
  return useQuery({
    queryKey: [
      "productGroupPromotions",
      getShopId(),
      {
        status: status ?? "all",
        q: q ?? "",
        sort_by: sort_by ?? "default",
        sort_dir: sort_dir ?? "desc",
      },
    ],
    queryFn: () => getProductGroupPromotions({ status, q, sort_by, sort_dir }),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
  });
}

function invalidateAfterProductGroupPromotionChange(qc) {
  qc.invalidateQueries({ queryKey: ["productGroupPromotions"] });
  qc.invalidateQueries({ queryKey: ["marketDayPromotions"] });
  qc.invalidateQueries({ queryKey: ["pickerOrders"] });
}

export function useCreateProductGroupPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createProductGroupPromotion(payload),
    onSuccess: () => invalidateAfterProductGroupPromotionChange(qc),
  });
}

export function useUpdateProductGroupPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateProductGroupPromotion(id, payload),
    onSuccess: () => invalidateAfterProductGroupPromotionChange(qc),
  });
}

export function useDeleteProductGroupPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteProductGroupPromotion(id),
    onSuccess: () => invalidateAfterProductGroupPromotionChange(qc),
  });
}

export function useCartPromotionRules({ status, q } = {}) {
  return useQuery({
    queryKey: [
      "cartPromotionRules",
      getShopId(),
      {
        status: status ?? "all",
        q: q ?? "",
      },
    ],
    queryFn: () => getCartPromotionRules({ status, q }),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
  });
}

function invalidateAfterCartPromotionRuleChange(qc) {
  qc.invalidateQueries({ queryKey: ["cartPromotionRules"] });
  qc.invalidateQueries({ queryKey: ["marketDayPromotions"] });
  qc.invalidateQueries({ queryKey: ["pickerOrders"] });
}

export function useCreateCartPromotionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createCartPromotionRule(payload),
    onSuccess: () => invalidateAfterCartPromotionRuleChange(qc),
  });
}

export function useUpdateCartPromotionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateCartPromotionRule(id, payload),
    onSuccess: () => invalidateAfterCartPromotionRuleChange(qc),
  });
}

export function useDeleteCartPromotionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteCartPromotionRule(id),
    onSuccess: () => invalidateAfterCartPromotionRuleChange(qc),
  });
}
export function useMarketDayPromotions({ enabled = true } = {}) {
  return useQuery({
    queryKey: ["marketDayPromotions", getShopId()],
    queryFn: () => getMarketDayPromotions(),
    enabled: Boolean(enabled),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
  });
}

export function useMarketDayRecipients({ enabled = true } = {}) {
  return useQuery({
    queryKey: ["marketDayRecipients", getShopId()],
    queryFn: () => getMarketDayRecipients(),
    enabled: Boolean(enabled),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
  });
}

function invalidateMarketDayRecipients(qc) {
  qc.invalidateQueries({ queryKey: ["marketDayRecipients"] });
}

export function useCreateMarketDayRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createMarketDayRecipient(payload),
    onSuccess: () => invalidateMarketDayRecipients(qc),
  });
}

export function useUpdateMarketDayRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateMarketDayRecipient(id, payload),
    onSuccess: () => invalidateMarketDayRecipients(qc),
  });
}

export function useDeleteMarketDayRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteMarketDayRecipient(id),
    onSuccess: () => invalidateMarketDayRecipients(qc),
  });
}

export function useSendMarketDayTemplate() {
  return useMutation({
    mutationFn: () => sendMarketDayTemplate(),
  });
}

export function useSendMarketDayTemplateToRecipient() {
  return useMutation({
    mutationFn: (id) => sendMarketDayTemplateToRecipient(id),
  });
}


export function useBusinessSettings() {
  return useQuery({
    queryKey: ["businessSettings", getShopId()],
    queryFn: () => getBusinessSettings(),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
  });
}

export function useUpdateBusinessSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => updateBusinessSettings(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["businessSettings"] });
    },
  });
}


export function useStaffWhatsappRecipients() {
  return useQuery({
    queryKey: ["staffWhatsappRecipients", getShopId()],
    queryFn: () => getStaffWhatsappRecipients(),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 30_000,
  });
}

function invalidateStaffWhatsappRecipients(qc) {
  qc.invalidateQueries({ queryKey: ["staffWhatsappRecipients"] });
}

export function useCreateStaffWhatsappRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createStaffWhatsappRecipient(payload),
    onSuccess: () => invalidateStaffWhatsappRecipients(qc),
  });
}

export function useUpdateStaffWhatsappRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateStaffWhatsappRecipient(id, payload),
    onSuccess: () => invalidateStaffWhatsappRecipients(qc),
  });
}

export function useDeleteStaffWhatsappRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteStaffWhatsappRecipient(id),
    onSuccess: () => invalidateStaffWhatsappRecipients(qc),
  });
}

export function useSendStaffWhatsappRecipientTest() {
  return useMutation({
    mutationFn: (id) => sendStaffWhatsappRecipientTest(id),
  });
}
