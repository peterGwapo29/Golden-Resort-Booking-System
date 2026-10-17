import { ApiError } from "@/lib/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

function getAuthHeader(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("gr_admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function adminFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: HeadersInit = {
    Accept: "application/json",
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  if (!isFormData) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("gr_admin_token");
      localStorage.removeItem("gr_admin_user");
      if (!window.location.pathname.includes("/admin/login")) {
        window.location.href = "/admin/login?expired=true";
      }
    }
    throw new ApiError(
      body.message || "An administrative request error occurred.",
      res.status,
      body.errors
    );
  }

  return body as T;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface DashboardMetrics {
  metrics: {
    rooms: {
      total: number;
      active: number;
      total_units: number;
    };
    reservations: {
      total: number;
      pending: number;
      confirmed: number;
      cancelled: number;
      completed: number;
    };
    today: {
      date: string;
      check_ins: number;
      check_outs: number;
    };
    financials: {
      verified_revenue_php: number;
      gross_collections_php?: number;
      completed_refunds_php?: number;
      net_collections_php?: number;
      pending_payments_php?: number;
      pending_payments_count?: number;
      outstanding_balances_php?: number;
      confirmed_booked_value_php: number;
      pending_value_php: number;
      currency: string;
    };
  };
  recent_reservations: any[];
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  summary?: any;
}

/* ==================== AUTH API ==================== */

export async function adminLogin(email: string, password: string): Promise<{
  token: string;
  user: AdminUser;
}> {
  const res = await fetch(`${API_BASE_URL}/admin/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      body.message || "Invalid credentials.",
      res.status,
      body.errors
    );
  }

  return body;
}

export async function adminLogout(): Promise<void> {
  try {
    await adminFetch("/admin/logout", { method: "POST" });
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem("gr_admin_token");
      localStorage.removeItem("gr_admin_user");
    }
  }
}

export async function getAdminMe(): Promise<{ user: AdminUser }> {
  return adminFetch<{ user: AdminUser }>("/admin/me");
}

/* ==================== DASHBOARD API ==================== */

export async function getDashboardStats(): Promise<DashboardMetrics> {
  return adminFetch<DashboardMetrics>("/admin/dashboard/stats");
}

/* ==================== ROOMS API ==================== */

export async function getAdminRooms(params: {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
} = {}): Promise<PaginatedResult<any>> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.category && params.category !== "all") q.set("category", params.category);
  if (params.status && params.status !== "all") q.set("status", params.status);
  if (params.page) q.set("page", String(params.page));

  return adminFetch<PaginatedResult<any>>(`/admin/rooms?${q.toString()}`);
}

export async function getAdminRoom(id: number): Promise<{ data: any }> {
  return adminFetch<{ data: any }>(`/admin/rooms/${id}`);
}

export async function createAdminRoom(payload: any): Promise<{ data: any }> {
  const isFormData =
    typeof FormData !== "undefined" && payload instanceof FormData;
  return adminFetch<{ data: any }>("/admin/rooms", {
    method: "POST",
    body: isFormData ? payload : JSON.stringify(payload),
  });
}

export async function updateAdminRoom(
  id: number,
  payload: any
): Promise<{ data: any }> {
  const isFormData =
    typeof FormData !== "undefined" && payload instanceof FormData;
  if (isFormData) {
    if (!payload.has("_method")) {
      payload.append("_method", "PUT");
    }
    return adminFetch<{ data: any }>(`/admin/rooms/${id}`, {
      method: "POST",
      body: payload,
    });
  }

  return adminFetch<{ data: any }>(`/admin/rooms/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function toggleAdminRoomActive(
  id: number
): Promise<{ message: string; is_active: boolean }> {
  return adminFetch<{ message: string; is_active: boolean }>(
    `/admin/rooms/${id}/toggle-active`,
    {
      method: "PATCH",
    }
  );
}

export async function deleteAdminRoom(id: number): Promise<{ message: string }> {
  return adminFetch<{ message: string }>(`/admin/rooms/${id}`, {
    method: "DELETE",
  });
}

/* ==================== RESERVATIONS API ==================== */

export async function getAdminReservations(params: {
  search?: string;
  status?: string;
  room_id?: number;
  from_date?: string;
  to_date?: string;
  page?: number;
} = {}): Promise<PaginatedResult<any>> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.status && params.status !== "all") q.set("status", params.status);
  if (params.room_id) q.set("room_id", String(params.room_id));
  if (params.from_date) q.set("from_date", params.from_date);
  if (params.to_date) q.set("to_date", params.to_date);
  if (params.page) q.set("page", String(params.page));

  return adminFetch<PaginatedResult<any>>(`/admin/reservations?${q.toString()}`);
}

