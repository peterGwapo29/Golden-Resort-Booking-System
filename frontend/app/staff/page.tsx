"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getStaffDashboard,
  acknowledgeMaintenanceRequest,
  startMaintenanceRequest,
  progressMaintenanceRequest,
  submitMaintenanceReview,
  startHousekeepingTask,
  logHousekeepingProgress,
  submitHousekeepingReview,
  type StaffDashboardResponse,
  type StaffDashboardTask,
} from "@/lib/admin-api";
import { formatDisplayDate } from "@/lib/booking-utils";
import {
  DashboardIcon,
  SparklesIcon,
  WrenchIcon,
  KeyIcon,
  DoorIcon,
  CalendarIcon,
  ClipboardListIcon,
  UserIcon,
  RefreshIcon,
  CheckIcon,
  ArrowRightIcon,
  InfoIcon,
  ClockIcon,
  CloseIcon,
  PlusIcon,
} from "@/components/ui/Icons";
import CreateReservationModal from "@/components/admin/CreateReservationModal";

export default function StaffDashboardPage() {
  const [data, setData] = useState<StaffDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Workflow Action Loading States
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Walk-In Reservation Modal State
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);

  // Progress & Review Submission Modal State
  const [modalTask, setModalTask] = useState<{
    id: number;
    source: "housekeeping" | "maintenance";
    type: "progress" | "review";
    title: string;
  } | null>(null);
  const [modalNotes, setModalNotes] = useState("");
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getStaffDashboard();
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load staff workstation dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    setActionLoadingId(id);
    try {
      await acknowledgeMaintenanceRequest(id);
      await loadDashboard();
    } catch (err: any) {
      alert(err.message || "Failed to acknowledge assignment.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStart = async (id: number) => {
    setActionLoadingId(id);
    try {
      await startMaintenanceRequest(id);
      await loadDashboard();
    } catch (err: any) {
      alert(err.message || "Failed to start work.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStartHk = async (id: number) => {
    setActionLoadingId(id);
    try {
      await startHousekeepingTask(id);
      await loadDashboard();
    } catch (err: any) {
      alert(err.message || "Failed to start housekeeping task.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTask) return;
    if (!modalNotes.trim() && modalTask.type === "progress") {
      setModalError("Please provide progress notes.");
      return;
    }

    setModalSubmitting(true);
    setModalError(null);
    try {
      const formData = new FormData();
      formData.append("notes", modalNotes);
      if (modalFile) {
        formData.append("evidence", modalFile);
      }

      if (modalTask.source === "housekeeping") {
        if (modalTask.type === "progress") {
          await logHousekeepingProgress(modalTask.id, formData);
        } else {
          await submitHousekeepingReview(modalTask.id, formData);
        }
      } else {
        if (modalTask.type === "progress") {
          await progressMaintenanceRequest(modalTask.id, formData);
        } else {
          await submitMaintenanceReview(modalTask.id, formData);
        }
      }

      setModalTask(null);
      setModalNotes("");
      setModalFile(null);
      await loadDashboard();
    } catch (err: any) {
      setModalError(err.message || "Action failed.");
    } finally {
      setModalSubmitting(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "pending_review":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getModuleIcon = (key: string) => {
    switch (key) {
      case "housekeeping":
        return <SparklesIcon className="h-5 w-5 text-emerald-600" />;
      case "maintenance":
        return <WrenchIcon className="h-5 w-5 text-amber-600" />;
      case "checkin":
        return <KeyIcon className="h-5 w-5 text-amber-600" />;
      case "calendar":
        return <CalendarIcon className="h-5 w-5 text-blue-600" />;
      case "rooms":
        return <DoorIcon className="h-5 w-5 text-indigo-600" />;
      case "reservations":
        return <ClipboardListIcon className="h-5 w-5 text-forest" />;
      default:
        return <DashboardIcon className="h-5 w-5 text-forest" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-2xl bg-white border border-slate-200 p-6 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center max-w-xl mx-auto my-12">
        <InfoIcon className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-red-900">Workstation Error</h2>
        <p className="mt-1 text-sm text-red-700">{error || "Unable to retrieve dashboard information."}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-forest-dark transition"
        >
          <RefreshIcon className="h-4 w-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  const { user, metrics, assigned_tasks, permitted_modules } = data;
  const isHousekeeper = user.role === "housekeeper";
  const isMaintenance = user.role === "maintenance";
  const isFrontDesk = user.role === "front_desk";
  const isManager = user.role === "manager" || user.role === "admin";

  return (
    <div className="space-y-8">
      {/* ======================================================================
          1. WELCOME & SHIFT BANNER (Role-Tailored)
         ====================================================================== */}
      <div className="rounded-2xl border border-forest/15 bg-gradient-to-r from-forest to-forest-dark p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold uppercase tracking-wider">
              {user.role}
            </span>
            {user.department && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
                {user.department}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-white/70">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Shift
            </span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight">
            Welcome back, {user.name}
          </h1>

          <p className="text-xs text-white/75 max-w-xl leading-relaxed">
            {isHousekeeper && "Here is your assigned housekeeping queue, room turnovers, and inspection status."}
            {isMaintenance && "Here is your assigned maintenance work order queue, equipment repairs, and facility upkeep."}
            {isFrontDesk && "Here is your guest services overview, scheduled arrivals, departures, and room availability."}
            {isManager && "Here is your resort operational overview, pending supervisor reviews, and department activities."}
            {!isHousekeeper && !isMaintenance && !isFrontDesk && !isManager && "Here is your daily operational summary and permitted workstation tools."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
          <div className="text-left md:text-right">
            <span className="block text-[11px] font-semibold text-gold/80 uppercase tracking-widest">
              Last Login
            </span>
            <span className="text-xs text-white/90 font-mono">
              {user.last_login_at
                ? new Date(user.last_login_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Active now"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(isFrontDesk || isManager) && (
              <button
                type="button"
                onClick={() => setIsWalkInModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-bold text-forest-dark hover:bg-gold-light transition shadow-sm cursor-pointer"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                <span>New Walk-In</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-medium text-white hover:bg-white/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              title="Refresh workstation data"
            >
              <RefreshIcon className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>

            <Link
              href="/staff/profile"
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-semibold text-forest-dark hover:bg-gold-light transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>My Profile</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ======================================================================
          2. ROLE-TAILORED OPERATIONAL KPI CARDS
         ====================================================================== */}
      <section aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          Workstation Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1 & 2 for Housekeeper & Maintenance: My Tasks & Finished */}
          {!isFrontDesk && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {isHousekeeper ? "My Cleaning Tasks" : isMaintenance ? "My Work Orders" : "My Open Tasks"}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    {isHousekeeper ? <SparklesIcon className="h-4 w-4" /> : isMaintenance ? <WrenchIcon className="h-4 w-4" /> : <ClipboardListIcon className="h-4 w-4" />}
                  </span>
                </div>
                <p className="mt-3 text-2xl sm:text-3xl font-bold text-forest">
                  {metrics.my_open_tasks}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Assigned directly to you
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Completed Today
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl sm:text-3xl font-bold text-forest">
                  {metrics.my_completed_today}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Finished during today&apos;s shift
                </p>
              </div>
            </>
          )}

          {/* Housekeeper Specific Cards (3 & 4): Dirty Rooms & Inspected Ready */}
          {isHousekeeper && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Dirty / Needs Clean
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                    <SparklesIcon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl sm:text-3xl font-bold text-forest">
                  {metrics.dirty_rooms || 0}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {metrics.in_progress_rooms || 0} currently being cleaned
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Inspected &amp; Ready
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <DoorIcon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl sm:text-3xl font-bold text-forest">
                  {metrics.inspected_rooms || 0}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {metrics.clean_rooms || 0} cleaned, ready for arrival
                </p>
              </div>
            </>
          )}

          {/* Maintenance Specific Cards (3 & 4): In Maintenance & Total Tasks */}
          {isMaintenance && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    In Maintenance
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <DoorIcon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl sm:text-3xl font-bold text-forest">
                  {metrics.maintenance_rooms || 0}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Accommodations blocked for repair
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Total Work Orders
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <WrenchIcon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl sm:text-3xl font-bold text-forest">
                  {metrics.total_resort_open_tasks || metrics.my_open_maintenance || 0}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Active jobs across facilities
                </p>
              </div>
            </>
          )}

          {/* Front Desk Specific Cards (All 4 cards) */}
          {isFrontDesk && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Arrivals Today
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <KeyIcon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl sm:text-3xl font-bold text-forest">
                  {metrics.today_arrivals || 0}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Scheduled guest check-ins
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Departures Today
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <DoorIcon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl sm:text-3xl font-bold text-forest">
                  {metrics.today_departures || 0}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Checkouts for turnover
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    In-House Guests
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl sm:text-3xl font-bold text-forest">
                  {metrics.in_house_guests || 0}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Currently checked-in guests
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Accommodations
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <DoorIcon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl sm:text-3xl font-bold text-forest">
                  {metrics.active_accommodations || metrics.total_accommodations || 0}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Active resort accommodations
                </p>
              </div>
            </>
          )}

          {/* Manager / Admin Specific Cards (3 & 4) */}
          {isManager && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Dirty / Needs Clean
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                    <SparklesIcon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl sm:text-3xl font-bold text-forest">
                  {metrics.dirty_rooms || 0}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {metrics.clean_rooms || 0} clean &amp; ready
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    In Maintenance
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <DoorIcon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl sm:text-3xl font-bold text-forest">
                  {metrics.maintenance_rooms || 0}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {metrics.total_resort_open_tasks || 0} total resort tasks
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ======================================================================
          3. MY ASSIGNED TASKS & WORK ORDERS (Role-Isolated)
         ====================================================================== */}
      {!isFrontDesk && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="border-b border-slate-200 p-5 sm:px-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-forest">
                {isHousekeeper ? "My Assigned Cleaning Tasks" : isMaintenance ? "My Assigned Work Orders" : "My Assigned Tasks"}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Tasks assigned directly to your staff account for current operations
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-stone-700">
              {assigned_tasks.length} {assigned_tasks.length === 1 ? "Task" : "Tasks"}
            </span>
          </div>

          {assigned_tasks.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckIcon className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-forest">
                No Pending Tasks Assigned
              </h3>
              <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
                You are all caught up! When supervisors assign tasks to your account, they will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {assigned_tasks.map((task: StaffDashboardTask) => {
                const isTaskMnt = task.source === "maintenance";
                const taskTitle = isTaskMnt
                  ? task.title || task.resource_name || "Maintenance Work Order"
                  : `${task.room?.name || "Room"} (${task.task_type.replace("_", " ")})`;
                const targetUrl = isTaskMnt ? "/staff/maintenance" : "/staff/housekeeping";

                return (
                  <div
                    key={`${task.source || "task"}-${task.id}`}
                    className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isTaskMnt ? "bg-amber-100 text-amber-900 border border-amber-200" : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                        }`}>
                          {isTaskMnt ? <WrenchIcon className="h-3 w-3" /> : <SparklesIcon className="h-3 w-3" />}
                          {isTaskMnt ? "Maintenance" : "Housekeeping"}
                        </span>

                        <span className="text-xs font-bold text-forest font-mono">
                          {isTaskMnt && task.tracking_number ? task.tracking_number : `#${task.id}`}
                        </span>

                        <span className="font-semibold text-sm text-forest">
                          {taskTitle}
                        </span>

                        {task.room && (
                          <span className="text-xs text-muted">
                            ({task.room.name})
                          </span>
                        )}

                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getPriorityBadge(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>

                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                            task.status
                          )}`}
                        >
                          {task.status.replace("_", " ")}
                        </span>

                        {task.is_overdue && (
                          <span className="rounded-md border border-rose-300 bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-800 animate-pulse">
                            Overdue
                          </span>
                        )}
                      </div>

                      {task.notes && (
                        <p className="text-xs text-stone-600 italic">
                          &ldquo;{task.notes}&rdquo;
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] text-muted">
                        {isTaskMnt && task.resource_name && (
                          <span className="font-medium text-stone-700">
                            Resource: {task.resource_name} ({task.resource_type || "asset"})
                          </span>
                        )}
                        {task.scheduled_date && (
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            {isTaskMnt ? "Target Due: " : "Scheduled: "}
                            {task.scheduled_date}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Maintenance Workstation Actions */}
                      {isTaskMnt && task.status === "assigned" && (
                        <button
                          type="button"
                          disabled={actionLoadingId === task.id}
                          onClick={() => handleAcknowledge(task.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-600 transition disabled:opacity-50"
                        >
                          {actionLoadingId === task.id ? <RefreshIcon className="h-3.5 w-3.5 animate-spin" /> : <CheckIcon className="h-3.5 w-3.5" />}
                          <span>Accept Job</span>
                        </button>
                      )}

                      {isTaskMnt && task.status === "acknowledged" && (
                        <button
                          type="button"
                          disabled={actionLoadingId === task.id}
                          onClick={() => handleStart(task.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-xs font-semibold text-white hover:bg-forest-dark transition disabled:opacity-50"
                        >
                          {actionLoadingId === task.id ? <RefreshIcon className="h-3.5 w-3.5 animate-spin" /> : <ClockIcon className="h-3.5 w-3.5" />}
                          <span>Start Work</span>
                        </button>
                      )}

                      {isTaskMnt && task.status === "in_progress" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setModalTask({ id: task.id, source: "maintenance", type: "progress", title: taskTitle })}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-forest/30 bg-forest/5 px-3 py-2 text-xs font-medium text-forest hover:bg-forest/10 transition"
                          >
                            <span>Log Progress</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalTask({ id: task.id, source: "maintenance", type: "review", title: taskTitle })}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                          >
                            <CheckIcon className="h-3.5 w-3.5" />
                            <span>Submit Review</span>
                          </button>
                        </>
                      )}

                      {/* Housekeeping Workstation Actions */}
                      {!isTaskMnt && task.status === "pending" && (
                        <button
                          type="button"
                          disabled={actionLoadingId === task.id}
                          onClick={() => handleStartHk(task.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-3.5 py-2 text-xs font-semibold text-white hover:bg-forest-dark transition disabled:opacity-50"
                        >
                          {actionLoadingId === task.id ? <RefreshIcon className="h-3.5 w-3.5 animate-spin" /> : <ClockIcon className="h-3.5 w-3.5" />}
                          <span>Start Cleaning</span>
                        </button>
                      )}

                      {!isTaskMnt && task.status === "in_progress" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setModalTask({ id: task.id, source: "housekeeping", type: "progress", title: taskTitle })}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-forest/30 bg-forest/5 px-3 py-2 text-xs font-medium text-forest hover:bg-forest/10 transition"
                          >
                            <span>Log Progress</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalTask({ id: task.id, source: "housekeeping", type: "review", title: taskTitle })}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                          >
                            <CheckIcon className="h-3.5 w-3.5" />
                            <span>Submit for Inspection</span>
                          </button>
                        </>
                      )}

                      {task.status === "pending_review" && (
                        <span className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800">
                          Awaiting Supervisor Review
                        </span>
                      )}

                      <Link
                        href={targetUrl}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-forest/20 bg-white px-3.5 py-2 text-xs font-medium text-forest hover:bg-forest/5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                      >
                        <span>{isTaskMnt ? "Work Order Details" : "View Task Board"}</span>
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ======================================================================
          4. PERMITTED OPERATIONAL TOOLS (Role-Specific)
         ====================================================================== */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-forest">
            Permitted Operational Modules
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Modules and tools unlocked for your verified role ({user.role})
          </p>
        </div>

        {permitted_modules.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <InfoIcon className="h-6 w-6 text-muted mx-auto mb-2" />
            <p className="text-xs text-muted">
              No additional operational modules are assigned to your role. Contact an administrator if you require access to front desk or housekeeping boards.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {permitted_modules.map((mod) => (
              <Link
                key={mod.key}
                href={mod.href}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-gold hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest/5 group-hover:bg-gold/20 transition">
                    {getModuleIcon(mod.key)}
                  </div>
                  <ArrowRightIcon className="h-4 w-4 text-muted group-hover:text-gold group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="mt-4 font-semibold text-sm text-forest group-hover:text-gold transition">
                  {mod.name}
                </h3>
                <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
                  {mod.description}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ======================================================================
          5. ACCOUNT SECURITY SNAPSHOT
         ====================================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0">
            <UserIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-forest">
              Staff Profile &amp; Security Controls
            </h3>
            <p className="text-xs text-muted">
              Signed in as <strong className="text-forest">{user.email}</strong>. Keep your contact details up to date and manage your password securely.
            </p>
          </div>
        </div>

        <Link
          href="/staff/profile"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold text-white hover:bg-forest-dark transition shrink-0"
        >
          <span>Manage Account &amp; Password</span>
          <ArrowRightIcon className="h-3.5 w-3.5 text-gold" />
        </Link>
      </div>

      {/* ======================================================================
          MODAL: PROGRESS & REVIEW SUBMISSION
         ====================================================================== */}
      {modalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-forest text-white">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
                  {modalTask.source === "housekeeping" ? "Housekeeping Workstation" : "Maintenance Workstation"}
                </span>
                <h3 className="font-semibold text-base text-white">
                  {modalTask.type === "progress" ? "Log Progress Notes" : "Submit Work for Review"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalTask(null)}
                className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {modalError}
                </div>
              )}

              <div>
                <span className="block text-xs font-semibold text-forest mb-1">
                  Task Reference
                </span>
                <p className="text-xs text-muted font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {modalTask.title} (#{modalTask.id})
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-forest mb-1">
                  {modalTask.type === "progress" ? "Progress Notes / Action Taken *" : "Completion Notes / Summary of Work *"}
                </label>
                <textarea
                  rows={3}
                  required={modalTask.type === "progress"}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder={
                    modalTask.type === "progress"
                      ? "Describe current status, parts replaced, or turnover progress..."
                      : "Describe completed cleaning/repair and confirm readiness for supervisor inspection..."
                  }
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-forest focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-forest mb-1">
                  Supporting Photo / Document Evidence (Optional)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setModalFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-forest/10 file:text-forest hover:file:bg-forest/20"
                />
                <p className="mt-1 text-[11px] text-muted">
                  Max file size: 10MB (JPEG, PNG, WebP, PDF)
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalTask(null)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-stone-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-forest-dark transition disabled:opacity-50"
                >
                  {modalSubmitting ? <RefreshIcon className="h-3.5 w-3.5 animate-spin" /> : <CheckIcon className="h-3.5 w-3.5" />}
                  <span>{modalTask.type === "progress" ? "Save Progress Log" : "Submit for Inspection"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Walk-In & Phone Reservation Creation Modal */}
      <CreateReservationModal
        isOpen={isWalkInModalOpen}
        onClose={() => setIsWalkInModalOpen(false)}
        onSuccess={() => loadDashboard()}
      />
    </div>
  );
}
