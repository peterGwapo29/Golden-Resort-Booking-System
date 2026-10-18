"use client";

import React, { useEffect, useState } from "react";
import {
  getAdminHousekeepingRooms,
  updateAdminRoomHousekeepingStatus,
  getAdminHousekeepingTasks,
  createAdminHousekeepingTask,
  updateAdminHousekeepingTaskStatus,
  getAdminHousekeepingStaff,
  startHousekeepingTask,
  logHousekeepingProgress,
  submitHousekeepingReview,
  reviewHousekeepingTask,
  getHousekeepingHistory,
  type HousekeepingRoom,
  type HousekeepingTask,
  type HousekeepingMetrics,
  type HousekeepingStaffMember,
  type HousekeepingHistory,
  type PaginatedResult,
} from "@/lib/admin-api";
import { useAdminAuth } from "@/lib/admin-auth";
import { formatPhp } from "@/lib/booking-utils";
import {
  SparklesIcon,
  WrenchIcon,
  BroomIcon,
  SearchIcon,
  FilterIcon,
  CloseIcon,
  PlusIcon,
  DoorIcon,
  CheckIcon,
  UsersIcon,
  CalendarIcon,
  InfoIcon,
} from "@/components/ui/Icons";

export default function AdminHousekeepingPage() {
  const { user } = useAdminAuth();
  const isSupervisor = user?.role === "admin" || user?.role === "manager";
  const [activeTab, setActiveTab] = useState<"rooms" | "tasks">("rooms");

  // Workflow Modals State
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [progressTask, setProgressTask] = useState<HousekeepingTask | null>(null);
  const [progressNotes, setProgressNotes] = useState("");
  const [progressFile, setProgressFile] = useState<File | null>(null);
  const [progressSubmitting, setProgressSubmitting] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  const [submitReviewModalOpen, setSubmitReviewModalOpen] = useState(false);
  const [submitReviewTask, setSubmitReviewTask] = useState<HousekeepingTask | null>(null);
  const [submitReviewNotes, setSubmitReviewNotes] = useState("");
  const [submitReviewFile, setSubmitReviewFile] = useState<File | null>(null);
  const [submitReviewSubmitting, setSubmitReviewSubmitting] = useState(false);
  const [submitReviewError, setSubmitReviewError] = useState<string | null>(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTask, setReviewTask] = useState<HousekeepingTask | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewRoomCondition, setReviewRoomCondition] = useState("inspected");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyTask, setHistoryTask] = useState<HousekeepingTask | null>(null);
  const [historyLogs, setHistoryLogs] = useState<HousekeepingHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Rooms Board State
  const [rooms, setRooms] = useState<HousekeepingRoom[]>([]);
  const [metrics, setMetrics] = useState<HousekeepingMetrics | null>(null);
  const [roomsLoading, setRoomsLoading] = useState<boolean>(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  // Filters for Rooms Board
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [roomSearch, setRoomSearch] = useState<string>("");

  // Tasks Management State
  const [tasksData, setTasksData] = useState<PaginatedResult<HousekeepingTask> | null>(null);
  const [tasksLoading, setTasksLoading] = useState<boolean>(true);
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all");
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>("all");
  const [taskRoomFilter, setTaskRoomFilter] = useState<string>("all");
  const [tasksPage, setTasksPage] = useState<number>(1);

  // Staff members for assignments
  const [staffList, setStaffList] = useState<HousekeepingStaffMember[]>([]);

  // Task Creation Modal
  const [taskModalOpen, setTaskModalOpen] = useState<boolean>(false);
  const [taskRoomId, setTaskRoomId] = useState<number | string>("");
  const [taskType, setTaskType] = useState<string>("cleaning");
  const [taskPriority, setTaskPriority] = useState<string>("normal");
  const [taskAssignedTo, setTaskAssignedTo] = useState<string>("");
  const [taskScheduledDate, setTaskScheduledDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [taskNotes, setTaskNotes] = useState<string>("");
  const [taskSubmitting, setTaskSubmitting] = useState<boolean>(false);
  const [taskFormError, setTaskFormError] = useState<string | null>(null);

  // Room Status Change Modal
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [selectedRoom, setSelectedRoom] = useState<HousekeepingRoom | null>(null);
  const [newRoomStatus, setNewRoomStatus] = useState<string>("clean");
  const [statusNotes, setStatusNotes] = useState<string>("");
  const [statusSubmitting, setStatusSubmitting] = useState<boolean>(false);
  const [statusFormError, setStatusFormError] = useState<string | null>(null);

  // Feedback notifications
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Fetch Rooms & Metrics
  const fetchRooms = async () => {
    setRoomsLoading(true);
    setRoomsError(null);
    try {
      const res = await getAdminHousekeepingRooms({
        housekeeping_status: statusFilter,
        category: categoryFilter,
        search: roomSearch,
      });
      setRooms(res.rooms);
      setMetrics(res.metrics);
    } catch (err: any) {
      console.error(err);
      setRoomsError(err.message || "Failed to load housekeeping overview.");
    } finally {
      setRoomsLoading(false);
    }
  };

  // Fetch Tasks
  const fetchTasks = async () => {
    setTasksLoading(true);
    try {
      const res = await getAdminHousekeepingTasks({
        room_id: taskRoomFilter,
        status: taskStatusFilter,
        task_type: taskTypeFilter,
        priority: taskPriorityFilter,
        page: tasksPage,
      });
      setTasksData(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setTasksLoading(false);
    }
  };

  // Fetch Available Staff
  const fetchStaff = async () => {
    try {
      const res = await getAdminHousekeepingStaff();
      setStaffList(res.staff);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchStaff();
  }, [statusFilter, categoryFilter, roomSearch]);

  useEffect(() => {
    fetchTasks();
  }, [taskRoomFilter, taskStatusFilter, taskTypeFilter, taskPriorityFilter, tasksPage]);

  // Handle Task Creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskRoomId) {
      setTaskFormError("Please select an accommodation.");
      return;
    }

    setTaskSubmitting(true);
    setTaskFormError(null);
    try {
      await createAdminHousekeepingTask({
        room_id: Number(taskRoomId),
        assigned_to_user_id: taskAssignedTo ? Number(taskAssignedTo) : null,
        task_type: taskType,
        priority: taskPriority,
        notes: taskNotes,
        scheduled_date: taskScheduledDate,
      });

      setSuccessBanner("Housekeeping task successfully assigned.");
      setTaskModalOpen(false);
      // Reset form
      setTaskRoomId("");
      setTaskType("cleaning");
      setTaskPriority("normal");
      setTaskAssignedTo("");
      setTaskNotes("");

      // Refresh data
      fetchRooms();
      fetchTasks();
    } catch (err: any) {
      setTaskFormError(err.message || "Failed to assign housekeeping task.");
    } finally {
      setTaskSubmitting(false);
    }
  };

  // Handle Room Status Update
  const handleUpdateRoomStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    setStatusSubmitting(true);
    setStatusFormError(null);
    try {
      await updateAdminRoomHousekeepingStatus(selectedRoom.id, newRoomStatus, statusNotes);
      setSuccessBanner(`Accommodation condition updated to '${newRoomStatus}'.`);
      setStatusModalOpen(false);
      setSelectedRoom(null);
      setStatusNotes("");
      fetchRooms();
    } catch (err: any) {
      setStatusFormError(err.message || "Failed to update room condition.");
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Handle Task Quick Status Update
  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    try {
      await updateAdminHousekeepingTaskStatus(taskId, newStatus);
      setSuccessBanner(`Task updated to '${newStatus}'.`);
      fetchTasks();
      fetchRooms();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update task.");
    }
  };

  // Workflow Handlers
  const handleStartTask = async (taskId: number) => {
    try {
      await startHousekeepingTask(taskId);
      setSuccessBanner("Cleaning started. Task is now in progress.");
      fetchTasks();
      fetchRooms();
    } catch (err: any) {
      alert(err.message || "Failed to start cleaning task.");
    }
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressTask) return;
    setProgressSubmitting(true);
    setProgressError(null);
    try {
      await logHousekeepingProgress(progressTask.id, progressNotes, progressFile || undefined);
      setSuccessBanner("Housekeeping progress logged successfully.");
      setProgressModalOpen(false);
      setProgressTask(null);
      setProgressNotes("");
      setProgressFile(null);
      fetchTasks();
    } catch (err: any) {
      setProgressError(err.message || "Failed to log progress.");
    } finally {
      setProgressSubmitting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitReviewTask) return;
    setSubmitReviewSubmitting(true);
    setSubmitReviewError(null);
    try {
      await submitHousekeepingReview(submitReviewTask.id, submitReviewNotes, submitReviewFile || undefined);
      setSuccessBanner("Task submitted for supervisor inspection.");
      setSubmitReviewModalOpen(false);
      setSubmitReviewTask(null);
      setSubmitReviewNotes("");
      setSubmitReviewFile(null);
      fetchTasks();
      fetchRooms();
    } catch (err: any) {
      setSubmitReviewError(err.message || "Failed to submit review.");
    } finally {
      setSubmitReviewSubmitting(false);
    }
  };

  const handleReviewDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTask) return;
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      await reviewHousekeepingTask(
        reviewTask.id,
        reviewAction,
        reviewNotes,
        reviewAction === "approve" ? reviewRoomCondition : undefined
      );
      setSuccessBanner(
        reviewAction === "approve"
          ? "Cleaning task approved and marked completed."
          : "Work returned to staff with revision feedback."
      );
      setReviewModalOpen(false);
      setReviewTask(null);
      setReviewNotes("");
      fetchTasks();
      fetchRooms();
    } catch (err: any) {
      setReviewError(err.message || "Failed to submit supervisor review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleOpenHistory = async (task: HousekeepingTask) => {
    setHistoryTask(task);
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await getHousekeepingHistory(task.id);
      setHistoryLogs(res.data || res.history || []);
    } catch (err: any) {
      console.error(err);
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Condition Badge Helpers
  const getConditionBadge = (status: string) => {
    switch (status) {
      case "inspected":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-300">
            <SparklesIcon className="h-3.5 w-3.5 text-emerald-600" />
            Inspected (Guest Ready)
          </span>
        );
      case "clean":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
            Clean
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800 border border-sky-300">
            <BroomIcon className="h-3.5 w-3.5 text-sky-600" />
            Cleaning In Progress
          </span>
        );
      case "dirty":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-300">
            Dirty / Needs Turnover
          </span>
        );
      case "maintenance":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 border border-rose-300">
            <WrenchIcon className="h-3.5 w-3.5 text-rose-600" />
            Under Maintenance (Blocked)
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {status}
          </span>
        );
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-100 text-rose-800 font-bold border-rose-300";
      case "high":
        return "bg-amber-100 text-amber-800 font-semibold border-amber-300";
      case "normal":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "low":
        return "bg-slate-50 text-slate-600 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-forest/10 text-forest">
              <SparklesIcon className="h-5 w-5 text-forest" />
            </span>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-forest sm:text-3xl">
              Housekeeping & Room Status
            </h1>
          </div>
          <p className="mt-1 text-sm text-stone-600">
            Monitor real-time room readiness, schedule cleaning tasks, assign staff, and enforce maintenance blocks.
          </p>
        </div>

        {/* Action Button (Supervisor Only) */}
        {isSupervisor && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setTaskModalOpen(true);
                setTaskFormError(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gold shadow-sm hover:bg-forest-dark transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Assign Cleaning Task
            </button>
          </div>
        )}
      </div>

      {/* Success Banner */}
      {successBanner && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          <span>{successBanner}</span>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Operational Condition Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-emerald-700">
            Inspected (Ready)
          </span>
          <p className="mt-1 font-serif text-2xl font-bold text-emerald-700">
            {metrics?.inspected ?? "..."}
          </p>
          <span className="text-[0.7rem] text-stone-600">Certified for check-in</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-emerald-700">
            Cleaned
          </span>
          <p className="mt-1 font-serif text-2xl font-bold text-emerald-700">
            {metrics?.clean ?? "..."}
          </p>
          <span className="text-[0.7rem] text-stone-600">Clean, pending inspection</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-sky-700">
            In Progress
          </span>
          <p className="mt-1 font-serif text-2xl font-bold text-sky-700">
            {metrics?.in_progress ?? "..."}
          </p>
          <span className="text-[0.7rem] text-stone-600">Staff cleaning underway</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-amber-700">
            Dirty (Needs Turnover)
          </span>
          <p className="mt-1 font-serif text-2xl font-bold text-amber-700">
            {metrics?.dirty ?? "..."}
          </p>
          <span className="text-[0.7rem] text-stone-600">Requires servicing</span>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
          <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-rose-700">
            Maintenance Block
          </span>
          <p className="mt-1 font-serif text-2xl font-bold text-rose-700">
            {metrics?.maintenance ?? "..."}
          </p>
          <span className="text-[0.7rem] text-rose-600">Blocked from booking</span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("rooms")}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === "rooms"
                ? "border-forest text-forest"
                : "border-transparent text-stone-600 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            <DoorIcon className="h-4 w-4" />
            Room Status Board ({rooms.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors ${
              activeTab === "tasks"
                ? "border-forest text-forest"
                : "border-transparent text-stone-600 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            <BroomIcon className="h-4 w-4" />
            Housekeeping Tasks ({tasksData?.meta?.total ?? metrics?.active_tasks_count ?? 0})
          </button>
        </nav>
      </div>

      {/* TAB 1: ROOM STATUS BOARD */}
      {activeTab === "rooms" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <FilterIcon className="h-4 w-4 text-stone-600" />
                <span className="font-semibold text-stone-600 uppercase tracking-wider">Condition:</span>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-forest focus:outline-none"
              >
                <option value="all">All Conditions</option>
                <option value="inspected">Inspected (Ready)</option>
                <option value="clean">Clean</option>
                <option value="in_progress">Cleaning In Progress</option>
                <option value="dirty">Dirty</option>
                <option value="maintenance">Under Maintenance</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-forest focus:outline-none"
              >
                <option value="all">All Categories</option>
                <option value="room">Rooms</option>
                <option value="suite">Suites</option>
                <option value="villa">Villas</option>
              </select>
            </div>

            {/* Room Search */}
            <div className="relative w-full sm:w-64">
              <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-stone-600" />
              <input
                type="text"
                placeholder="Search accommodation..."
                value={roomSearch}
                onChange={(e) => setRoomSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs focus:border-forest focus:outline-none"
              />
            </div>
          </div>

          {/* Rooms Grid */}
          {roomsLoading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-forest border-t-gold" />
              <p className="mt-3 text-xs font-medium text-stone-600">Loading accommodation statuses...</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <DoorIcon className="h-10 w-10 text-stone-600" />
              <h3 className="mt-2 font-serif text-lg font-bold text-forest">No Accommodations Found</h3>
              <p className="text-xs text-stone-600">Try adjusting your filters or search keywords.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className={`rounded-2xl border p-5 shadow-sm transition-all bg-white flex flex-col justify-between ${
                    room.housekeeping_status === "maintenance"
                      ? "border-rose-300 bg-rose-50/20"
                      : room.housekeeping_status === "inspected"
                      ? "border-emerald-300 ring-1 ring-emerald-200"
                      : "border-slate-200"
                  }`}
                >
                  <div>
                    {/* Card Top: Name, Category, and Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-serif text-base font-bold text-forest">{room.name}</h3>
                        <div className="mt-0.5 flex items-center gap-2 text-[0.7rem] text-stone-600">
                          <span className="capitalize">{room.category}</span>
                          <span>&bull;</span>
                          <span>{room.total_inventory} {room.total_inventory > 1 ? "units" : "unit"}</span>
                          <span>&bull;</span>
                          <span className="font-mono">{formatPhp(room.nightly_rate_php)}/night</span>
                        </div>
                      </div>
                    </div>

                    {/* Condition Status Badge */}
                    <div className="mt-3">{getConditionBadge(room.housekeeping_status)}</div>

                    {/* Operational Timestamps */}
                    <div className="mt-4 space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[0.7rem] text-slate-600">
                      <div className="flex justify-between">
                        <span>Last Cleaned:</span>
                        <span className="font-medium text-slate-800">
                          {room.last_cleaned_at ? new Date(room.last_cleaned_at).toLocaleString() : "None on record"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Inspected:</span>
                        <span className="font-medium text-slate-800">
                          {room.last_inspected_at ? new Date(room.last_inspected_at).toLocaleString() : "Not yet inspected"}
                        </span>
                      </div>
                      {room.housekeeping_notes && (
                        <div className="border-t border-slate-200 pt-1.5">
                          <span className="font-semibold text-stone-600">Notes:</span>
                          <p className="mt-0.5 italic text-slate-700">{room.housekeeping_notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Active Assigned Task (if any) */}
                    {room.active_task && (
                      <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3 text-[0.7rem]">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sky-900 uppercase tracking-wider">
                            Active Task: {room.active_task.task_type.replace("_", " ")}
                          </span>
                          <span className={`rounded px-1.5 py-0.5 text-[0.65rem] uppercase font-bold border ${getPriorityBadgeClass(room.active_task.priority)}`}>
                            {room.active_task.priority}
                          </span>
                        </div>
                        {room.active_task.assigned_to && (
                          <p className="mt-1 text-sky-800">
                            Assigned to: <strong className="font-semibold">{room.active_task.assigned_to.name}</strong>
                          </p>
                        )}
                        {room.active_task.notes && (
                          <p className="mt-0.5 text-sky-700 italic truncate">&ldquo;{room.active_task.notes}&rdquo;</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Controls */}
                  {isSupervisor ? (
                    <div className="mt-5 border-t border-slate-100 pt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoom(room);
                          setNewRoomStatus(room.housekeeping_status);
                          setStatusNotes(room.housekeeping_notes || "");
                          setStatusModalOpen(true);
                          setStatusFormError(null);
                        }}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Update Condition
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTaskRoomId(room.id);
                          setTaskType("cleaning");
                          setTaskPriority("normal");
                          setTaskModalOpen(true);
                        }}
                        className="rounded-lg bg-forest/10 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-forest/20 transition-colors"
                      >
                        + Task
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between text-[0.7rem] text-slate-500">
                      <span>Condition managed by supervisors</span>
                      {room.active_task && (
                        <span className="font-semibold text-forest">Active task</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TASKS MANAGEMENT */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <FilterIcon className="h-4 w-4 text-stone-600" />
                <span className="font-semibold text-stone-600 uppercase tracking-wider">Filters:</span>
              </div>

              {/* Status */}
              <select
                value={taskStatusFilter}
                onChange={(e) => {
                  setTaskStatusFilter(e.target.value);
                  setTasksPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-forest focus:outline-none"
              >
                <option value="all">All Task Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="pending_review">Pending Review</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Task Type */}
              <select
                value={taskTypeFilter}
                onChange={(e) => {
                  setTaskTypeFilter(e.target.value);
                  setTasksPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-forest focus:outline-none"
              >
                <option value="all">All Task Types</option>
                <option value="cleaning">Daily Cleaning</option>
                <option value="deep_clean">Deep Clean</option>
                <option value="inspection">Inspection</option>
                <option value="maintenance">Maintenance</option>
                <option value="turn_down">Turndown Service</option>
              </select>

              {/* Priority */}
              <select
                value={taskPriorityFilter}
                onChange={(e) => {
                  setTaskPriorityFilter(e.target.value);
                  setTasksPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-forest focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>

              {/* Room */}
              <select
                value={taskRoomFilter}
                onChange={(e) => {
                  setTaskRoomFilter(e.target.value);
                  setTasksPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-forest focus:outline-none"
              >
                <option value="all">All Accommodations</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-stone-600 font-semibold uppercase tracking-wider">
                    <th className="px-4 py-3">Accommodation</th>
                    <th className="px-4 py-3">Task Type</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Assigned Staff</th>
                    <th className="px-4 py-3">Scheduled Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasksLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-stone-600">
                        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-forest border-t-gold mb-2" />
                        Loading housekeeping tasks...
                      </td>
                    </tr>
                  ) : !tasksData?.data || tasksData.data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-stone-600">
                        No housekeeping tasks found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    tasksData.data.map((task) => (
                      <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-semibold text-forest">
                          {task.room?.name || `Room #${task.room_id}`}
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize font-medium text-slate-800">
                            {task.task_type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded px-2 py-0.5 text-[0.65rem] font-bold border uppercase ${getPriorityBadgeClass(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {task.assigned_to ? (
                            <span className="font-medium">{task.assigned_to.name}</span>
                          ) : (
                            <span className="text-stone-600 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700">
                          {task.scheduled_date || "N/A"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase ${
                              task.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : task.status === "pending_review"
                                ? "bg-purple-100 text-purple-800 font-bold border border-purple-200"
                                : task.status === "in_progress"
                                ? "bg-sky-100 text-sky-800"
                                : task.status === "cancelled"
                                ? "bg-slate-100 text-slate-500 line-through"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {task.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs">
                          <p className="truncate">{task.notes || <span className="text-stone-600 italic">No notes</span>}</p>
                          {task.evidence_url && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[0.65rem] font-semibold text-forest">
                              📸 Photo Evidence
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                          {/* Pending -> Start Cleaning */}
                          {task.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleStartTask(task.id)}
                              className="rounded bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors"
                            >
                              Start
                            </button>
                          )}

                          {/* In Progress -> Log Progress & Submit for Inspection */}
                          {task.status === "in_progress" && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setProgressTask(task);
                                  setProgressNotes("");
                                  setProgressFile(null);
                                  setProgressError(null);
                                  setProgressModalOpen(true);
                                }}
                                className="rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                              >
                                Progress
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSubmitReviewTask(task);
                                  setSubmitReviewNotes("");
                                  setSubmitReviewFile(null);
                                  setSubmitReviewError(null);
                                  setSubmitReviewModalOpen(true);
                                }}
                                className="rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                              >
                                Submit Review
                              </button>
                            </>
                          )}

                          {/* Pending Review -> Supervisor Review Modal (supervisors only) */}
                          {task.status === "pending_review" && (
                            isSupervisor ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewTask(task);
                                  setReviewAction("approve");
                                  setReviewNotes("");
                                  setReviewRoomCondition("inspected");
                                  setReviewError(null);
                                  setReviewModalOpen(true);
                                }}
                                className="rounded bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-800 hover:bg-purple-200 transition-colors"
                              >
                                Inspect & Review
                              </button>
                            ) : (
                              <span className="text-[0.65rem] text-purple-700 font-semibold italic">Awaiting Inspection</span>
                            )
                          )}

                          {/* History timeline modal */}
                          <button
                            type="button"
                            onClick={() => handleOpenHistory(task)}
                            className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                          >
                            History
                          </button>

                          {/* Supervisor Cancel */}
                          {isSupervisor && task.status !== "completed" && task.status !== "cancelled" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateTaskStatus(task.id, "cancelled")}
                              className="rounded bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {tasksData && tasksData.meta && tasksData.meta.last_page > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs">
                <span className="text-stone-600">
                  Showing page {tasksData.meta.current_page} of {tasksData.meta.last_page} ({tasksData.meta.total} tasks)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={tasksPage <= 1}
                    onClick={() => setTasksPage((p) => Math.max(1, p - 1))}
                    className="rounded border border-slate-300 bg-white px-2.5 py-1 font-medium disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={tasksPage >= tasksData.meta.last_page}
                    onClick={() => setTasksPage((p) => p + 1)}
                    className="rounded border border-slate-300 bg-white px-2.5 py-1 font-medium disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ASSIGN HOUSEKEEPING TASK
          ======================================================== */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setTaskModalOpen(false)}
          />

          <div className="relative z-50 w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="border-b border-slate-200 bg-forest p-6 text-white flex items-center justify-between">
              <div>
                <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-gold">
                  Operations & Maintenance
                </span>
                <h3 className="font-serif text-xl font-bold">Assign Housekeeping Task</h3>
              </div>
              <button
                type="button"
                onClick={() => setTaskModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 text-xs">
              {taskFormError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
                  {taskFormError}
                </div>
              )}

              {/* Room select */}
              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Accommodation *
                </label>
                <select
                  value={taskRoomId}
                  onChange={(e) => setTaskRoomId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                >
                  <option value="">-- Choose Accommodation --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.category}) — Currently {r.housekeeping_status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Type and Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Task Type *
                  </label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                  >
                    <option value="cleaning">Daily Cleaning</option>
                    <option value="deep_clean">Deep Clean</option>
                    <option value="inspection">Supervisor Inspection</option>
                    <option value="maintenance">Maintenance / Repair</option>
                    <option value="turn_down">Turndown Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Priority *
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Maintenance Notice */}
              {taskType === "maintenance" && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <WrenchIcon className="h-4 w-4 text-rose-600" />
                    Maintenance Room Block Notice
                  </div>
                  <p className="text-[0.7rem] leading-relaxed">
                    Assigning a maintenance task will automatically put this accommodation into <strong>Under Maintenance</strong> condition, blocking it from public bookings and calendar availability until resolved.
                  </p>
                </div>
              )}

              {/* Assign to Staff & Scheduled Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Assign Staff (Optional)
                  </label>
                  <select
                    value={taskAssignedTo}
                    onChange={(e) => setTaskAssignedTo(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                  >
                    <option value="">-- Unassigned --</option>
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={taskScheduledDate}
                    onChange={(e) => setTaskScheduledDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                  >
                  </input>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Instructions & Checklist Notes
                </label>
                <textarea
                  rows={3}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="e.g. Sanitize bathroom fixtures, restock espresso pods, change linen sets..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                />
              </div>

              <div className="border-t border-slate-200 pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={taskSubmitting}
                  className="flex-1 rounded-xl bg-forest py-2.5 text-center font-semibold uppercase tracking-wider text-gold hover:bg-forest-dark transition-colors disabled:opacity-50"
                >
                  {taskSubmitting ? "Assigning Task..." : "Confirm & Assign Task"}
                </button>
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: UPDATE ROOM CONDITION STATUS
          ======================================================== */}
      {statusModalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setStatusModalOpen(false)}
          />

          <div className="relative z-50 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="border-b border-slate-200 bg-forest p-6 text-white flex items-center justify-between">
              <div>
                <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-gold">
                  Accommodation Condition
                </span>
                <h3 className="font-serif text-xl font-bold">{selectedRoom.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateRoomStatus} className="p-6 space-y-4 text-xs">
              {statusFormError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
                  {statusFormError}
                </div>
              )}

              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  New Condition Status *
                </label>
                <select
                  value={newRoomStatus}
                  onChange={(e) => setNewRoomStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                >
                  <option value="clean">Clean (Sanitized)</option>
                  <option value="inspected">Inspected (Ready for Guest Check-in)</option>
                  <option value="in_progress">Cleaning In Progress</option>
                  <option value="dirty">Dirty / Turnover Needed</option>
                  <option value="maintenance">Under Maintenance (Blocks Booking)</option>
                </select>
              </div>

              {newRoomStatus === "maintenance" && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800 space-y-1">
                  <span className="font-semibold flex items-center gap-1.5">
                    <WrenchIcon className="h-4 w-4 text-rose-600" />
                    Caution: Room Will Be Blocked
                  </span>
                  <p className="text-[0.7rem] leading-relaxed">
                    Setting this accommodation to Maintenance will block it from all public booking searches and mark it as unavailable on the calendar until resolved.
                  </p>
                </div>
              )}

              {newRoomStatus === "inspected" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                  <span className="font-semibold flex items-center gap-1.5">
                    <SparklesIcon className="h-4 w-4 text-emerald-600" />
                    Certified Ready for Guests
                  </span>
                  <p className="mt-0.5 text-[0.7rem]">
                    This certifies that all amenities, cleanliness standards, and room readiness checks are fully verified for incoming guests.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Operational Notes / Reason
                </label>
                <textarea
                  rows={3}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Notes on condition change, cleaning details, or maintenance summary..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                />
              </div>

              <div className="border-t border-slate-200 pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={statusSubmitting}
                  className="flex-1 rounded-xl bg-forest py-2.5 text-center font-semibold uppercase tracking-wider text-gold hover:bg-forest-dark transition-colors disabled:opacity-50"
                >
                  {statusSubmitting ? "Updating..." : "Update Condition"}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================
          MODAL: LOG HOUSEKEEPING PROGRESS
          ======================================================== */}
      {progressModalOpen && progressTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setProgressModalOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="border-b border-slate-200 bg-forest p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-gold">Housekeeping Progress</span>
                <h3 className="font-serif text-lg font-bold">{progressTask.room?.name || `Room #${progressTask.room_id}`}</h3>
              </div>
              <button type="button" onClick={() => setProgressModalOpen(false)} className="text-white/80 hover:text-white">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProgressSubmit} className="p-6 space-y-4 text-xs">
              {progressError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
                  {progressError}
                </div>
              )}

              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Progress Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  placeholder="Describe cleaning progress, items sanitized, linen refreshed, or notes for the team..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Attach Progress Photo (Optional)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setProgressFile(e.target.files[0]);
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-forest/10 file:text-forest file:font-semibold"
                />
              </div>

              <div className="border-t border-slate-200 pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={progressSubmitting}
                  className="flex-1 rounded-xl bg-forest py-2.5 text-center font-semibold uppercase tracking-wider text-gold hover:bg-forest-dark transition-colors disabled:opacity-50"
                >
                  {progressSubmitting ? "Logging Progress..." : "Save Progress Note"}
                </button>
                <button
                  type="button"
                  onClick={() => setProgressModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: SUBMIT FOR SUPERVISOR REVIEW
          ======================================================== */}
      {submitReviewModalOpen && submitReviewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setSubmitReviewModalOpen(false)} />
          <div className="relative z-50 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="border-b border-slate-200 bg-indigo-900 p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-indigo-200">Quality Inspection</span>
                <h3 className="font-serif text-lg font-bold">Submit for Supervisor Review</h3>
              </div>
              <button type="button" onClick={() => setSubmitReviewModalOpen(false)} className="text-white/80 hover:text-white">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-6 space-y-4 text-xs">
              {submitReviewError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
                  {submitReviewError}
                </div>
              )}

              <p className="text-slate-600 leading-relaxed text-[0.75rem]">
                Submitting this task sets its status to <strong>Pending Review</strong>. A resort manager or supervisor will inspect the room before marking it certified ready.
              </p>

              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Completion Checklist & Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  value={submitReviewNotes}
                  onChange={(e) => setSubmitReviewNotes(e.target.value)}
                  placeholder="Detail completion: bed linen sanitized, bathrooms stocked, espresso restocked, balcony wiped..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Attach Inspection Photo Proof (Optional)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSubmitReviewFile(e.target.files[0]);
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold"
                />
              </div>

              <div className="border-t border-slate-200 pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={submitReviewSubmitting}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-center font-semibold uppercase tracking-wider text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {submitReviewSubmitting ? "Submitting..." : "Submit to Supervisor"}
                </button>
                <button
                  type="button"
                  onClick={() => setSubmitReviewModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: SUPERVISOR INSPECTION & REVIEW (Approve / Reject)
          ======================================================== */}
      {reviewModalOpen && reviewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setReviewModalOpen(false)} />
          <div className="relative z-50 w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className={`p-5 text-white flex items-center justify-between ${reviewAction === "approve" ? "bg-forest" : "bg-rose-800"}`}>
              <div>
                <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-gold">Supervisor Sign-off</span>
                <h3 className="font-serif text-lg font-bold">
                  {reviewAction === "approve" ? "Approve & Complete Task" : "Request Cleaning Rework"}
                </h3>
              </div>
              <button type="button" onClick={() => setReviewModalOpen(false)} className="text-white/80 hover:text-white">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReviewDecisionSubmit} className="p-6 space-y-4 text-xs">
              {reviewError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
                  {reviewError}
                </div>
              )}

              {/* Task summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1 text-[0.75rem]">
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>{reviewTask.room?.name || `Room #${reviewTask.room_id}`}</span>
                  <span className="capitalize">{reviewTask.task_type.replace("_", " ")}</span>
                </div>
                <p className="text-slate-600">Assigned: {reviewTask.assigned_to?.name || "Unassigned"}</p>
                {reviewTask.notes && (
                  <p className="text-slate-700 italic border-t border-slate-200 pt-1">Notes: &ldquo;{reviewTask.notes}&rdquo;</p>
                )}
                {reviewTask.evidence_url && (
                  <div className="border-t border-slate-200 pt-2">
                    <span className="font-semibold text-slate-700">Submitted Evidence Photo:</span>
                    <div className="mt-1">
                      <a href={reviewTask.evidence_url} target="_blank" rel="noreferrer" className="inline-block text-forest underline hover:text-forest-dark font-medium">
                        View Uploaded Evidence Photo ↗
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Decision Toggle */}
              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                  Inspection Decision *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewAction("approve")}
                    className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                      reviewAction === "approve"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-400"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    ✓ Approve & Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction("reject")}
                    className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                      reviewAction === "reject"
                        ? "border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-400"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    ✕ Request Rework
                  </button>
                </div>
              </div>

              {/* If Approving: choose Room Condition */}
              {reviewAction === "approve" && (
                <div>
                  <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                    Update Accommodation Condition To *
                  </label>
                  <select
                    value={reviewRoomCondition}
                    onChange={(e) => setReviewRoomCondition(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                  >
                    <option value="inspected">Inspected (Certified Ready for Guest Check-in)</option>
                    <option value="clean">Clean (Sanitized, Standard)</option>
                  </select>
                </div>
              )}

              {/* Review notes */}
              <div>
                <label className="block text-[0.7rem] font-semibold uppercase tracking-wider text-stone-600 mb-1">
                  Supervisor Feedback & Remarks {reviewAction === "reject" ? "*" : "(Optional)"}
                </label>
                <textarea
                  required={reviewAction === "reject"}
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewAction === "reject"
                      ? "Explain what needs rework before room can be certified..."
                      : "Inspection verified standards met..."
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-forest focus:outline-none"
                />
              </div>

              <div className="border-t border-slate-200 pt-3 flex gap-3">
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className={`flex-1 rounded-xl py-2.5 text-center font-semibold uppercase tracking-wider text-white transition-colors disabled:opacity-50 ${
                    reviewAction === "approve" ? "bg-forest hover:bg-forest-dark" : "bg-rose-700 hover:bg-rose-800"
                  }`}
                >
                  {reviewSubmitting ? "Submitting..." : reviewAction === "approve" ? "Approve Task" : "Return for Rework"}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: TASK AUDIT HISTORY TIMELINE
          ======================================================== */}
      {historyModalOpen && historyTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setHistoryModalOpen(false)} />
          <div className="relative z-50 w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="border-b border-slate-200 bg-forest p-5 text-white flex items-center justify-between">
              <div>
                <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-gold">Audit Trail</span>
                <h3 className="font-serif text-lg font-bold">
                  Task History: {historyTask.room?.name || `Room #${historyTask.room_id}`}
                </h3>
              </div>
              <button type="button" onClick={() => setHistoryModalOpen(false)} className="text-white/80 hover:text-white">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {historyLoading ? (
                <div className="py-8 text-center text-slate-500">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-forest border-t-gold mb-2" />
                  Loading audit logs...
                </div>
              ) : historyLogs.length === 0 ? (
                <p className="py-8 text-center text-slate-500 italic">No history records logged for this task yet.</p>
              ) : (
                <div className="relative border-l-2 border-forest/20 ml-3 pl-4 space-y-6">
                  {historyLogs.map((log) => (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-forest ring-4 ring-white" />
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold capitalize text-forest">
                          {log.action.replace("_", " ")}
                        </span>
                        <span className="text-[0.65rem] text-slate-400 font-mono">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[0.7rem] text-slate-600 mt-0.5">
                        By: <strong className="text-slate-800">{log.actor?.name || log.user?.name || `User #${log.actor_user_id || log.user_id}`}</strong> ({log.actor?.role || log.user?.role || "staff"})
                      </p>
                      {log.from_status && log.to_status && (
                        <div className="mt-1 text-[0.65rem] text-slate-500">
                          Status: <span className="font-mono">{log.from_status}</span> → <span className="font-mono font-bold text-slate-700">{log.to_status}</span>
                        </div>
                      )}
                      {log.notes && (
                        <p className="mt-1.5 rounded-lg bg-slate-50 p-2.5 text-slate-700 italic border border-slate-100">
                          &ldquo;{log.notes}&rdquo;
                        </p>
                      )}
                      {log.evidence_url && (
                        <div className="mt-2">
                          <a href={log.evidence_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-forest underline">
                            📸 View Attached Photo Evidence ↗
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 p-4 text-right">
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
