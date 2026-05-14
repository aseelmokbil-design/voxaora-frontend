const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function token(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("vox_token");
}

async function req<T>(path: string, opts: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };
  if (auth) {
    const t = token();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const e = new Error(err.detail ?? "Request failed") as Error & { status: number };
    e.status = res.status;
    throw e;
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────
export interface UserBrief {
  id: string; phone: string; full_name: string; email?: string;
  role: string; status: string; profile_image_url?: string; preferred_language: string;
}
export interface AuthResponse {
  access_token: string; refresh_token: string; expires_in: number; user: UserBrief;
}

export const authApi = {
  login: (phone: string, password: string) =>
    req<AuthResponse>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ phone, password }) }, false),

  register: (phone: string, password: string, full_name: string, preferred_language = "ar") =>
    req<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ phone, password, full_name, preferred_language }),
    }, false),

  refresh: (refresh_token: string) =>
    req<AuthResponse>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token }),
    }, false),
};

// ── Merchants ─────────────────────────────────────────────────────────
export interface Merchant {
  id: string; name: string; name_ar: string; description?: string; description_ar?: string;
  category: string; logo_url?: string; cover_image_url?: string;
  rating: number; total_reviews: number; delivery_fee: number;
  min_order_amount: number; free_delivery_above?: number;
  avg_preparation_time: number; is_open_now: boolean;
  city: string; full_address?: string; phone?: string;
  distance_km?: number; estimated_eta_minutes?: number; score?: number;
}
export interface Product {
  id: string; name: string; name_ar: string; description?: string; description_ar?: string;
  price: number; original_price?: number; image_url?: string;
  preparation_time?: number; rating?: number; tags?: string[]; options?: unknown[];
}
export interface MenuCategory { id: string | null; name: string; name_ar: string; products: Product[]; }

export interface ProductDetail extends Product {
  calories?: number;
  total_orders?: number;
  related?: Product[];
}

export const merchantApi = {
  search: (lat: number, lng: number, category?: string, query?: string, limit = 10) => {
    const params = new URLSearchParams({ latitude: String(lat), longitude: String(lng), limit: String(limit) });
    if (category) params.set("category", category);
    if (query) params.set("query", query);
    return req<{ merchants: Merchant[]; total: number }>(`/api/v1/merchants/search?${params}`, {}, false);
  },
  get: (id: string) => req<Merchant>(`/api/v1/merchants/${id}`, {}, false),
  menu: (id: string) => req<{ categories: MenuCategory[] }>(`/api/v1/merchants/${id}/menu`, {}, false),
  product: (merchantId: string, productId: string) =>
    req<ProductDetail>(`/api/v1/merchants/${merchantId}/products/${productId}`, {}, false),
};

// ── Orders ────────────────────────────────────────────────────────────
export interface OrderItem { product_id: string; quantity: number; notes?: string; selected_options?: unknown[]; }
export interface Order {
  id: string; order_number: string; status: string; order_type: string;
  subtotal: number; delivery_fee: number; discount_amount: number;
  tax_amount: number; total_amount: number; estimated_delivery_time?: number;
  is_voice_order: boolean; items: OrderItemDetail[]; merchant?: MerchantBrief;
  delivery_address?: unknown; created_at: string;
  customer_rating?: number; customer_review?: string;
}
export interface OrderItemDetail {
  id: string; product_id: string; product_name: string; product_name_ar?: string;
  quantity: number; unit_price: number; total_price: number; notes?: string; image_url?: string;
}
export interface MerchantBrief { id: string; name: string; name_ar: string; logo_url?: string; phone?: string; }

export interface TrackingSnapshot {
  status: string;
  order_number: string;
  merchant_lat: number; merchant_lng: number; merchant_name: string; merchant_address?: string;
  customer_lat: number; customer_lng: number; customer_address?: string;
  driver_lat: number; driver_lng: number;
  has_driver: boolean;
  eta_minutes: number;
  route_coords?: [number, number][]; // [[lng, lat], ...] from OSRM
}

