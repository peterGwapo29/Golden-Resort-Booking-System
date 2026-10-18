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
  is_active?: boolean;
  phone?: string | null;
  department?: string | null;
  notes?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  permissions?: string[];
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

export interface CreateAdminReservationPayload {
  room_id: number;
  check_in: string;
  check_out: string;
  adults: number;
  children?: number;
  guest_full_name: string;
  guest_email: string;
  guest_phone: string;
  booking_source: "walk_in" | "phone" | "front_desk" | "corporate" | "ota";
  status?: "pending" | "confirmed";
  special_requests?: string;
  initial_payment?: {
    amount: number;
    payment_method: "cash" | "bank_transfer" | "credit_card" | "credit_card_terminal" | "e_wallet" | "other";
    notes?: string;
  };
}

export async function createAdminReservation(
  payload: CreateAdminReservationPayload
): Promise<{ data: any; message: string }> {
  return adminFetch<{ data: any; message: string }>("/admin/reservations", {
    method: "POST",
    body: JSON.stringify(payload),
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

/* ==================== CALENDAR & AVAILABILITY API ==================== */

export interface CalendarDaySlot {
  date: string;
  total_inventory: number;
  booked_units: number;
  restricted_units?: number;
  available_units: number;
  status: "available" | "partially_booked" | "fully_booked" | "blocked" | "maintenance_blocked";
  restrictions?: Array<{
    id: number;
    restriction_number: string;
    title: string;
    restriction_type: string;
    reason: string;
    blocked_units: number;
    maintenance_request_id?: number | null;
  }>;
}

export interface CalendarAccommodation {
  id: number;
  name: string;
  slug: string;
  category: string;
  total_inventory: number;
  nightly_rate_php: number;
  is_active: boolean;
  housekeeping_status?: string;
  active_restrictions?: Array<{
    id: number;
    restriction_number: string;
    title: string;
    restriction_type: string;
    start_date: string;
    end_date: string | null;
    is_indefinite: boolean;
    blocked_units: number;
  }>;
  schedule: CalendarDaySlot[];
}

export interface CalendarReservationBar {
  id: number;
  booking_reference: string;
  room_id: number;
  room_name: string;
  room_category: string;
  guest_id: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  status: string;
  payment_status: "paid" | "partially_paid" | "unpaid";
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  total_guests: number;
  total_price_php: number;
  gross_paid_php: number;
  refunded_php: number;
  net_paid_php: number;
  remaining_balance_php: number;
  special_requests?: string | null;
  created_at?: string;
}

export interface CalendarDailySummary {
  date: string;
  arrivals: number;
  departures: number;
  occupied_units: number;
  restricted_units?: number;
  total_capacity: number;
}

export interface CalendarScheduleResponse {
  range: {
    start_date: string;
    end_date: string;
    days_count: number;
  };
  accommodations: CalendarAccommodation[];
  reservations: CalendarReservationBar[];
  daily_summaries: Record<string, CalendarDailySummary>;
  metrics: {
    total_accommodations: number;
    total_capacity_units: number;
    total_reservations: number;
    arrivals_in_range: number;
    departures_in_range: number;
  };
}

export interface QuickCheckOverlappingReservation {
  id: number;
  booking_reference: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
}

export interface QuickCheckOverlappingRestriction {
  id: number;
  restriction_number: string;
  title: string;
  restriction_type: string;
  start_date: string;
  end_date: string | null;
  is_indefinite: boolean;
  blocked_units: number;
  reason: string;
}

export interface QuickCheckRoomResult {
  room_id: number;
  name: string;
  category: string;
  total_inventory: number;
  nightly_rate_php: number;
  peak_booked_units: number;
  peak_restricted_units?: number;
  available_units: number;
  is_available: boolean;
  conflict_detected: boolean;
  overlapping_reservations: QuickCheckOverlappingReservation[];
  overlapping_restrictions?: QuickCheckOverlappingRestriction[];
}

export interface QuickCheckResponse {
  check_in: string;
  check_out: string;
  nights: number;
  has_available_rooms: boolean;
  rooms: QuickCheckRoomResult[];
}

export async function getAdminCalendarSchedule(params: {
  start_date?: string;
  end_date?: string;
  room_id?: number | string;
  category?: string;
  status?: string;
} = {}): Promise<CalendarScheduleResponse> {
  const q = new URLSearchParams();
  if (params.start_date) q.set("start_date", params.start_date);
  if (params.end_date) q.set("end_date", params.end_date);
  if (params.room_id && params.room_id !== "all") q.set("room_id", String(params.room_id));
  if (params.category && params.category !== "all") q.set("category", params.category);
  if (params.status && params.status !== "all") q.set("status", params.status);

  return adminFetch<CalendarScheduleResponse>(`/admin/calendar/schedule?${q.toString()}`);
}

export async function checkAdminRoomAvailability(params: {
  check_in: string;
  check_out: string;
  room_id?: number | string;
}): Promise<QuickCheckResponse> {
  const q = new URLSearchParams({
    check_in: params.check_in,
    check_out: params.check_out,
  });
  if (params.room_id && params.room_id !== "all") {
    q.set("room_id", String(params.room_id));
  }

  return adminFetch<QuickCheckResponse>(`/admin/calendar/quick-check?${q.toString()}`);
}

/* ==================== HOUSEKEEPING & ROOM STATUS API ==================== */

export interface HousekeepingActiveTask {
  id: number;
  task_type: "cleaning" | "deep_clean" | "inspection" | "maintenance" | "turn_down";
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  notes?: string | null;
  scheduled_date?: string | null;
  assigned_to?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface HousekeepingRoom {
  id: number;
  name: string;
  slug: string;
  category: string;
  total_inventory: number;
  nightly_rate_php: number;
  is_active: boolean;
  housekeeping_status: "clean" | "dirty" | "in_progress" | "inspected" | "maintenance";
  is_ready_for_guest: boolean;
  is_under_maintenance: boolean;
  last_cleaned_at?: string | null;
  last_inspected_at?: string | null;
  housekeeping_notes?: string | null;
  active_task?: HousekeepingActiveTask | null;
}

export interface HousekeepingMetrics {
  total_accommodations: number;
  clean: number;
  dirty: number;
  in_progress: number;
  inspected: number;
  maintenance: number;
  active_tasks_count: number;
}

export interface HousekeepingOverviewResponse {
  metrics: HousekeepingMetrics;
  rooms: HousekeepingRoom[];
}

export interface HousekeepingHistory {
  id: number;
  housekeeping_task_id: number;
  actor_user_id: number | null;
  user_id?: number | null;
  action: string;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  evidence_url: string | null;
  created_at: string;
  actor?: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
  user?: {
    id: number;
    name: string;
    email?: string;
    role?: string;
  } | null;
}

export interface HousekeepingTask {
  id: number;
  room_id: number;
  assigned_to_user_id?: number | null;
  created_by_user_id: number;
  task_type: "cleaning" | "deep_clean" | "inspection" | "maintenance" | "turn_down";
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "in_progress" | "pending_review" | "completed" | "cancelled";
  notes?: string | null;
  scheduled_date?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  submitted_for_review_at?: string | null;
  evidence_url?: string | null;
  history?: HousekeepingHistory[];
  created_at: string;
  room?: {
    id: number;
    name: string;
    slug: string;
    category: string;
    housekeeping_status: string;
  };
  assigned_to?: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
  created_by?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface HousekeepingStaffMember {
  id: number;
  name: string;
  email: string;
  role: string;
}

export async function getAdminHousekeepingRooms(params: {
  housekeeping_status?: string;
  category?: string;
  search?: string;
} = {}): Promise<HousekeepingOverviewResponse> {
  const q = new URLSearchParams();
  if (params.housekeeping_status && params.housekeeping_status !== "all") {
    q.set("housekeeping_status", params.housekeeping_status);
  }
  if (params.category && params.category !== "all") {
    q.set("category", params.category);
  }
  if (params.search) q.set("search", params.search);

  return adminFetch<HousekeepingOverviewResponse>(`/admin/housekeeping/rooms?${q.toString()}`);
}

export async function updateAdminRoomHousekeepingStatus(
  roomId: number,
  status: string,
  notes?: string
): Promise<{ message: string; room: Partial<HousekeepingRoom> }> {
  return adminFetch<{ message: string; room: Partial<HousekeepingRoom> }>(
    `/admin/housekeeping/rooms/${roomId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    }
  );
}

export async function getAdminHousekeepingTasks(params: {
  room_id?: number | string;
  status?: string;
  task_type?: string;
  priority?: string;
  assigned_to_user_id?: number | string;
  search?: string;
  page?: number;
} = {}): Promise<PaginatedResult<HousekeepingTask>> {
  const q = new URLSearchParams();
  if (params.room_id && params.room_id !== "all") q.set("room_id", String(params.room_id));
  if (params.status && params.status !== "all") q.set("status", params.status);
  if (params.task_type && params.task_type !== "all") q.set("task_type", params.task_type);
  if (params.priority && params.priority !== "all") q.set("priority", params.priority);
  if (params.assigned_to_user_id && params.assigned_to_user_id !== "all") {
    q.set("assigned_to_user_id", String(params.assigned_to_user_id));
  }
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", String(params.page));

  return adminFetch<PaginatedResult<HousekeepingTask>>(`/admin/housekeeping/tasks?${q.toString()}`);
}

export async function createAdminHousekeepingTask(payload: {
  room_id: number;
  assigned_to_user_id?: number | null;
  task_type: string;
  priority: string;
  notes?: string;
  scheduled_date?: string;
}): Promise<{ message: string; task: HousekeepingTask }> {
  return adminFetch<{ message: string; task: HousekeepingTask }>(
    "/admin/housekeeping/tasks",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function updateAdminHousekeepingTaskStatus(
  taskId: number,
  status: string,
  notes?: string
): Promise<{ message: string; task: HousekeepingTask }> {
  return adminFetch<{ message: string; task: HousekeepingTask }>(
    `/admin/housekeeping/tasks/${taskId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    }
  );
}

export async function getAdminHousekeepingStaff(): Promise<{ staff: HousekeepingStaffMember[] }> {
  return adminFetch<{ staff: HousekeepingStaffMember[] }>("/admin/housekeeping/staff");
}

export async function startHousekeepingTask(taskId: number): Promise<{ message: string; task: HousekeepingTask }> {
  return adminFetch<{ message: string; task: HousekeepingTask }>(
    `/admin/housekeeping/tasks/${taskId}/start`,
    {
      method: "POST",
    }
  );
}

export async function logHousekeepingProgress(
  taskId: number,
  notesOrFormData: string | FormData,
  evidencePhoto?: File
): Promise<{ message: string; task: HousekeepingTask }> {
  let body: FormData;
  if (notesOrFormData instanceof FormData) {
    body = notesOrFormData;
  } else {
    body = new FormData();
    if (notesOrFormData) body.append("notes", notesOrFormData);
    if (evidencePhoto) body.append("evidence_photo", evidencePhoto);
  }
  return adminFetch<{ message: string; task: HousekeepingTask }>(
    `/admin/housekeeping/tasks/${taskId}/progress`,
    {
      method: "POST",
      body,
    }
  );
}

export async function submitHousekeepingReview(
  taskId: number,
  notesOrFormData: string | FormData,
  evidencePhoto?: File
): Promise<{ message: string; task: HousekeepingTask }> {
  let body: FormData;
  if (notesOrFormData instanceof FormData) {
    body = notesOrFormData;
  } else {
    body = new FormData();
    if (notesOrFormData) body.append("notes", notesOrFormData);
    if (evidencePhoto) body.append("evidence_photo", evidencePhoto);
  }
  return adminFetch<{ message: string; task: HousekeepingTask }>(
    `/admin/housekeeping/tasks/${taskId}/submit-review`,
    {
      method: "POST",
      body,
    }
  );
}

export async function reviewHousekeepingTask(
  taskId: number,
  decision: "approve" | "reject",
  notes?: string,
  room_condition?: string
): Promise<{ message: string; task: HousekeepingTask }> {
  return adminFetch<{ message: string; task: HousekeepingTask }>(
    `/admin/housekeeping/tasks/${taskId}/review`,
    {
      method: "POST",
      body: JSON.stringify({ decision, notes, room_condition }),
    }
  );
}

export async function getHousekeepingHistory(
  taskId: number
): Promise<{ data: HousekeepingHistory[]; history?: HousekeepingHistory[] }> {
  return adminFetch<{ data: HousekeepingHistory[]; history?: HousekeepingHistory[] }>(
    `/admin/housekeeping/tasks/${taskId}/history`
  );
}

/* ==================== FRONT DESK: CHECK-IN & CHECK-OUT API ==================== */

export interface CheckInOutReservationItem {
  id: number;
  booking_reference: string;
  room_id: number;
  room_name: string;
  room_category: string;
  room_housekeeping_status: string;
  is_room_ready: boolean;
  guest_id: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  adults: number;
  children: number;
  total_guests: number;
  nights: number;
  check_in: string;
  check_out: string;
  status: "pending" | "confirmed" | "checked_in" | "completed" | "cancelled";
  total_price_php: number;
  net_paid_php: number;
  remaining_balance_php: number;
  payment_status: "paid" | "partially_paid" | "unpaid";
  has_outstanding_balance: boolean;
  is_overdue: boolean;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  checked_in_by?: { id: number; name: string } | null;
  checked_out_by?: { id: number; name: string } | null;
  check_in_notes?: string | null;
  check_out_notes?: string | null;
  special_requests?: string | null;
  created_at?: string | null;
}

export interface CheckInOutMetrics {
  date: string;
  total_arrivals: number;
  arrived_count: number;
  pending_arrivals: number;
  unpaid_arrivals: number;
  total_departures: number;
  departed_count: number;
  pending_departures: number;
  overdue_departures: number;
  in_house_count: number;
}

export interface CheckInOutOverviewResponse {
  date: string;
  metrics: CheckInOutMetrics;
  arrivals: CheckInOutReservationItem[];
  departures: CheckInOutReservationItem[];
  in_house: CheckInOutReservationItem[];
}

export async function getAdminCheckInOutOverview(params: {
  date?: string;
} = {}): Promise<CheckInOutOverviewResponse> {
  const q = new URLSearchParams();
  if (params.date) q.set("date", params.date);

  return adminFetch<CheckInOutOverviewResponse>(`/admin/check-in-out/overview?${q.toString()}`);
}

export async function processAdminCheckIn(
  reservationId: number,
  payload: { notes?: string; acknowledge_balance?: boolean } = {}
): Promise<{
  message: string;
  reservation: Partial<CheckInOutReservationItem>;
  requires_acknowledgment?: boolean;
  remaining_balance_php?: number;
}> {
  return adminFetch<{
    message: string;
    reservation: Partial<CheckInOutReservationItem>;
    requires_acknowledgment?: boolean;
    remaining_balance_php?: number;
  }>(`/admin/check-in-out/${reservationId}/check-in`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function processAdminCheckOut(
  reservationId: number,
  payload: { notes?: string; acknowledge_balance?: boolean } = {}
): Promise<{
  message: string;
  reservation: Partial<CheckInOutReservationItem>;
  requires_acknowledgment?: boolean;
  remaining_balance_php?: number;
}> {
  return adminFetch<{
    message: string;
    reservation: Partial<CheckInOutReservationItem>;
    requires_acknowledgment?: boolean;
    remaining_balance_php?: number;
  }>(`/admin/check-in-out/${reservationId}/check-out`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ==================== RESORT ANALYTICS & BUSINESS INTELLIGENCE API ==================== */

export interface AnalyticsRange {
  start_date: string;
  end_date: string;
  preset: "7d" | "30d" | "this_month" | "last_month" | "ytd" | "custom";
  days_count: number;
}

export interface AnalyticsKPIs {
  occupancy_rate_percent: number;
  total_room_nights_occupied: number;
  total_room_nights_available: number;
  adr_php: number;
  alos_nights: number;
  total_bookings: number;
  confirmed_stays: number;
  cancellations: number;
  cancellation_rate_percent: number;
  no_shows: number;
  no_show_rate_percent: number;
  pending_bookings: number;
}

export interface AnalyticsFinancials {
  gross_collections_php: number;
  completed_refunds_php: number;
  net_collections_php: number;
  outstanding_balances_php: number;
  currency: string;
}

export interface OccupancyDailyPoint {
  date: string;
  day_of_week: string;
  occupied_units: number;
  total_capacity: number;
  occupancy_percent: number;
}

export interface OccupancyRollupPoint {
  label: string;
  occupied_nights: number;
  available_nights: number;
  occupancy_percent: number;
}

export interface RoomTypePerformance {
  room_id: number;
  name: string;
  slug: string;
  category: string;
  total_inventory: number;
  nightly_rate_php: number;
  is_active: boolean;
  bookings_count: number;
  nights_sold: number;
  revenue_php: number;
  occupancy_percent: number;
}

export interface AdminAnalyticsResponse {
  range: AnalyticsRange;
  kpis: AnalyticsKPIs;
  financials: AnalyticsFinancials;
  occupancy_trends: {
    daily: OccupancyDailyPoint[];
    weekly: OccupancyRollupPoint[];
    monthly: OccupancyRollupPoint[];
  };
  room_type_performance: RoomTypePerformance[];
}

export async function getAdminAnalytics(params: {
  preset?: string;
  start_date?: string;
  end_date?: string;
} = {}): Promise<AdminAnalyticsResponse> {
  const q = new URLSearchParams();
  if (params.preset) q.set("preset", params.preset);
  if (params.start_date) q.set("start_date", params.start_date);
  if (params.end_date) q.set("end_date", params.end_date);

  return adminFetch<AdminAnalyticsResponse>(`/admin/analytics?${q.toString()}`);
}

export async function downloadAdminAnalyticsCsv(params: {
  preset?: string;
  start_date?: string;
  end_date?: string;
}): Promise<void> {
  const q = new URLSearchParams();
  if (params.preset) q.set("preset", params.preset);
  if (params.start_date) q.set("start_date", params.start_date);
  if (params.end_date) q.set("end_date", params.end_date);

  const res = await fetch(`${API_BASE_URL}/admin/analytics/export?${q.toString()}`, {
    method: "GET",
    headers: {
      Accept: "text/csv, application/json",
      ...getAuthHeader(),
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new ApiError(errorBody.message || "Failed to export analytics CSV", res.status);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const contentDisposition = res.headers.get("content-disposition");
  let filename = `golden-resort-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/* ==================== AUTOMATED BOOKING NOTIFICATIONS API ==================== */

export interface BookingNotificationItem {
  id: number;
  reservation_id?: number | null;
  booking_reference?: string | null;
  guest_name?: string | null;
  room_name?: string | null;
  maintenance_request_id?: number | null;
  tracking_number?: string | null;
  resource_name?: string | null;
  recipient_email: string;
  recipient_type: "guest" | "staff";
  notification_type:
    | "booking_confirmation"
    | "internal_new_booking"
    | "payment_confirmation"
    | "payment_reminder"
    | "checkin_reminder"
    | "booking_cancellation"
    | "refund_update"
    | "maintenance_task_assigned"
    | "maintenance_task_reassigned"
    | "maintenance_progress_alert"
    | "maintenance_review_submitted"
    | "maintenance_review_approved"
    | "maintenance_review_rejected";
  channel: string;
  subject: string;
  status: "queued" | "sent" | "failed";
  is_read?: boolean;
  read_at?: string | null;
  error_message?: string | null;
  sent_at?: string | null;
  created_at: string;
}

export interface NotificationMetrics {
  total: number;
  unread: number;
  sent: number;
  queued: number;
  failed: number;
}

export interface AdminNotificationsResponse {
  data: BookingNotificationItem[];
  metrics: NotificationMetrics;
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export async function getAdminNotifications(params: {
  search?: string;
  status?: string;
  read_status?: string;
  notification_type?: string;
  recipient_type?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
} = {}): Promise<AdminNotificationsResponse> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.status && params.status !== "all") q.set("status", params.status);
  if (params.read_status && params.read_status !== "all") q.set("read_status", params.read_status);
  if (params.notification_type && params.notification_type !== "all") {
    q.set("notification_type", params.notification_type);
  }
  if (params.recipient_type && params.recipient_type !== "all") {
    q.set("recipient_type", params.recipient_type);
  }
  if (params.from_date) q.set("from_date", params.from_date);
  if (params.to_date) q.set("to_date", params.to_date);
  if (params.page) q.set("page", String(params.page));

  return adminFetch<AdminNotificationsResponse>(`/admin/notifications?${q.toString()}`);
}

export async function getAdminUnreadNotificationCount(): Promise<{ unread_count: number }> {
  return adminFetch<{ unread_count: number }>("/admin/notifications/unread-count");
}

export async function markNotificationAsRead(
  notificationId: number
): Promise<{
  message: string;
  unread_count: number;
  data: Partial<BookingNotificationItem>;
}> {
  return adminFetch<{
    message: string;
    unread_count: number;
    data: Partial<BookingNotificationItem>;
  }>(`/admin/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export async function markNotificationAsUnread(
  notificationId: number
): Promise<{
  message: string;
  unread_count: number;
  data: Partial<BookingNotificationItem>;
}> {
  return adminFetch<{
    message: string;
    unread_count: number;
    data: Partial<BookingNotificationItem>;
  }>(`/admin/notifications/${notificationId}/unread`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsAsRead(): Promise<{
  message: string;
  affected: number;
  unread_count: number;
}> {
  return adminFetch<{
    message: string;
    affected: number;
    unread_count: number;
  }>("/admin/notifications/mark-all-read", {
    method: "POST",
  });
}

export async function getReservationNotifications(
  reservationId: number
): Promise<{
  reservation_id: number;
  booking_reference: string;
  data: BookingNotificationItem[];
}> {
  return adminFetch<{
    reservation_id: number;
    booking_reference: string;
    data: BookingNotificationItem[];
  }>(`/admin/reservations/${reservationId}/notifications`);
}

export async function sendReservationNotification(
  reservationId: number,
  type: "booking_confirmation" | "payment_reminder" | "checkin_reminder"
): Promise<{
  message: string;
  data: Partial<BookingNotificationItem>;
}> {
  return adminFetch<{
    message: string;
    data: Partial<BookingNotificationItem>;
  }>(`/admin/reservations/${reservationId}/notifications/send`, {
    method: "POST",
    body: JSON.stringify({ type }),
  });
}

export async function retryAdminNotification(
  notificationId: number
): Promise<{
  message: string;
  data: Partial<BookingNotificationItem>;
}> {
  return adminFetch<{
    message: string;
    data: Partial<BookingNotificationItem>;
  }>(`/admin/notifications/${notificationId}/retry`, {
    method: "POST",
  });
}

/* ==================== STAFF MANAGEMENT API ==================== */

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: "admin" | "manager" | "front_desk" | "housekeeper" | "maintenance" | "staff" | string;
  is_active: boolean;
  phone?: string | null;
  department?: string | null;
  notes?: string | null;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffMetrics {
  total: number;
  active: number;
  deactivated: number;
  roles: Record<string, number>;
}

export interface StaffListResponse {
  data: StaffMember[];
  metrics: StaffMetrics;
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  role: string;
  password: string;
  phone?: string;
  department?: string;
  notes?: string;
}

export interface UpdateStaffPayload {
  name?: string;
  email?: string;
  role?: string;
  phone?: string;
  department?: string;
  notes?: string;
}

export async function getAdminStaff(params: {
  search?: string;
  role?: string;
  status?: string;
  department?: string;
  page?: number;
  per_page?: number;
} = {}): Promise<StaffListResponse> {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.role && params.role !== "all") q.set("role", params.role);
  if (params.status && params.status !== "all") q.set("status", params.status);
  if (params.department && params.department !== "all") q.set("department", params.department);
  if (params.page) q.set("page", String(params.page));
  if (params.per_page) q.set("per_page", String(params.per_page));

  return adminFetch<StaffListResponse>(`/admin/staff?${q.toString()}`);
}

export async function createAdminStaff(data: CreateStaffPayload): Promise<{
  message: string;
  staff: StaffMember;
}> {
  return adminFetch<{
    message: string;
    staff: StaffMember;
  }>("/admin/staff", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getAdminStaffMember(id: number): Promise<{
  staff: StaffMember;
  permissions: string[];
}> {
  return adminFetch<{
    staff: StaffMember;
    permissions: string[];
  }>(`/admin/staff/${id}`);
}

export async function updateAdminStaff(
  id: number,
  data: UpdateStaffPayload
): Promise<{
  message: string;
  staff: StaffMember;
}> {
  return adminFetch<{
    message: string;
    staff: StaffMember;
  }>(`/admin/staff/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function toggleAdminStaffActive(id: number): Promise<{
  message: string;
  staff: StaffMember;
}> {
  return adminFetch<{
    message: string;
    staff: StaffMember;
  }>(`/admin/staff/${id}/toggle-active`, {
    method: "PATCH",
  });
}

export async function resetAdminStaffPassword(
  id: number,
  password: string,
  password_confirmation: string
): Promise<{
  message: string;
}> {
  return adminFetch<{
    message: string;
  }>(`/admin/staff/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password, password_confirmation }),
  });
}

/* ==================== STAFF PORTAL & PROFILE API ==================== */

export interface StaffProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  phone?: string | null;
  department?: string | null;
  notes?: string | null;
  last_login_at?: string | null;
  created_at?: string | null;
  permissions: string[];
}

export interface UpdateStaffProfilePayload {
  name: string;
  phone?: string | null;
}

export interface ChangeStaffPasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface StaffDashboardTask {
  id: number;
  source?: "housekeeping" | "maintenance";
  tracking_number?: string;
  title?: string;
  resource_name?: string;
  resource_type?: string;
  task_type: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: string;
  notes?: string | null;
  scheduled_date?: string | null;
  started_at?: string | null;
  is_overdue?: boolean;
  room?: {
    id: number;
    name: string;
    slug: string;
    category: string;
    housekeeping_status: string;
  } | null;
}

export interface StaffDashboardPermittedModule {
  key: string;
  name: string;
  description: string;
  href: string;
}

export interface StaffDashboardResponse {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    department?: string | null;
    phone?: string | null;
    last_login_at?: string | null;
    permissions: string[];
  };
  metrics: {
    my_open_tasks: number;
    my_completed_today: number;
    clean_rooms?: number;
    dirty_rooms?: number;
    in_progress_rooms?: number;
    inspected_rooms?: number;
    maintenance_rooms?: number;
    my_open_maintenance?: number;
    total_open_maintenance?: number;
    in_progress_maintenance?: number;
    pending_review_maintenance?: number;
    total_resort_open_tasks?: number;
    today_arrivals?: number;
    today_departures?: number;
    in_house_guests?: number;
    total_accommodations?: number;
    active_accommodations?: number;
  };
  assigned_tasks: StaffDashboardTask[];
  permitted_modules: StaffDashboardPermittedModule[];
}

export async function getStaffProfile(): Promise<{ user: StaffProfile }> {
  return adminFetch<{ user: StaffProfile }>("/staff/profile");
}

export async function updateStaffProfile(
  data: UpdateStaffProfilePayload
): Promise<{
  message: string;
  user: StaffProfile;
}> {
  return adminFetch<{
    message: string;
    user: StaffProfile;
  }>("/staff/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function changeStaffPassword(
  data: ChangeStaffPasswordPayload
): Promise<{
  message: string;
}> {
  return adminFetch<{
    message: string;
  }>("/staff/profile/password", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getStaffDashboard(): Promise<StaffDashboardResponse> {
  return adminFetch<StaffDashboardResponse>("/staff/dashboard");
}

/* =========================================================================
   Maintenance Requests Management API
   ========================================================================= */

export type MaintenancePriority = "low" | "normal" | "high" | "urgent";
export type MaintenanceStatus =
  | "reported"
  | "assessed"
  | "assigned"
  | "acknowledged"
  | "in_progress"
  | "on_hold"
  | "pending_review"
  | "resolved"
  | "cancelled";
export type MaintenanceResourceType =
  | "room"
  | "villa"
  | "facility"
  | "equipment"
  | "other";

export interface MaintenanceAttachment {
  id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  url: string;
  created_at?: string;
}

export interface MaintenanceHistory {
  id: number;
  action: string;
  actor_role?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  notes?: string | null;
  changes_payload?: Record<string, { from?: any; to?: any; from_name?: string; to_name?: string }> | null;
  user?: {
    id: number;
    name: string;
    role: string;
  } | null;
  from_assigned_to?: {
    id: number;
    name: string;
  } | null;
  to_assigned_to?: {
    id: number;
    name: string;
  } | null;
  created_at: string;
}

export interface MaintenanceStaffAssignee {
  id: number;
  name: string;
  email: string;
  role: string;
  department?: string | null;
}

export interface MaintenanceRequest {
  id: number;
  tracking_number: string;
  title: string;
  description: string;
  resource_type: MaintenanceResourceType;
  room_id: number | null;
  room?: {
    id: number;
    name: string;
    category: string;
    housekeeping_status: string;
  } | null;
  resource_name: string;
  location: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  cost_php: number;
  repair_notes: string | null;
  due_date?: string | null;
  is_overdue?: boolean;
  reported_by?: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
  assigned_to?: {
    id: number;
    name: string;
    email: string;
    role: string;
    department?: string | null;
  } | null;
  capabilities?: {
    can_assign?: boolean;
    can_acknowledge?: boolean;
    can_start?: boolean;
    can_update_progress?: boolean;
    can_submit_review?: boolean;
    can_review?: boolean;
    can_resolve?: boolean;
  };
  attachments: MaintenanceAttachment[];
  history?: MaintenanceHistory[];
  reported_at?: string | null;
  assigned_at?: string | null;
  acknowledged_at?: string | null;
  started_at?: string | null;
  submitted_for_review_at?: string | null;
  resolved_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MaintenanceStats {
  total_active: number;
  urgent_high: number;
  in_progress: number;
  pending_review: number;
  resolved: number;
  overdue: number;
  assigned_to_me: number;
  total_cost_php: number;
}

export interface MaintenanceFilters {
  page?: number;
  per_page?: number;
  status?: string;
  priority?: string;
  resource_type?: string;
  assigned_to?: string;
  overdue_only?: boolean;
  search?: string;
}

export async function getMaintenanceRequests(
  filters: MaintenanceFilters = {}
): Promise<PaginatedResult<MaintenanceRequest>> {
  const params = new URLSearchParams();
  if (filters.page) params.append("page", String(filters.page));
  if (filters.per_page) params.append("per_page", String(filters.per_page));
  if (filters.status && filters.status !== "all") params.append("status", filters.status);
  if (filters.priority && filters.priority !== "all") params.append("priority", filters.priority);
  if (filters.resource_type && filters.resource_type !== "all") params.append("resource_type", filters.resource_type);
  if (filters.assigned_to && filters.assigned_to !== "all") params.append("assigned_to", filters.assigned_to);
  if (filters.overdue_only) params.append("overdue_only", "1");
  if (filters.search) params.append("search", filters.search);

  const qs = params.toString() ? `?${params.toString()}` : "";
  return adminFetch<PaginatedResult<MaintenanceRequest>>(`/admin/maintenance${qs}`);
}

export async function getMaintenanceStats(): Promise<MaintenanceStats> {
  return adminFetch<MaintenanceStats>("/admin/maintenance/stats");
}

export async function getMaintenanceAssignees(): Promise<{ data: MaintenanceStaffAssignee[] }> {
  return adminFetch<{ data: MaintenanceStaffAssignee[] }>("/admin/maintenance/assignees");
}

export async function getMaintenanceRequest(
  id: number
): Promise<{ data: MaintenanceRequest }> {
  return adminFetch<{ data: MaintenanceRequest }>(`/admin/maintenance/${id}`);
}

export async function createMaintenanceRequest(
  data: FormData | Record<string, any>
): Promise<{ data: MaintenanceRequest }> {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  return adminFetch<{ data: MaintenanceRequest }>("/admin/maintenance", {
    method: "POST",
    body: isFormData ? data : JSON.stringify(data),
  });
}

export async function updateMaintenanceRequest(
  id: number,
  data: FormData | Record<string, any>
): Promise<{ data: MaintenanceRequest }> {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  return adminFetch<{ data: MaintenanceRequest }>(`/admin/maintenance/${id}`, {
    method: isFormData ? "POST" : "PUT",
    body: isFormData ? data : JSON.stringify(data),
  });
}

export async function updateMaintenanceStatus(
  id: number,
  payload: {
    status: string;
    repair_notes?: string;
    cost_php?: number;
  }
): Promise<{ data: MaintenanceRequest }> {
  return adminFetch<{ data: MaintenanceRequest }>(`/admin/maintenance/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function assignMaintenanceRequest(
  id: number,
  payload: {
    assigned_to_user_id: number;
    due_date?: string | null;
    notes?: string;
  }
): Promise<{ data: MaintenanceRequest }> {
  return adminFetch<{ data: MaintenanceRequest }>(`/admin/maintenance/${id}/assign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function acknowledgeMaintenanceRequest(
  id: number,
  notes?: string
): Promise<{ data: MaintenanceRequest }> {
  return adminFetch<{ data: MaintenanceRequest }>(`/admin/maintenance/${id}/acknowledge`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

export async function startMaintenanceRequest(
  id: number,
  notes?: string
): Promise<{ data: MaintenanceRequest }> {
  return adminFetch<{ data: MaintenanceRequest }>(`/admin/maintenance/${id}/start`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

export async function recordMaintenanceProgress(
  id: number,
  data: FormData | Record<string, any>
): Promise<{ data: MaintenanceRequest }> {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  return adminFetch<{ data: MaintenanceRequest }>(`/admin/maintenance/${id}/progress`, {
    method: "POST",
    body: isFormData ? data : JSON.stringify(data),
  });
}

export const progressMaintenanceRequest = recordMaintenanceProgress;

export async function submitMaintenanceReview(
  id: number,
  data: FormData | Record<string, any>
): Promise<{ data: MaintenanceRequest }> {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  return adminFetch<{ data: MaintenanceRequest }>(`/admin/maintenance/${id}/submit-review`, {
    method: "POST",
    body: isFormData ? data : JSON.stringify(data),
  });
}

export async function reviewMaintenanceRequest(
  id: number,
  payload: {
    action: "approve" | "reject";
    notes?: string;
  }
): Promise<{ data: MaintenanceRequest }> {
  return adminFetch<{ data: MaintenanceRequest }>(`/admin/maintenance/${id}/review`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMaintenanceHistory(
  id: number
): Promise<{ data: MaintenanceHistory[] }> {
  return adminFetch<{ data: MaintenanceHistory[] }>(`/admin/maintenance/${id}/history`);
}

export async function deleteMaintenanceRequest(
  id: number
): Promise<{ message: string }> {
  return adminFetch<{ message: string }>(`/admin/maintenance/${id}`, {
    method: "DELETE",
  });
}

export async function deleteMaintenanceAttachment(
  requestId: number,
  attachmentId: number
): Promise<{ message: string }> {
  return adminFetch<{ message: string }>(
    `/admin/maintenance/${requestId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
    }
  );
}

/* ==================== ACCOMMODATION RESTRICTIONS API ==================== */

export interface AffectedReservationSnapshot {
  id: number;
  booking_reference: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  check_in: string;
  check_out: string;
  status: string;
  total_guests?: number;
}

export interface AccommodationRestriction {
  id: number;
  restriction_number: string;
  room_id: number;
  maintenance_request_id?: number | null;
  restriction_type:
    | "maintenance_block"
    | "emergency_repair"
    | "scheduled_renovation"
    | "safety_hazard"
    | "operational_hold";
  title: string;
  reason: string;
  blocked_units: number;
  start_date: string;
  end_date: string | null;
  is_indefinite: boolean;
  status: "active" | "cleared" | "cancelled";
  affected_reservations_snapshot?: AffectedReservationSnapshot[] | null;
  handling_protocol?: string | null;
  created_by_user_id: number;
  cleared_by_user_id?: number | null;
  cleared_at?: string | null;
  clearance_notes?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
  room?: {
    id: number;
    name: string;
    slug?: string;
    category: string;
    total_inventory: number;
  };
  maintenance_request?: {
    id: number;
    title: string;
    priority: string;
    status: string;
  };
  created_by?: {
    id: number;
    name: string;
    role: string;
  };
  cleared_by?: {
    id: number;
    name: string;
    role: string;
  };
}

export interface CheckConflictsParams {
  room_id: number;
  start_date: string;
  end_date?: string | null;
  is_indefinite?: boolean;
  blocked_units?: number;
}

export interface CheckConflictsResponse {
  conflicts_detected: boolean;
  overlapping_count: number;
  overlapping_reservations: AffectedReservationSnapshot[];
  room: {
    id: number;
    name: string;
    total_inventory: number;
  };
  message: string;
}

export interface CreateRestrictionPayload {
  room_id: number;
  maintenance_request_id?: number | null;
  restriction_type:
    | "maintenance_block"
    | "emergency_repair"
    | "scheduled_renovation"
    | "safety_hazard"
    | "operational_hold";
  title: string;
  reason: string;
  blocked_units?: number;
  start_date: string;
  end_date?: string | null;
  is_indefinite?: boolean;
  handling_protocol?: string;
}

export interface ClearRestrictionPayload {
  clearance_notes: string;
  room_condition?: "inspected" | "clean" | "dirty";
}

export async function getAdminRestrictions(params: {
  room_id?: number | string;
  status?: string;
  restriction_type?: string;
  search?: string;
  page?: number;
  per_page?: number;
} = {}): Promise<PaginatedResult<AccommodationRestriction>> {
  const q = new URLSearchParams();
  if (params.room_id && params.room_id !== "all") q.set("room_id", String(params.room_id));
  if (params.status && params.status !== "all") q.set("status", params.status);
  if (params.restriction_type && params.restriction_type !== "all") q.set("restriction_type", params.restriction_type);
  if (params.search) q.set("search", params.search);
  if (params.page) q.set("page", String(params.page));
  if (params.per_page) q.set("per_page", String(params.per_page));

  return adminFetch<PaginatedResult<AccommodationRestriction>>(`/admin/restrictions?${q.toString()}`);
}

export async function checkRestrictionConflicts(
  params: CheckConflictsParams
): Promise<CheckConflictsResponse> {
  const q = new URLSearchParams({
    room_id: String(params.room_id),
    start_date: params.start_date,
  });
  if (params.end_date) q.set("end_date", params.end_date);
  if (params.is_indefinite) q.set("is_indefinite", "1");
  if (params.blocked_units) q.set("blocked_units", String(params.blocked_units));

  return adminFetch<CheckConflictsResponse>(`/admin/restrictions/check-conflicts?${q.toString()}`);
}

export async function createAdminRestriction(
  payload: CreateRestrictionPayload
): Promise<{ message: string; data: AccommodationRestriction }> {
  return adminFetch<{ message: string; data: AccommodationRestriction }>("/admin/restrictions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getAdminRestriction(
  id: number
): Promise<{ data: AccommodationRestriction }> {
  return adminFetch<{ data: AccommodationRestriction }>(`/admin/restrictions/${id}`);
}

export async function clearAdminRestriction(
  id: number,
  payload: ClearRestrictionPayload
): Promise<{ message: string; data: AccommodationRestriction }> {
  return adminFetch<{ message: string; data: AccommodationRestriction }>(
    `/admin/restrictions/${id}/clear`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function cancelAdminRestriction(
  id: number,
  payload: { cancellation_reason: string }
): Promise<{ message: string; data: AccommodationRestriction }> {
  return adminFetch<{ message: string; data: AccommodationRestriction }>(
    `/admin/restrictions/${id}/cancel`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}





