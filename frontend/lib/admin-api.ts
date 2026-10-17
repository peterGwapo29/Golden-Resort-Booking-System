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

/* ==================== CALENDAR & AVAILABILITY API ==================== */

export interface CalendarDaySlot {
  date: string;
  total_inventory: number;
  booked_units: number;
  available_units: number;
  status: "available" | "partially_booked" | "fully_booked" | "blocked";
}

export interface CalendarAccommodation {
  id: number;
  name: string;
  slug: string;
  category: string;
  total_inventory: number;
  nightly_rate_php: number;
  is_active: boolean;
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

export interface QuickCheckRoomResult {
  room_id: number;
  name: string;
  category: string;
  total_inventory: number;
  nightly_rate_php: number;
  peak_booked_units: number;
  available_units: number;
  is_available: boolean;
  conflict_detected: boolean;
  overlapping_reservations: QuickCheckOverlappingReservation[];
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

export interface HousekeepingTask {
  id: number;
  room_id: number;
  assigned_to_user_id?: number | null;
  created_by_user_id: number;
  task_type: "cleaning" | "deep_clean" | "inspection" | "maintenance" | "turn_down";
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  notes?: string | null;
  scheduled_date?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
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