export const orderApi = {
  create: (data: {
    merchant_id: string; items: OrderItem[]; payment_method?: string;
    order_type?: string; delivery_notes?: string; coupon_code?: string;
    address_id?: string; is_voice_order?: boolean; voice_session_id?: string;
  }) => req<Order>("/api/v1/orders", { method: "POST", body: JSON.stringify(data) }),

  list: (status?: string) => {
    const params = status ? `?status_filter=${status}` : "";
    return req<Order[]>(`/api/v1/orders${params}`);
  },

  get: (id: string) => req<Order>(`/api/v1/orders/${id}`),

  cancel: (id: string) => req<{ message: string }>(`/api/v1/orders/${id}/cancel`, { method: "POST" }),

  tracking: (id: string) => req<TrackingSnapshot>(`/api/v1/orders/${id}/tracking`, {}, false),

  rate: (id: string, rating: number, review?: string) =>
    req<{ ok: boolean }>(`/api/v1/orders/${id}/rate`, {
      method: "POST",
      body: JSON.stringify({ rating, review }),
    }),
};

// ── Addresses ─────────────────────────────────────────────────────────
export interface Address {
  id: string; label: string; full_address: string; city: string;
  district?: string; latitude: number; longitude: number; is_default: boolean;
}

export const addressApi = {
  list: async (): Promise<Address[]> => {
    const profile = await req<{ addresses?: Address[] }>("/api/v1/users/me");
    return profile.addresses ?? [];
  },
  add: (data: { label?: string; full_address?: string; city?: string; district?: string; latitude: number; longitude: number; is_default?: boolean }) =>
    req<Address>("/api/v1/users/me/addresses", { method: "POST", body: JSON.stringify(data) }),
  create: (data: Omit<Address, "id" | "is_default"> & { is_default?: boolean }) =>
    req<Address>("/api/v1/users/me/addresses", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) => req<{ message: string }>(`/api/v1/users/me/addresses/${id}`, { method: "DELETE" }),
  reverseGeocode: (lat: number, lng: number) =>
    req<{ full_address: string; city: string; district: string }>(`/api/v1/users/geocode/reverse?lat=${lat}&lng=${lng}`),
};

// ── Loyalty & Streaks ──────────────────────────────────────────────────
export interface LoyaltyData {
  points: number; tier: string; tier_emoji: string;
  next_threshold: number; points_to_next: number; progress_pct: number; total_orders: number;
}
export interface StreakData {
  current_streak: number; longest_streak: number; last_order_date: string | null; total_order_days: number;
}

// ── Notifications ─────────────────────────────────────────────────────
export interface AppNotification {
  id: string; type: string; title: string; body: string;
  is_read: boolean; created_at: string;
  data?: { order_id?: string; order_number?: string };
}

