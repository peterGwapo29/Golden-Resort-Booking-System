"use client";

import React, { useEffect, useState } from "react";
import {
  getAdminHousekeepingRooms,
  updateAdminRoomHousekeepingStatus,
  getAdminHousekeepingTasks,
  createAdminHousekeepingTask,
  updateAdminHousekeepingTaskStatus,
  getAdminHousekeepingStaff,
  type HousekeepingRoom,
  type HousekeepingTask,
  type HousekeepingMetrics,
  type HousekeepingStaffMember,
  type PaginatedResult,
} from "@/lib/admin-api";
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
  const [activeTab, setActiveTab] = useState<"rooms" | "tasks">("rooms");

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

        {/* Action Button */}
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
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                          {task.notes || <span className="text-stone-600 italic">No notes</span>}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                          {task.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateTaskStatus(task.id, "in_progress")}
                              className="rounded bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors"
                            >
                              Start
                            </button>
                          )}
                          {(task.status === "pending" || task.status === "in_progress") && (
                            <button
                              type="button"
                              onClick={() => handleUpdateTaskStatus(task.id, "completed")}
                              className="rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                            >
                              Mark Done
                            </button>
                          )}
                          {task.status !== "completed" && task.status !== "cancelled" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateTaskStatus(task.id, "cancelled")}
                              className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
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
    </div>
  );
}