export async function getAdminReservation(id: number): Promise<{ data: any }> {
  return adminFetch<{ data: any }>(`/admin/reservations/${id}`);
}

export async function updateAdminReservationStatus(
  id: number,
  status: string,
  notes?: string
): Promise<{ data: any }> {
  return adminFetch<{ data: any }>(`/admin/reservations/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, notes }),
  });
}

/* ==================== CUSTOMERS API ==================== */

export async function getAdminCustomers(params: {
  search?: string;
  page?: number;
} = {}): Promise<PaginatedResult<any>> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", String(params.page));

  return adminFetch<PaginatedResult<any>>(`/admin/customers?${q.toString()}`);
}

export async function getAdminCustomer(id: number): Promise<{ data: any }> {
  return adminFetch<{ data: any }>(`/admin/customers/${id}`);
}

/* ==================== PAYMENTS API ==================== */

export async function getAdminPayments(params: {
  search?: string;
  status?: string;
  payment_method?: string;
  page?: number;
} = {}): Promise<PaginatedResult<any>> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.status && params.status !== "all") q.set("status", params.status);
  if (params.payment_method && params.payment_method !== "all")
    q.set("payment_method", params.payment_method);
  if (params.page) q.set("page", String(params.page));

  return adminFetch<PaginatedResult<any>>(`/admin/payments?${q.toString()}`);
}

export async function recordAdminPayment(payload: {
  reservation_id: number;
  amount: number;
  payment_method: string;
  status?: string;
  notes?: string;
}): Promise<{ message: string; data: any }> {
  return adminFetch<{ message: string; data: any }>("/admin/payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminPaymentStatus(
  paymentId: number,
  status: string,
  notes?: string
): Promise<{ message: string; data: any; summary?: any }> {
  return adminFetch<{ message: string; data: any; summary?: any }>(
    `/admin/payments/${paymentId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    }
  );
}

/* ==================== REFUNDS API ==================== */

export interface AdminRefund {
  id: number;
  refund_reference: string;
  payment_id: number;
  payment_reference?: string;
  reservation_id: number;
  booking_reference?: string;
  guest_name?: string;
  amount: number;
  currency: string;
  reason: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  notes?: string | null;
  requested_by: string;
  approved_by?: string | null;
  created_at: string;
}

export interface CreateRefundPayload {
  amount: number;
  reason: string;
  status?: "pending" | "completed";
  notes?: string;
}

export async function createAdminRefund(
  paymentId: number,
  payload: CreateRefundPayload
): Promise<{
  message: string;
  data: AdminRefund;
  payment: {
    id: number;
    payment_reference: string;
    refunded_amount: number;
    remaining_refundable: number;
  };
  reservation_summary: any;
  summary: any;
}> {
  return adminFetch<{
    message: string;
    data: AdminRefund;
    payment: {
      id: number;
      payment_reference: string;
      refunded_amount: number;
      remaining_refundable: number;
    };
    reservation_summary: any;
    summary: any;
  }>(`/admin/payments/${paymentId}/refunds`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAdminPaymentRefunds(
  paymentId: number
): Promise<{
  payment_id: number;
  payment_reference: string;
  amount: number;
  refunded_amount: number;
  remaining_refundable: number;
  data: AdminRefund[];
}> {
  return adminFetch<{
    payment_id: number;
    payment_reference: string;
    amount: number;
    refunded_amount: number;
    remaining_refundable: number;
    data: AdminRefund[];
  }>(`/admin/payments/${paymentId}/refunds`);
}

export async function getAllAdminRefunds(
  params: {
    search?: string;
    status?: string;
    page?: number;
  } = {}
): Promise<PaginatedResult<AdminRefund>> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.status && params.status !== "all") q.set("status", params.status);
  if (params.page) q.set("page", String(params.page));

  return adminFetch<PaginatedResult<AdminRefund>>(`/admin/refunds?${q.toString()}`);
}

export async function updateAdminRefundStatus(
  refundId: number,
  status: string,
  notes?: string
): Promise<{ message: string; data: AdminRefund; summary?: any }> {
  return adminFetch<{ message: string; data: AdminRefund; summary?: any }>(
    `/admin/refunds/${refundId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    }
  );
}