export const notificationApi = {
  list: () => req<{ notifications: AppNotification[]; unread_count: number }>("/api/v1/notifications"),
  markRead: (id: string) => req<{ ok: boolean }>(`/api/v1/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () => req<{ ok: boolean }>("/api/v1/notifications/read-all", { method: "POST" }),
};

// ── Intelligence ─────────────────────────────────────────────────────
export interface ReorderSuggestion {
  order_id: string; order_number: string;
  merchant_id: string; merchant_name: string; merchant_logo?: string; merchant_is_open: boolean;
  items_summary: string; total_amount: number; created_at: string;
}

export interface PersonalizedGreeting {
  greeting: string;
  reorder_suggestion?: string;
  reorder_order_id?: string;
  hour: number;
}

export interface UserImpact {
  total_orders: number;
  voice_commands_used: number;
  time_saved_hours: number;
  money_saved: number;
  quick_reorders: number;
  smart_decisions: number;
  this_month: {
    orders: number;
    voice_used: number;
    time_saved_h: number;
    money_saved: number;
  };
  member_since?: string;
}

export const intelligenceApi = {
  reorderSuggestions: () =>
    req<{ suggestions: ReorderSuggestion[] }>("/api/v1/intelligence/reorder-suggestions"),

  reorder: (order_id: string, payment_method = "cash") =>
    req<{ order_id: string; order_number: string; merchant_name: string; estimated_delivery_time: number; tts_response: string; total_amount: number }>(
      `/api/v1/intelligence/reorder/${order_id}`,
      { method: "POST", body: JSON.stringify({ payment_method }) }
    ),

  greeting: () => req<PersonalizedGreeting>("/api/v1/intelligence/greeting"),

  impact: () => req<UserImpact>("/api/v1/intelligence/impact"),
  loyalty: () => req<LoyaltyData>("/api/v1/intelligence/loyalty"),
  streaks: () => req<StreakData>("/api/v1/intelligence/streaks"),

  concierge: (request_text: string, category_hint?: string, is_voice_request = false) =>
    req<{ request_id: string; tts_response: string; message: string }>(
      "/api/v1/intelligence/concierge",
      { method: "POST", body: JSON.stringify({ request_text, category_hint, is_voice_request }) }
    ),
};

// ── Voice ─────────────────────────────────────────────────────────────
export interface VoiceRecommendation {
  id: string; name: string; name_ar: string; category: string;
  rating: number; delivery_fee: number; estimated_eta_minutes: number;
  distance_km: number; score: number; logo_url?: string;
  items?: { id: string; name: string; name_ar: string; price: number; preparation_time?: number; }[];
  has_requested_items?: boolean;
}
export interface VoiceResponse {
  session_id: string; transcript: string;
  intent: { category?: string; items?: unknown[]; language?: string; action?: string; selected_index?: number; [key: string]: unknown; };
  recommendations: VoiceRecommendation[];
  tts_response: string;
  audio_base64?: string | null;   // base64 MP3 from Edge TTS
  processing_ms: number;
}

export interface VoiceContext {
  previous_transcript: string;
  previous_results: Array<{
    name: string; name_ar?: string;
    estimated_eta_minutes: number; delivery_fee: number; distance_km: number; rating: number;
  }>;
  previous_session_id: string;
}

// ── Agent (Conversational AI) ─────────────────────────────────────────
export interface AgentOrderDraftItem {
  product_id: string; name_ar: string; qty: number; unit_price: number; subtotal: number;
}
export interface AgentOrderDraft {
  merchant_id: string; merchant_name_ar: string; eta_minutes: number;
  items: AgentOrderDraftItem[];
  subtotal: number; delivery_fee: number; service_fee: number; total: number;
}
export interface AgentTurnResponse {
  session_id: string;
  state: string;   // listening | recommending | clarifying | confirming | dispatching | tracking | delivered | cancelled
  tts: string;
  audio_base64?: string | null;
  order_draft?: AgentOrderDraft | null;
  order_id?: string | null;
  order_number?: string | null;
  clarification_options: string[];
  missing_items: string[];
  alternatives: Record<string, { product_name_ar: string; price: number; merchant_name_ar: string }[]>;
  coverage_pct: number;
}

export const agentApi = {
  startSession: (lat: number, lng: number): Promise<{ session_id: string; tts: string; audio_base64?: string; state: string }> => {
    const params = new URLSearchParams({ latitude: String(lat), longitude: String(lng) });
    return req(`/api/v1/agent/session?${params}`, { method: "POST" });
  },

  audioTurn: async (sessionId: string, audio: Blob, lat: number, lng: number): Promise<AgentTurnResponse> => {
    const t = token();
    const form = new FormData();
    const ext = audio.type.includes("ogg") ? "ogg" : audio.type.includes("mp4") ? "mp4" : "webm";
    form.append("audio", audio, `audio.${ext}`);
    form.append("latitude", String(lat));
    form.append("longitude", String(lng));
    const res = await fetch(`${API}/api/v1/agent/session/${sessionId}/turn`, {
      method: "POST",
      headers: t ? { Authorization: `Bearer ${t}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const e = new Error(err.detail ?? "Agent turn failed") as Error & { status: number };
      e.status = res.status;
      throw e;
    }
    return res.json();
  },

  textTurn: (sessionId: string, transcript: string, lat: number, lng: number): Promise<AgentTurnResponse> =>
    req<AgentTurnResponse>(`/api/v1/agent/session/${sessionId}/text`, {
      method: "POST",
      body: JSON.stringify({ transcript, latitude: lat, longitude: lng }),
    }),

  status: (sessionId: string) =>
    req<{ session_id: string; state: string; order_id?: string; order_number?: string; order_draft?: AgentOrderDraft; total_turns: number; coverage_pct: number; missing_items: string[] }>(
      `/api/v1/agent/session/${sessionId}`
    ),
};

// ── Admin ─────────────────────────────────────────────────────────────
export interface AdminMerchant {
  id: string; name: string; name_ar: string; category: string; status: string;
  rating: number; total_orders: number; city: string; logo_url?: string;
  cover_image_url?: string; is_open_now: boolean; delivery_fee: number;
  avg_preparation_time: number; created_at: string;
}
export interface AdminMerchantDetail extends AdminMerchant {
  description?: string; description_ar?: string; phone?: string; email?: string;
  full_address: string; min_order_amount: number; total_reviews: number;
  operating_hours?: unknown[]; commission_rate: number; latitude: number; longitude: number;
}
export interface AdminProduct {
  id: string; name: string; name_ar?: string; description?: string; description_ar?: string;
  price: number; discounted_price?: number; image_url?: string; extra_images?: string[];
  status: string; preparation_time: number; calories?: number; tags?: string[];
  sort_order: number; total_orders: number; rating: number; category_id?: string;
}
export interface AdminDeal {
  id: string; title: string; title_ar?: string; description?: string; image_url?: string;
  original_price?: number; discounted_price?: number; discount_pct?: number;
  valid_from?: string; valid_until?: string; is_active: boolean; placement: string;
  merchant_id?: string; sort_order: number; extra_images?: string[]; created_at: string;
}
export interface AdminBanner {
  id: string; title?: string; title_ar?: string; subtitle_ar?: string; image_url: string;
  link_url?: string; placement: string; merchant_id?: string;
  valid_from?: string; valid_until?: string; is_active: boolean; sort_order: number;
  bg_color?: string; created_at: string;
}
export interface AdminCategory {
  id: string; name: string; name_ar?: string; sort_order: number; is_active: boolean;
}
export interface AdminProductGlobal extends AdminProduct {
  merchant_id: string; merchant_name: string;
}
export interface AdminOrder {
  id: string; order_number: string; status: string; total_amount: number;
  is_voice_order: boolean; payment_method?: string;
  customer_id: string; customer_name: string; customer_phone: string;
  merchant_id: string; merchant_name: string; created_at: string;
}
export interface AdminUser {
  id: string; phone: string; full_name: string; email?: string;
  role: string; status: string; created_at: string;
}
export interface DashboardStats {
  total_users: number; total_merchants: number; total_orders: number; active_drivers: number;
  pending_orders: number; total_revenue: number; pending_merchants: number;
  active_deals: number; active_banners: number;
}

async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const t = token();
  const headers: Record<string, string> = {};
  if (t) headers["Authorization"] = `Bearer ${t}`;
  const res = await fetch(`${API}/api/v1/admin/upload`, { method: "POST", headers, body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Upload failed");
  }
  const data = await res.json();
  return `${API}${data.url}`;
}

export const adminApi = {
  uploadImage: uploadFile,

  dashboard: () => req<DashboardStats>("/api/v1/admin/dashboard"),

  // Merchants (paginated)
  merchants: (params?: { status?: string; search?: string; category?: string; limit?: number; offset?: number }) => {
    const p = new URLSearchParams();
    if (params?.status)   p.set("status", params.status);
    if (params?.search)   p.set("search", params.search);
    if (params?.category) p.set("category", params.category);
    if (params?.limit  != null) p.set("limit", String(params.limit));
    if (params?.offset != null) p.set("offset", String(params.offset));
    const qs = p.toString();
    return req<{ total: number; limit: number; offset: number; merchants: AdminMerchant[] }>(
      `/api/v1/admin/merchants${qs ? `?${qs}` : ""}`
    );
  },
  getMerchant: (id: string) => req<AdminMerchantDetail>(`/api/v1/admin/merchants/${id}`),
  updateMerchant: (id: string, data: Partial<AdminMerchantDetail & { logo_url: string; cover_image_url: string; is_open_now: boolean; operating_hours: unknown[] }>) =>
    req<{ message: string }>(`/api/v1/admin/merchants/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  merchantAction: (merchant_id: string, action: string) =>
    req<{ message: string }>("/api/v1/admin/merchants/action", { method: "POST", body: JSON.stringify({ merchant_id, action }) }),

  // Categories
  categories: (merchantId: string) => req<AdminCategory[]>(`/api/v1/admin/merchants/${merchantId}/categories`),
  createCategory: (merchantId: string, data: { name: string; name_ar?: string; sort_order?: number }) =>
    req<AdminCategory>(`/api/v1/admin/merchants/${merchantId}/categories`, { method: "POST", body: JSON.stringify(data) }),
  updateCategory: (merchantId: string, catId: string, data: Partial<AdminCategory>) =>
    req<{ message: string }>(`/api/v1/admin/merchants/${merchantId}/categories/${catId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCategory: (merchantId: string, catId: string) =>
    req<{ message: string }>(`/api/v1/admin/merchants/${merchantId}/categories/${catId}`, { method: "DELETE" }),

  // Products (global search)
  productsGlobal: (params?: { search?: string; merchant_id?: string; status?: string; limit?: number; offset?: number }) => {
    const p = new URLSearchParams();
    if (params?.search)      p.set("search", params.search);
    if (params?.merchant_id) p.set("merchant_id", params.merchant_id);
    if (params?.status)      p.set("status", params.status);
    if (params?.limit  != null) p.set("limit", String(params.limit));
    if (params?.offset != null) p.set("offset", String(params.offset));
    const qs = p.toString();
    return req<{ total: number; limit: number; offset: number; products: AdminProductGlobal[] }>(
      `/api/v1/admin/products${qs ? `?${qs}` : ""}`
    );
  },

  // Products per merchant
  products: (merchantId: string) => req<AdminProduct[]>(`/api/v1/admin/merchants/${merchantId}/products`),
  createProduct: (merchantId: string, data: Partial<AdminProduct> & { name: string; price: number }) =>
    req<AdminProduct>(`/api/v1/admin/merchants/${merchantId}/products`, { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (merchantId: string, productId: string, data: Partial<AdminProduct>) =>
    req<AdminProduct>(`/api/v1/admin/merchants/${merchantId}/products/${productId}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (merchantId: string, productId: string) =>
    req<{ message: string }>(`/api/v1/admin/merchants/${merchantId}/products/${productId}`, { method: "DELETE" }),

  // Orders (admin)
  orders: (params?: { status?: string; search?: string; limit?: number; offset?: number }) => {
    const p = new URLSearchParams();
    if (params?.status)  p.set("status", params.status);
    if (params?.search)  p.set("search", params.search);
    if (params?.limit  != null) p.set("limit", String(params.limit));
    if (params?.offset != null) p.set("offset", String(params.offset));
    const qs = p.toString();
    return req<{ total: number; limit: number; offset: number; orders: AdminOrder[] }>(
      `/api/v1/admin/orders${qs ? `?${qs}` : ""}`
    );
  },
  updateOrderStatus: (id: string, status: string) =>
    req<{ message: string }>(`/api/v1/admin/orders/${id}/status?status=${status}`, { method: "PUT" }),

  // Users (admin)
  users: (params?: { role?: string; status?: string; search?: string; limit?: number; offset?: number }) => {
    const p = new URLSearchParams();
    if (params?.role)   p.set("role", params.role);
    if (params?.status) p.set("status", params.status);
    if (params?.search) p.set("search", params.search);
    if (params?.limit  != null) p.set("limit", String(params.limit));
    if (params?.offset != null) p.set("offset", String(params.offset));
    const qs = p.toString();
    return req<{ total: number; limit: number; offset: number; users: AdminUser[] }>(
      `/api/v1/admin/users${qs ? `?${qs}` : ""}`
    );
  },
  userAction: (user_id: string, action: string) =>
    req<{ message: string }>("/api/v1/admin/users/action", { method: "POST", body: JSON.stringify({ user_id, action }) }),

  // Deals
  deals: (placement?: string) => {
    const p = placement ? `?placement=${placement}` : "";
    return req<AdminDeal[]>(`/api/v1/admin/deals${p}`);
  },
  createDeal: (data: Partial<AdminDeal>) =>
    req<AdminDeal>("/api/v1/admin/deals", { method: "POST", body: JSON.stringify(data) }),
  updateDeal: (id: string, data: Partial<AdminDeal>) =>
    req<AdminDeal>(`/api/v1/admin/deals/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDeal: (id: string) =>
    req<{ message: string }>(`/api/v1/admin/deals/${id}`, { method: "DELETE" }),

  // Banners
  banners: (placement?: string) => {
    const p = placement ? `?placement=${placement}` : "";
    return req<AdminBanner[]>(`/api/v1/admin/banners${p}`);
  },
  createBanner: (data: Partial<AdminBanner> & { image_url: string }) =>
    req<AdminBanner>("/api/v1/admin/banners", { method: "POST", body: JSON.stringify(data) }),
  updateBanner: (id: string, data: Partial<AdminBanner>) =>
    req<AdminBanner>(`/api/v1/admin/banners/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteBanner: (id: string) =>
    req<{ message: string }>(`/api/v1/admin/banners/${id}`, { method: "DELETE" }),
};

// ── Driver ────────────────────────────────────────────────────────────────────
export interface DriverProfile {
  id: string; user_id: string; full_name: string; phone: string;
  vehicle_type: string; vehicle_plate?: string; vehicle_model?: string;
  status: string; rating: number; total_deliveries: number; total_earnings: number;
  city?: string; is_verified: boolean;
}
export interface DriverAvailableOrder {
  id: string; order_number: string;
  merchant_name: string; merchant_address: string;
  merchant_lat: number; merchant_lng: number;
  delivery_address: unknown;
  total_amount: number; delivery_fee: number; driver_earnings: number;
  items_count: number; created_at: string;
}
export interface DriverCurrentOrder {
  id: string; order_number: string; status: string;
  merchant_name: string; merchant_lat: number; merchant_lng: number; merchant_phone?: string;
  delivery_address: unknown;
  customer_name: string; customer_phone: string;
  total_amount: number; delivery_fee: number; driver_earnings: number;
  items: { name: string; quantity: number }[];
}
export interface DriverEarnings {
  total_earnings: number; total_deliveries: number; rating: number;
  today:  { orders: number; earnings: number };
  week:   { orders: number; earnings: number };
  month:  { orders: number; earnings: number };
}
export interface DriverHistoryOrder {
  id: string; order_number: string; merchant_name: string;
  total_amount: number; driver_earnings: number;
  created_at: string; delivered_at: string;
}
export interface DriverIncentive {
  label: string; target: number; progress: number;
  remaining: number; bonus: number; achieved: boolean;
}
export interface DriverEarningsFull extends DriverEarnings {
  is_peak: boolean;
  rating_bonus: { label: string; pct: number } | null;
  incentives: DriverIncentive[];
}
export interface DriverWallet {
  balance: number; pending_withdrawal: number; available_for_withdrawal: number;
  transactions: {
    id: string; type: string; amount: number;
    description: string; status: string; created_at: string;
  }[];
}
export interface DriverDoc {
  id: string; doc_type: string; label: string;
  file_url: string; status: string; notes?: string;
}

export const driverApi = {
  me: () => req<DriverProfile>("/api/v1/driver/me"),
  setStatus: (status: "available" | "offline") =>
    req<{ status: string }>("/api/v1/driver/status", { method: "PUT", body: JSON.stringify({ status }) }),
  updateLocation: (latitude: number, longitude: number) =>
    req<{ ok: boolean }>("/api/v1/driver/location", { method: "PUT", body: JSON.stringify({ latitude, longitude }) }),
  availableOrders: () =>
    req<{ orders: DriverAvailableOrder[] }>("/api/v1/driver/orders/available"),
  accept: (orderId: string) =>
    req<{ ok: boolean; order_id: string }>(`/api/v1/driver/orders/${orderId}/accept`, { method: "POST" }),
  reject: (orderId: string) =>
    req<{ ok: boolean }>(`/api/v1/driver/orders/${orderId}/reject`, { method: "POST" }),
  currentOrder: () =>
    req<{ order: DriverCurrentOrder | null }>("/api/v1/driver/orders/current"),
  step: (orderId: string, step: "at_store" | "picked_up" | "delivered") =>
    req<{ ok: boolean; order_status: string; driver_status: string }>(
      `/api/v1/driver/orders/${orderId}/step`,
      { method: "PUT", body: JSON.stringify({ step }) }
    ),
  earnings: () => req<DriverEarningsFull>("/api/v1/driver/earnings"),
  history: (limit = 20, offset = 0) =>
    req<{ total: number; orders: DriverHistoryOrder[] }>(
      `/api/v1/driver/history?limit=${limit}&offset=${offset}`
    ),
  wallet: () => req<DriverWallet>("/api/v1/driver/wallet"),
  withdraw: (amount: number, notes?: string) =>
    req<{ ok: boolean; message: string }>("/api/v1/driver/wallet/withdraw", {
      method: "POST", body: JSON.stringify({ amount, notes }),
    }),
  documents: () => req<{ documents: DriverDoc[]; required: string[] }>("/api/v1/driver/documents"),
  uploadDoc: (docType: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const t = token();
    const headers: Record<string, string> = {};
    if (t) headers["Authorization"] = `Bearer ${t}`;
    return fetch(`${API}/api/v1/driver/documents/upload?doc_type=${docType}`, {
      method: "POST", headers, body: form,
    }).then(r => r.json() as Promise<{ ok: boolean; file_url: string }>);
  },
};

// ── Live Stats (social proof) ──────────────────────────────────────────
export interface LiveStats {
  open_now: number;
  total_merchants: number;
  total_products: number;
  orders_today: number;
  top_categories: { name: string; count: number }[];
  hot_merchants: Record<string, number>;
}

export const statsApi = {
  live: () => req<LiveStats>("/api/v1/stats/live", {}, false),
};

export const voiceApi = {
  transcribe: async (audioBlob: Blob, lat: number, lng: number, context?: VoiceContext): Promise<VoiceResponse> => {
    const ext = audioBlob.type.includes("mp4") ? "mp4"
              : audioBlob.type.includes("ogg")  ? "ogg"
              : audioBlob.type.includes("wav")  ? "wav"
              : "webm";
    const form = new FormData();
    form.append("audio", audioBlob, `voice.${ext}`);
    form.append("latitude", String(lat));
    form.append("longitude", String(lng));
    if (context) form.append("context_json", JSON.stringify(context));
    const t = token();
    const headers: Record<string, string> = {};
    if (t) headers["Authorization"] = `Bearer ${t}`;
    const res = await fetch(`${API}/api/v1/voice/transcribe`, { method: "POST", headers, body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const e = new Error(err.detail ?? "Voice processing failed") as Error & { status: number };
      e.status = res.status;
      throw e;
    }
    return res.json();
  },

  processText: (transcript: string, lat: number, lng: number, language = "ar", context?: VoiceContext) =>
    req<VoiceResponse>("/api/v1/voice/intent", {
      method: "POST",
      body: JSON.stringify({ transcript, latitude: lat, longitude: lng, language, context }),
    }),

  confirm: (session_id: string, selected_index: number, payment_method = "cash") =>
    req<{
      order_id: string; order_number: string; merchant_name: string;
      estimated_eta: number; total_amount: number; tts_response: string; status: string;
    }>("/api/v1/voice/confirm", {
      method: "POST",
      body: JSON.stringify({ session_id, selected_index, payment_method }),
    }),
};

// ── Conversational Shopping Agent ────────────────────────────────────
export interface AgentCartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  selected_options: Record<string, string>;
  image_url?: string;
}

export interface AgentQuestion {
  item_index: number;
  field: string;
  question: string;
  options: string[];
}

export interface AgentUnavailableItem {
  name: string;
  alternatives: { id: string; name_ar: string; price: number }[];
}

export interface AgentResponse {
  session_id: string;
  status: "needs_clarification" | "needs_confirmation" | "completed" | "error";
  response_text: string;
  questions: AgentQuestion[];
  cart_items: AgentCartItem[];
  unavailable_items: AgentUnavailableItem[];
  alternatives: { requested_name: string; alternatives: { id: string; name_ar: string; price: number }[] }[];
  summary: string;
  total_amount: number;
}

export const legacyAgentApi = {
  chat: (message: string, merchantId: string, sessionId?: string | null, lat?: number, lng?: number) =>
    req<AgentResponse>("/api/v1/ai/order-assistant", {
      method: "POST",
      body: JSON.stringify({
        message,
        merchant_id: merchantId,
        session_id: sessionId ?? undefined,
        latitude: lat,
        longitude: lng,
      }),
    }),
};

// ── Public Deals ──────────────────────────────────────────────────────
export interface PublicDeal {
  id: string;
  title: string;
  title_en?: string;
  description?: string;
  image_url?: string;
  original_price?: number;
  discounted_price?: number;
  discount_pct?: number;
  countdown_seconds: number;
  placement: string;
  sort_order: number;
  valid_until?: string;
  merchant_id?: string;
  product_id?: string;
}

export const dealApi = {
  list: (placement?: string, limit = 20) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (placement) params.set("placement", placement);
    return req<{ deals: PublicDeal[]; total: number }>(`/api/v1/deals?${params}`, {}, false);
  },
};

// ── Coupons ───────────────────────────────────────────────────────────
export interface CouponResult {
  valid: boolean;
  discount_amount: number;
  discount_type: string;
  discount_value: number;
  description?: string;
  message: string;
}

export const couponApi = {
  validate: (code: string, subtotal: number) =>
    req<CouponResult>("/api/v1/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ code, subtotal }),
    }),
};
