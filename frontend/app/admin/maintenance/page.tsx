"use client";

import React, { useEffect, useState } from "react";
import {
  getMaintenanceRequests,
  getMaintenanceStats,
  getMaintenanceRequest,
  getMaintenanceAssignees,
  assignMaintenanceRequest,
  acknowledgeMaintenanceRequest,
  startMaintenanceRequest,
  recordMaintenanceProgress,
  submitMaintenanceReview,
  reviewMaintenanceRequest,
  getMaintenanceHistory,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  updateMaintenanceStatus,
  deleteMaintenanceRequest,
  deleteMaintenanceAttachment,
  getAdminRooms,
  getAdminRestrictions,
  checkRestrictionConflicts,
  createAdminRestriction,
  clearAdminRestriction,
  cancelAdminRestriction,
  type MaintenanceRequest,
  type MaintenanceStats,
  type MaintenanceAttachment,
  type MaintenanceStaffAssignee,
  type MaintenanceHistory,
  type MaintenancePriority,
  type MaintenanceStatus,
  type MaintenanceResourceType,
  type AccommodationRestriction,
  type AffectedReservationSnapshot,
  type CheckConflictsResponse,
  type PaginatedResult,
} from "@/lib/admin-api";
import { formatPhp } from "@/lib/booking-utils";
import {
  WrenchIcon,
  SearchIcon,
  FilterIcon,
  PlusIcon,
  CloseIcon,
  EditIcon,
  TrashIcon,
  RefreshIcon,
  ClockIcon,
  DoorIcon,
  SparklesIcon,
  InfoIcon,
  CheckIcon,
  UsersIcon,
  ArrowRightIcon,
} from "@/components/ui/Icons";

export default function AdminMaintenancePage() {
  // State for listing & stats
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [pagination, setPagination] = useState<{
    currentPage: number;
    lastPage: number;
    total: number;
  }>({ currentPage: 1, lastPage: 1, total: 0 });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  // Auxiliary data
  const [rooms, setRooms] = useState<Array<{ id: number; name: string; category: string }>>([]);
  const [assignees, setAssignees] = useState<MaintenanceStaffAssignee[]>([]);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [detailRequest, setDetailRequest] = useState<MaintenanceRequest | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Assignment Modal
  const [assignModalOpen, setAssignModalOpen] = useState<boolean>(false);
  const [assignTargetRequest, setAssignTargetRequest] = useState<MaintenanceRequest | null>(null);
  const [assignSelectedStaffId, setAssignSelectedStaffId] = useState<string>("");
  const [assignDueDate, setAssignDueDate] = useState<string>("");
  const [assignNotes, setAssignNotes] = useState<string>("");
  const [assignSubmitting, setAssignSubmitting] = useState<boolean>(false);

  // Progress Update Modal
  const [progressModalOpen, setProgressModalOpen] = useState<boolean>(false);
  const [progressNotes, setProgressNotes] = useState<string>("");
  const [progressCostPhp, setProgressCostPhp] = useState<string>("");
  const [progressStatus, setProgressStatus] = useState<"in_progress" | "on_hold">("in_progress");
  const [progressFiles, setProgressFiles] = useState<File[]>([]);
  const [progressSubmitting, setProgressSubmitting] = useState<boolean>(false);

  // Submit for Completion Review Modal
  const [submitReviewModalOpen, setSubmitReviewModalOpen] = useState<boolean>(false);
  const [completionNotes, setCompletionNotes] = useState<string>("");
  const [completionCostPhp, setCompletionCostPhp] = useState<string>("");
  const [completionFiles, setCompletionFiles] = useState<File[]>([]);
  const [submitReviewSubmitting, setSubmitReviewSubmitting] = useState<boolean>(false);

  // Review Decision Modal (Approve / Reject)
  const [reviewDecisionModalOpen, setReviewDecisionModalOpen] = useState<boolean>(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);

  // Form inputs (Create / Edit)
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formResourceType, setFormResourceType] = useState<MaintenanceResourceType>("room");
  const [formRoomId, setFormRoomId] = useState<string>("");
  const [formResourceName, setFormResourceName] = useState<string>("");
  const [formLocation, setFormLocation] = useState<string>("");
  const [formPriority, setFormPriority] = useState<MaintenancePriority>("normal");
  const [formStatus, setFormStatus] = useState<MaintenanceStatus>("reported");
  const [formAssignedToUserId, setFormAssignedToUserId] = useState<string>("");
  const [formDueDate, setFormDueDate] = useState<string>("");
  const [formCostPhp, setFormCostPhp] = useState<string>("0");
  const [formRepairNotes, setFormRepairNotes] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Main Tab State: "requests" | "restrictions"
  const [activeTab, setActiveTab] = useState<"requests" | "restrictions">("requests");

  // Restrictions Listing State
  const [restrictions, setRestrictions] = useState<AccommodationRestriction[]>([]);
  const [restrictionsLoading, setRestrictionsLoading] = useState<boolean>(false);
  const [restrictionSearch, setRestrictionSearch] = useState<string>("");
  const [restrictionStatusFilter, setRestrictionStatusFilter] = useState<string>("all");
  const [restrictionTypeFilter, setRestrictionTypeFilter] = useState<string>("all");
  const [restrictionRoomFilter, setRestrictionRoomFilter] = useState<string>("all");
  const [restrictionPage, setRestrictionPage] = useState<number>(1);
  const [restrictionPagination, setRestrictionPagination] = useState<{
    currentPage: number;
    lastPage: number;
    total: number;
  }>({ currentPage: 1, lastPage: 1, total: 0 });

  // Place Restriction Modal State
  const [isRestrictionModalOpen, setIsRestrictionModalOpen] = useState<boolean>(false);
  const [restrRoomId, setRestrRoomId] = useState<string>("");
  const [restrMaintenanceId, setRestrMaintenanceId] = useState<string>("");
  const [restrType, setRestrType] = useState<
    "maintenance_block" | "emergency_repair" | "scheduled_renovation" | "safety_hazard" | "operational_hold"
  >("maintenance_block");
  const [restrTitle, setRestrTitle] = useState<string>("");
  const [restrReason, setRestrReason] = useState<string>("");
  const [restrBlockedUnits, setRestrBlockedUnits] = useState<number>(1);
  const [restrStartDate, setRestrStartDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [restrEndDate, setRestrEndDate] = useState<string>("");
  const [restrIsIndefinite, setRestrIsIndefinite] = useState<boolean>(false);
  const [restrHandlingProtocol, setRestrHandlingProtocol] = useState<string>("manager_review_queued");
  const [restrSubmitting, setRestrSubmitting] = useState<boolean>(false);
  const [restrError, setRestrError] = useState<string | null>(null);

  // Real-time Conflict Scan State
  const [conflictScanning, setConflictScanning] = useState<boolean>(false);
  const [conflictResult, setConflictResult] = useState<CheckConflictsResponse | null>(null);

  // Clearance Modal State
  const [clearModalOpen, setClearModalOpen] = useState<boolean>(false);
  const [targetRestriction, setTargetRestriction] = useState<AccommodationRestriction | null>(null);
  const [clearanceNotes, setClearanceNotes] = useState<string>("");
  const [clearanceRoomCondition, setClearanceRoomCondition] = useState<"inspected" | "clean" | "dirty">("inspected");
  const [clearSubmitting, setClearSubmitting] = useState<boolean>(false);

  // Cancel Restriction Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [cancelTargetRestriction, setCancelTargetRestriction] = useState<AccommodationRestriction | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [cancelSubmitting, setCancelSubmitting] = useState<boolean>(false);

  // Image lightbox preview
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Fetch Stats & Requests
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, requestsRes] = await Promise.all([
        getMaintenanceStats(),
        getMaintenanceRequests({
          page,
          status: statusFilter,
          priority: priorityFilter,
          resource_type: resourceTypeFilter,
          assigned_to: assignedToFilter,
          overdue_only: overdueOnly,
          search: search.trim() || undefined,
        }),
      ]);

      setStats(statsRes);
      setRequests(requestsRes.data);
      setPagination({
        currentPage: requestsRes.meta.current_page,
        lastPage: requestsRes.meta.last_page,
        total: requestsRes.meta.total,
      });

      // Keep detail request in sync if modal is open
      if (detailRequest) {
        const updatedDetail = requestsRes.data.find((r) => r.id === detailRequest.id);
        if (updatedDetail) {
          setDetailRequest(updatedDetail);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load maintenance requests.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load & when filters change
  useEffect(() => {
    fetchData();
  }, [page, statusFilter, priorityFilter, resourceTypeFilter, assignedToFilter, overdueOnly]);

  // Load rooms and assignees once
  useEffect(() => {
    getAdminRooms({ status: "active" })
      .then((res) => {
        if (res && res.data) {
          setRooms(res.data.map((r: any) => ({ id: r.id, name: r.name, category: r.category })));
        }
      })
      .catch((err) => console.error("Could not fetch rooms list:", err));

    getMaintenanceAssignees()
      .then((res) => {
        if (res && res.data) {
          setAssignees(res.data);
        }
      })
      .catch((err) => console.error("Could not fetch assignees:", err));
  }, []);

  // Fetch Availability Restrictions
  const fetchRestrictions = async () => {
    setRestrictionsLoading(true);
    try {
      const res = await getAdminRestrictions({
        page: restrictionPage,
        room_id: restrictionRoomFilter,
        status: restrictionStatusFilter,
        restriction_type: restrictionTypeFilter,
        search: restrictionSearch.trim() || undefined,
      });
      setRestrictions(res.data);
      setRestrictionPagination({
        currentPage: res.meta.current_page,
        lastPage: res.meta.last_page,
        total: res.meta.total,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load accommodation restrictions.");
    } finally {
      setRestrictionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "restrictions") {
      fetchRestrictions();
    }
  }, [activeTab, restrictionPage, restrictionRoomFilter, restrictionStatusFilter, restrictionTypeFilter]);

  // Real-time Conflict Pre-Check
  const triggerConflictScan = async (
    roomIdVal: string,
    startVal: string,
    endVal: string,
    isIndefiniteVal: boolean,
    unitsVal: number
  ) => {
    if (!roomIdVal || !startVal) {
      setConflictResult(null);
      return;
    }
    setConflictScanning(true);
    try {
      const res = await checkRestrictionConflicts({
        room_id: Number(roomIdVal),
        start_date: startVal,
        end_date: isIndefiniteVal ? undefined : endVal || undefined,
        is_indefinite: isIndefiniteVal,
        blocked_units: unitsVal,
      });
      setConflictResult(res);
    } catch (err: any) {
      console.error("Conflict check failed:", err);
    } finally {
      setConflictScanning(false);
    }
  };

  // Open Place Restriction Modal
  const openPlaceRestrictionModal = (initialRoomId?: number, initialMaintenanceId?: number) => {
    setRestrRoomId(initialRoomId ? String(initialRoomId) : rooms[0]?.id ? String(rooms[0].id) : "");
    setRestrMaintenanceId(initialMaintenanceId ? String(initialMaintenanceId) : "");
    setRestrType("maintenance_block");
    setRestrTitle("");
    setRestrReason("");
    setRestrBlockedUnits(1);
    const today = new Date().toISOString().split("T")[0];
    setRestrStartDate(today);
    setRestrEndDate("");
    setRestrIsIndefinite(false);
    setRestrHandlingProtocol("manager_review_queued");
    setRestrError(null);
    setConflictResult(null);
    setIsRestrictionModalOpen(true);

    if (initialRoomId || rooms[0]?.id) {
      triggerConflictScan(
        initialRoomId ? String(initialRoomId) : String(rooms[0].id),
        today,
        "",
        false,
        1
      );
    }
  };

  // Submit Place Restriction
  const handleCreateRestrictionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restrRoomId || !restrStartDate || !restrTitle.trim() || !restrReason.trim()) {
      setRestrError("Please fill in all required fields (Accommodation, Title, Reason, Start Date).");
      return;
    }
    if (!restrIsIndefinite && !restrEndDate) {
      setRestrError("Please provide an End Date or mark the restriction as Indefinite.");
      return;
    }

    setRestrSubmitting(true);
    setRestrError(null);

    try {
      await createAdminRestriction({
        room_id: Number(restrRoomId),
        maintenance_request_id: restrMaintenanceId ? Number(restrMaintenanceId) : undefined,
        restriction_type: restrType,
        title: restrTitle.trim(),
        reason: restrReason.trim(),
        blocked_units: restrBlockedUnits,
        start_date: restrStartDate,
        end_date: restrIsIndefinite ? null : restrEndDate,
        is_indefinite: restrIsIndefinite,
        handling_protocol: conflictResult && conflictResult.overlapping_count > 0 ? restrHandlingProtocol : undefined,
      });

      setIsRestrictionModalOpen(false);
      setSuccessBanner("Accommodation availability restriction placed successfully.");
      if (activeTab === "restrictions") {
        fetchRestrictions();
      } else {
        fetchData();
      }
    } catch (err: any) {
      setRestrError(err.message || "Failed to place restriction.");
    } finally {
      setRestrSubmitting(false);
    }
  };

  // Clear Restriction Submit
  const handleClearRestrictionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRestriction) return;
    if (!clearanceNotes.trim() || clearanceNotes.trim().length < 5) {
      alert("Clearance notes must be at least 5 characters detailing operational inspection.");
      return;
    }

    setClearSubmitting(true);
    try {
      await clearAdminRestriction(targetRestriction.id, {
        clearance_notes: clearanceNotes.trim(),
        room_condition: clearanceRoomCondition,
      });

      setClearModalOpen(false);
      setTargetRestriction(null);
      setSuccessBanner("Operational clearance verified. Room availability restored.");
      fetchRestrictions();
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to clear restriction.");
    } finally {
      setClearSubmitting(false);
    }
  };

  // Cancel Restriction Submit
  const handleCancelRestrictionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTargetRestriction) return;
    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      alert("Please enter a valid cancellation reason (min 5 characters).");
      return;
    }

    setCancelSubmitting(true);
    try {
      await cancelAdminRestriction(cancelTargetRestriction.id, {
        cancellation_reason: cancelReason.trim(),
      });

      setCancelModalOpen(false);
      setCancelTargetRestriction(null);
      setSuccessBanner("Restriction cancelled successfully.");
      fetchRestrictions();
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to cancel restriction.");
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingRequest(null);
    setFormTitle("");
    setFormDescription("");
    setFormResourceType("room");
    setFormRoomId("");
    setFormResourceName("");
    setFormLocation("");
    setFormPriority("normal");
    setFormStatus("reported");
    setFormAssignedToUserId("");
    setFormDueDate("");
    setFormCostPhp("0");
    setFormRepairNotes("");
    setSelectedFiles([]);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (req: MaintenanceRequest) => {
    setEditingRequest(req);
    setFormTitle(req.title);
    setFormDescription(req.description);
    setFormResourceType(req.resource_type);
    setFormRoomId(req.room_id ? String(req.room_id) : "");
    setFormResourceName(req.resource_name);
    setFormLocation(req.location || "");
    setFormPriority(req.priority);
    setFormStatus(req.status);
    setFormAssignedToUserId(req.assigned_to?.id ? String(req.assigned_to.id) : "");
    setFormDueDate(req.due_date ? req.due_date.slice(0, 16) : "");
    setFormCostPhp(String(req.cost_php || 0));
    setFormRepairNotes(req.repair_notes || "");
    setSelectedFiles([]);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Details Modal
  const openDetailsModal = async (req: MaintenanceRequest) => {
    try {
      const res = await getMaintenanceRequest(req.id);
      setDetailRequest(res.data);
      setIsDetailsModalOpen(true);
    } catch (err: any) {
      setDetailRequest(req);
      setIsDetailsModalOpen(true);
    }
  };

  // Open Assign Modal
  const openAssignModal = (req: MaintenanceRequest) => {
    setAssignTargetRequest(req);
    setAssignSelectedStaffId(req.assigned_to?.id ? String(req.assigned_to.id) : "");
    setAssignDueDate(req.due_date ? req.due_date.slice(0, 16) : "");
    setAssignNotes("");
    setAssignModalOpen(true);
  };

  // Submit Assignment
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetRequest || !assignSelectedStaffId) return;

    setAssignSubmitting(true);
    try {
      const res = await assignMaintenanceRequest(assignTargetRequest.id, {
        assigned_to_user_id: parseInt(assignSelectedStaffId, 10),
        due_date: assignDueDate ? assignDueDate : null,
        notes: assignNotes.trim() || undefined,
      });

      setSuccessBanner(`Task assigned to ${res.data.assigned_to?.name} successfully.`);
      setAssignModalOpen(false);

      if (detailRequest?.id === assignTargetRequest.id) {
        setDetailRequest(res.data);
      }
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to assign task.");
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Acknowledge Task
  const handleAcknowledge = async (req: MaintenanceRequest) => {
    try {
      const res = await acknowledgeMaintenanceRequest(req.id);
      setSuccessBanner(`Task ${req.tracking_number} acknowledged.`);
      if (detailRequest?.id === req.id) {
        setDetailRequest(res.data);
      }
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to acknowledge task.");
    }
  };

  // Start Work
  const handleStartWork = async (req: MaintenanceRequest) => {
    try {
      const res = await startMaintenanceRequest(req.id);
      setSuccessBanner(`Work started on task ${req.tracking_number}.`);
      if (detailRequest?.id === req.id) {
        setDetailRequest(res.data);
      }
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to start work.");
    }
  };

  // Open Progress Modal
  const openProgressModal = (req: MaintenanceRequest) => {
    setProgressNotes("");
    setProgressCostPhp(String(req.cost_php || ""));
    setProgressStatus("in_progress");
    setProgressFiles([]);
    setProgressModalOpen(true);
  };

  // Submit Progress
  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailRequest || !progressNotes.trim()) return;

    setProgressSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("notes", progressNotes.trim());
      if (progressCostPhp) formData.append("cost_php", progressCostPhp);
      formData.append("status", progressStatus);
      progressFiles.forEach((file) => formData.append("attachments[]", file));

      const res = await recordMaintenanceProgress(detailRequest.id, formData);
      setSuccessBanner("Progress updated successfully.");
      setProgressModalOpen(false);
      setDetailRequest(res.data);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to update progress.");
    } finally {
      setProgressSubmitting(false);
    }
  };

  // Open Submit for Review Modal
  const openSubmitReviewModal = (req: MaintenanceRequest) => {
    setCompletionNotes("");
    setCompletionCostPhp(String(req.cost_php || ""));
    setCompletionFiles([]);
    setSubmitReviewModalOpen(true);
  };

  // Submit for Completion Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailRequest || !completionNotes.trim()) return;

    setSubmitReviewSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("completion_notes", completionNotes.trim());
      if (completionCostPhp) formData.append("cost_php", completionCostPhp);
      completionFiles.forEach((file) => formData.append("attachments[]", file));

      const res = await submitMaintenanceReview(detailRequest.id, formData);
      setSuccessBanner(`Work submitted for supervisor completion review.`);
      setSubmitReviewModalOpen(false);
      setDetailRequest(res.data);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to submit for review.");
    } finally {
      setSubmitReviewSubmitting(false);
    }
  };

  // Open Review Decision Modal
  const openReviewDecisionModal = (action: "approve" | "reject") => {
    setReviewAction(action);
    setReviewNotes("");
    setReviewDecisionModalOpen(true);
  };

  // Submit Review Decision
  const handleReviewDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailRequest) return;

    setReviewSubmitting(true);
    try {
      const res = await reviewMaintenanceRequest(detailRequest.id, {
        action: reviewAction,
        notes: reviewNotes.trim() || undefined,
      });

      setSuccessBanner(
        reviewAction === "approve"
          ? `Work completion approved! Task ${detailRequest.tracking_number} marked resolved.`
          : `Task returned to technician with revision feedback.`
      );
      setReviewDecisionModalOpen(false);
      setDetailRequest(res.data);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to process review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removePendingFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Save / Submit Form (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim() || !formResourceName.trim()) {
      setFormError("Title, resource name, and problem description are required.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append("title", formTitle.trim());
      formData.append("description", formDescription.trim());
      formData.append("resource_type", formResourceType);
      formData.append("resource_name", formResourceName.trim());
      if (formRoomId) formData.append("room_id", formRoomId);
      if (formLocation.trim()) formData.append("location", formLocation.trim());
      formData.append("priority", formPriority);
      formData.append("status", formStatus);
      if (formAssignedToUserId) formData.append("assigned_to_user_id", formAssignedToUserId);
      if (formDueDate) formData.append("due_date", formDueDate);
      formData.append("cost_php", String(parseFloat(formCostPhp) || 0));
      if (formRepairNotes.trim()) formData.append("repair_notes", formRepairNotes.trim());

      selectedFiles.forEach((file) => {
        formData.append("attachments[]", file);
      });

      if (editingRequest) {
        await updateMaintenanceRequest(editingRequest.id, formData);
        setSuccessBanner(`Maintenance request ${editingRequest.tracking_number} updated successfully.`);
      } else {
        const res = await createMaintenanceRequest(formData);
        setSuccessBanner(`Maintenance request ${res.data.tracking_number} reported successfully.`);
      }

      setIsFormModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Failed to save maintenance request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete an existing attachment
  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!editingRequest && !detailRequest) return;
    const reqId = editingRequest ? editingRequest.id : detailRequest!.id;

    if (!confirm("Are you sure you want to delete this attachment?")) return;

    try {
      await deleteMaintenanceAttachment(reqId, attachmentId);
      if (editingRequest) {
        setEditingRequest({
          ...editingRequest,
          attachments: editingRequest.attachments.filter((a) => a.id !== attachmentId),
        });
      }
      if (detailRequest) {
        setDetailRequest({
          ...detailRequest,
          attachments: detailRequest.attachments.filter((a) => a.id !== attachmentId),
        });
      }
      fetchData();
    } catch (err: any) {
      alert(err.message || "Could not delete attachment.");
    }
  };

  // Delete Request
  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await deleteMaintenanceRequest(deleteConfirmId);
      setSuccessBanner("Maintenance request deleted successfully.");
      setDeleteConfirmId(null);
      if (detailRequest?.id === deleteConfirmId) {
        setIsDetailsModalOpen(false);
      }
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to delete request.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Badge helpers
  const getPriorityBadge = (priority: MaintenancePriority) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-100 text-rose-800 border-rose-300 font-bold";
      case "high":
        return "bg-amber-100 text-amber-800 border-amber-300 font-semibold";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "low":
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const getStatusBadge = (status: MaintenanceStatus) => {
    switch (status) {
      case "reported":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "assessed":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "assigned":
        return "bg-indigo-50 text-indigo-800 border-indigo-200";
      case "acknowledged":
        return "bg-cyan-50 text-cyan-800 border-cyan-200";
      case "in_progress":
        return "bg-blue-50 text-blue-800 border-blue-200 animate-pulse";
      case "on_hold":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "pending_review":
        return "bg-orange-50 text-orange-900 border-orange-300 font-semibold";
      case "resolved":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "cancelled":
        return "bg-rose-50 text-rose-800 border-rose-200";
      default:
        return "bg-slate-50 text-slate-800 border-slate-200";
    }
  };

  const formatStatusLabel = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-forest/10 text-forest rounded-lg">
                <WrenchIcon className="h-6 w-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-forest">
                Maintenance &amp; Task Workflow
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Assign repairs, track staff execution, review work evidence, and manage maintenance budgets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (activeTab === "requests") fetchData();
                else fetchRestrictions();
              }}
              disabled={isLoading || restrictionsLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition"
              title="Refresh records"
            >
              <RefreshIcon className={`h-4 w-4 ${isLoading || restrictionsLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {activeTab === "restrictions" ? (
              <button
                type="button"
                onClick={() => openPlaceRestrictionModal()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-sm transition"
              >
                <PlusIcon className="h-4 w-4" />
                Place Availability Restriction
              </button>
            ) : (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-forest hover:bg-forest/90 rounded-lg shadow-sm transition"
              >
                <PlusIcon className="h-4 w-4" />
                New Maintenance Request
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "requests"
                ? "border-forest text-forest"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <WrenchIcon className="h-4 w-4" />
            Maintenance Work Orders
            {stats && stats.total_active > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-forest/10 text-forest font-bold">
                {stats.total_active}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("restrictions")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "restrictions"
                ? "border-purple-700 text-purple-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <DoorIcon className="h-4 w-4" />
            Accommodation Availability Restrictions
            {restrictions.filter((r) => r.status === "active").length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800 font-bold">
                {restrictions.filter((r) => r.status === "active").length} active
              </span>
            )}
          </button>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm animate-fade-in">
            <span>{successBanner}</span>
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              className="p-1 hover:bg-emerald-100 rounded text-emerald-600"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
            {error}
          </div>
        )}

        {/* KPI Metrics Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Open
              </span>
              <p className="mt-2 text-2xl font-bold text-forest">{stats.total_active}</p>
              <span className="text-[11px] text-slate-400">Total in pipeline</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                Assigned to Me
              </span>
              <p className="mt-2 text-2xl font-bold text-indigo-600">{stats.assigned_to_me}</p>
              <span className="text-[11px] text-slate-400">Your direct tasks</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
                Needs Review
              </span>
              <p className="mt-2 text-2xl font-bold text-orange-600">{stats.pending_review}</p>
              <span className="text-[11px] text-slate-400">Awaiting supervisor</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                Overdue Tasks
              </span>
              <p className="mt-2 text-2xl font-bold text-rose-600">{stats.overdue}</p>
              <span className="text-[11px] text-slate-400">Exceeded deadline/SLA</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                Resolved
              </span>
              <p className="mt-2 text-2xl font-bold text-emerald-600">{stats.resolved}</p>
              <span className="text-[11px] text-slate-400">Completed jobs</span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Expenses
              </span>
              <p className="mt-2 text-xl font-bold text-forest truncate" title={formatPhp(stats.total_cost_php)}>
                {formatPhp(stats.total_cost_php)}
              </p>
              <span className="text-[11px] text-slate-400">Repair costs (PHP)</span>
            </div>
          </div>
        )}

        {/* ========================================================
            WORK ORDERS TAB
            ======================================================== */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {/* Filters & Search Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by tracking #, resource, issue title, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs sm:text-sm border border-slate-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
              >
                <option value="all">Status: All</option>
                <option value="reported">Reported</option>
                <option value="assigned">Assigned</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="in_progress">In Progress</option>
                <option value="pending_review">Needs Review</option>
                <option value="on_hold">On Hold</option>
                <option value="resolved">Resolved</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Priority filter */}
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs sm:text-sm border border-slate-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
              >
                <option value="all">Priority: All</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>

              {/* Assignee filter */}
              <select
                value={assignedToFilter}
                onChange={(e) => {
                  setAssignedToFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs sm:text-sm border border-slate-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
              >
                <option value="all">Assignee: All</option>
                <option value="my_tasks">Assigned to Me</option>
                <option value="unassigned">Unassigned</option>
                {assignees.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.role})
                  </option>
                ))}
              </select>

              {/* Resource Type */}
              <select
                value={resourceTypeFilter}
                onChange={(e) => {
                  setResourceTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs sm:text-sm border border-slate-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
              >
                <option value="all">Resource: All</option>
                <option value="room">Room</option>
                <option value="villa">Villa</option>
                <option value="facility">Facility</option>
                <option value="equipment">Equipment</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Overdue checkbox */}
            <div className="flex items-center gap-2 self-center">
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={(e) => {
                    setOverdueOnly(e.target.checked);
                    setPage(1);
                  }}
                  className="rounded text-forest focus:ring-forest/30"
                />
                <span className="font-semibold text-rose-700">Overdue Only</span>
              </label>

              {(search || statusFilter !== "all" || priorityFilter !== "all" || resourceTypeFilter !== "all" || assignedToFilter !== "all" || overdueOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setResourceTypeFilter("all");
                    setAssignedToFilter("all");
                    setOverdueOnly(false);
                    setPage(1);
                  }}
                  className="ml-2 text-xs text-slate-500 hover:text-forest underline"
                >
                  Reset
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Requests Table / Cards */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-forest border-t-gold" />
              <p className="text-sm text-slate-500 font-medium">Loading maintenance requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <WrenchIcon className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">No maintenance requests found</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                No tasks match your selected filters. Adjust your search or click below to file a new request.
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-forest hover:bg-forest/90 rounded-lg shadow-sm transition"
              >
                <PlusIcon className="h-4 w-4" />
                New Maintenance Request
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Tracking #</th>
                      <th className="px-5 py-3.5">Resource</th>
                      <th className="px-5 py-3.5">Problem / Title</th>
                      <th className="px-5 py-3.5">Assignee</th>
                      <th className="px-5 py-3.5">Priority</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Cost</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-4 font-mono text-xs font-bold text-forest whitespace-nowrap">
                          {req.tracking_number}
                          {req.is_overdue && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              Overdue
                            </span>
                          )}
                          {req.attachments && req.attachments.length > 0 && (
                            <span className="ml-2 inline-flex items-center text-[11px] font-sans font-medium text-slate-400" title={`${req.attachments.length} attachment(s)`}>
                              📎 {req.attachments.length}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{req.resource_name}</div>
                          <span className="inline-block mt-0.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {req.resource_type}
                          </span>
                        </td>
                        <td className="px-5 py-4 max-w-xs">
                          <div className="font-medium text-slate-900 truncate" title={req.title}>
                            {req.title}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1" title={req.description}>
                            {req.description}
                          </p>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {req.assigned_to ? (
                            <div className="flex items-center gap-2">
                              <span className="h-6 w-6 rounded-full bg-forest/10 text-forest text-[11px] font-bold flex items-center justify-center">
                                {req.assigned_to.name.charAt(0)}
                              </span>
                              <div>
                                <div className="font-medium text-slate-900 text-xs">{req.assigned_to.name}</div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{req.assigned_to.role}</span>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openAssignModal(req)}
                              className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-md border border-amber-200 font-medium transition"
                            >
                              + Assign Staff
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-1 text-xs rounded-full border uppercase tracking-wider ${getPriorityBadge(req.priority)}`}>
                            {req.priority}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-md border ${getStatusBadge(req.status)}`}>
                            {formatStatusLabel(req.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-800">
                          {formatPhp(req.cost_php)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openDetailsModal(req)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-forest bg-forest/5 hover:bg-forest/10 rounded-md transition"
                            >
                              Details
                            </button>
                            {req.capabilities?.can_assign && (
                              <button
                                type="button"
                                onClick={() => openAssignModal(req)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                                title="Assign / Reassign Staff"
                              >
                                <UsersIcon className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditModal(req)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                              title="Edit Request"
                            >
                              <EditIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(req.id)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
                              title="Delete Request"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet Responsive Cards */}
              <div className="lg:hidden divide-y divide-slate-200">
                {requests.map((req) => (
                  <div key={req.id} className="p-4 space-y-3 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-forest">
                          {req.tracking_number}
                        </span>
                        {req.is_overdue && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-100 text-rose-800 border border-rose-300">
                            Overdue
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full border uppercase tracking-wider ${getPriorityBadge(req.priority)}`}>
                        {req.priority}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-900">{req.title}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{req.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-700">{req.resource_name}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {req.resource_type}
                      </span>
                      <span className="ml-auto font-bold text-forest">{formatPhp(req.cost_php)}</span>
                    </div>

                    {req.assigned_to && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
                        <UsersIcon className="h-3.5 w-3.5 text-slate-400" />
                        <span>Assigned to: <strong className="text-slate-800">{req.assigned_to.name}</strong></span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusBadge(req.status)}`}>
                        {formatStatusLabel(req.status)}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openDetailsModal(req)}
                          className="px-2.5 py-1 text-xs font-semibold text-forest bg-forest/5 hover:bg-forest/10 rounded transition"
                        >
                          View
                        </button>
                        {req.capabilities?.can_assign && (
                          <button
                            type="button"
                            onClick={() => openAssignModal(req)}
                            className="p-1 text-slate-500 hover:text-slate-800 rounded transition"
                          >
                            <UsersIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(req)}
                          className="p-1 text-slate-500 hover:text-slate-800 rounded transition"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(req.id)}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded transition"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {pagination.lastPage > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 bg-slate-50/50">
                  <span className="text-xs text-slate-500">
                    Showing page <span className="font-bold">{pagination.currentPage}</span> of{" "}
                    <span className="font-bold">{pagination.lastPage}</span> ({pagination.total} total)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={pagination.currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={pagination.currentPage >= pagination.lastPage}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        </div>
        )}

        {/* ========================================================
            AVAILABILITY RESTRICTIONS TAB
            ======================================================== */}
        {activeTab === "restrictions" && (
          <div className="space-y-4">
            {/* Restrictions Filters Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by restriction reference (AR-...), title, reason, or accommodation..."
                    value={restrictionSearch}
                    onChange={(e) => setRestrictionSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        fetchRestrictions();
                      }
                    }}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <select
                    value={restrictionStatusFilter}
                    onChange={(e) => {
                      setRestrictionStatusFilter(e.target.value);
                      setRestrictionPage(1);
                    }}
                    className="text-xs sm:text-sm border border-slate-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  >
                    <option value="all">Status: All</option>
                    <option value="active">Active Only</option>
                    <option value="cleared">Cleared</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <select
                    value={restrictionTypeFilter}
                    onChange={(e) => {
                      setRestrictionTypeFilter(e.target.value);
                      setRestrictionPage(1);
                    }}
                    className="text-xs sm:text-sm border border-slate-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  >
                    <option value="all">Type: All</option>
                    <option value="maintenance_block">Maintenance Block</option>
                    <option value="emergency_repair">Emergency Repair</option>
                    <option value="scheduled_renovation">Scheduled Renovation</option>
                    <option value="safety_hazard">Safety Hazard</option>
                    <option value="operational_hold">Operational Hold</option>
                  </select>

                  <select
                    value={restrictionRoomFilter}
                    onChange={(e) => {
                      setRestrictionRoomFilter(e.target.value);
                      setRestrictionPage(1);
                    }}
                    className="text-xs sm:text-sm border border-slate-300 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  >
                    <option value="all">Room: All Accommodations</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Restrictions Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {restrictionsLoading ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                  <RefreshIcon className="h-8 w-8 text-purple-600 animate-spin mb-2" />
                  <p className="text-sm">Loading accommodation restrictions...</p>
                </div>
              ) : restrictions.length === 0 ? (
                <div className="p-12 text-center text-slate-500 space-y-3">
                  <DoorIcon className="h-12 w-12 mx-auto text-slate-300" />
                  <h3 className="text-base font-bold text-slate-700">No Availability Restrictions Found</h3>
                  <p className="text-xs max-w-sm mx-auto text-slate-500">
                    All resort accommodations currently have unobstructed availability, or no records matched your filter criteria.
                  </p>
                  <button
                    type="button"
                    onClick={() => openPlaceRestrictionModal()}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Place New Restriction
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600 border-collapse">
                      <thead className="bg-slate-50/80 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Reference / Accommodation</th>
                          <th className="px-4 py-3">Type &amp; Title</th>
                          <th className="px-4 py-3">Date Window</th>
                          <th className="px-4 py-3 text-center">Blocked Units</th>
                          <th className="px-4 py-3">Conflict Protocol</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {restrictions.map((restr) => {
                          const hasConflicts =
                            restr.affected_reservations_snapshot &&
                            restr.affected_reservations_snapshot.length > 0;

                          return (
                            <tr key={restr.id} className="hover:bg-slate-50/60 transition">
                              <td className="px-4 py-3">
                                <span className="font-mono font-bold text-purple-900 block">
                                  {restr.restriction_number}
                                </span>
                                <div className="mt-0.5 font-medium text-slate-800">
                                  {restr.room?.name || `Room #${restr.room_id}`}
                                </div>
                                <span className="text-[10px] text-slate-400 capitalize">
                                  {restr.room?.category} &bull; Total Units: {restr.room?.total_inventory}
                                </span>
                              </td>

                              <td className="px-4 py-3 max-w-[240px]">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase tracking-wider mb-1">
                                  {restr.restriction_type.replace(/_/g, " ")}
                                </span>
                                <p className="font-semibold text-slate-900 truncate" title={restr.title}>
                                  {restr.title}
                                </p>
                                <p className="text-[11px] text-slate-500 line-clamp-1" title={restr.reason}>
                                  {restr.reason}
                                </p>
                              </td>

                              <td className="px-4 py-3 font-mono text-[11px]">
                                <div>
                                  <span className="text-slate-400 text-[10px] uppercase block">Start</span>
                                  <span className="font-medium text-slate-800">{restr.start_date}</span>
                                </div>
                                <div className="mt-1">
                                  <span className="text-slate-400 text-[10px] uppercase block">End</span>
                                  <span className="font-medium text-slate-800">
                                    {restr.is_indefinite || !restr.end_date ? (
                                      <span className="text-amber-700 font-bold">Indefinite</span>
                                    ) : (
                                      restr.end_date
                                    )}
                                  </span>
                                </div>
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200">
                                  {restr.blocked_units} {restr.blocked_units > 1 ? "Units" : "Unit"}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                {hasConflicts ? (
                                  <div className="space-y-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                      ⚠️ {restr.affected_reservations_snapshot?.length} Overlapping
                                    </span>
                                    <p className="text-[10px] text-slate-500 capitalize">
                                      Protocol: {restr.handling_protocol?.replace(/_/g, " ")}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <CheckIcon className="h-3 w-3" /> No Guest Conflicts
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3">
                                {restr.status === "active" ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                    <span className="h-2 w-2 rounded-full bg-rose-600" />
                                    Active Restriction
                                  </span>
                                ) : restr.status === "cleared" ? (
                                  <div>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      <CheckIcon className="h-3.5 w-3.5" />
                                      Cleared
                                    </span>
                                    {restr.cleared_at && (
                                      <span className="text-[10px] text-slate-400 block mt-0.5">
                                        {new Date(restr.cleared_at).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
                                    Cancelled
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-right">
                                {restr.status === "active" ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTargetRestriction(restr);
                                        setClearanceNotes("");
                                        setClearanceRoomCondition("inspected");
                                        setClearModalOpen(true);
                                      }}
                                      className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition"
                                      title="Verify operational clearance and restore room availability"
                                    >
                                      Clear &amp; Restore
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCancelTargetRestriction(restr);
                                        setCancelReason("");
                                        setCancelModalOpen(true);
                                      }}
                                      className="px-2 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-lg transition"
                                      title="Cancel restriction"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">
                                    {restr.status === "cleared" ? "Restored" : "Cancelled"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Restrictions Pagination */}
                  {restrictionPagination.lastPage > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 bg-slate-50/50">
                      <span className="text-xs text-slate-500">
                        Showing page <span className="font-bold">{restrictionPagination.currentPage}</span> of{" "}
                        <span className="font-bold">{restrictionPagination.lastPage}</span> ({restrictionPagination.total} total)
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={restrictionPagination.currentPage <= 1}
                          onClick={() => setRestrictionPage((p) => Math.max(1, p - 1))}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          disabled={restrictionPagination.currentPage >= restrictionPagination.lastPage}
                          onClick={() => setRestrictionPage((p) => p + 1)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md disabled:opacity-50 hover:bg-slate-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ASSIGN / REASSIGN MODAL */}
      {assignModalOpen && assignTargetRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-5 w-5 text-forest" />
                <h3 className="font-serif font-bold text-forest">
                  {assignTargetRequest.assigned_to ? "Reassign Task" : "Assign Maintenance Task"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-6 space-y-4 text-sm">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <span className="font-bold text-forest">{assignTargetRequest.tracking_number}</span>
                <p className="font-semibold text-slate-800">{assignTargetRequest.title}</p>
                <p className="text-slate-500">Resource: {assignTargetRequest.resource_name}</p>
                {assignTargetRequest.assigned_to && (
                  <p className="text-amber-700 font-medium">Currently assigned to: {assignTargetRequest.assigned_to.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Staff Member <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={assignSelectedStaffId}
                  onChange={(e) => setAssignSelectedStaffId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
                >
                  <option value="">-- Choose technician / staff --</option>
                  {assignees.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} — {staff.role} {staff.department ? `(${staff.department})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Target Due Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assignment Rationale / Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Instructions for the technician or reason for reassignment..."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assignSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-forest hover:bg-forest/90 rounded-lg disabled:opacity-50"
                >
                  {assignSubmitting && <RefreshIcon className="h-4 w-4 animate-spin" />}
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS & WORKFLOW MODAL */}
      {isDetailsModalOpen && detailRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-forest/10 text-forest rounded-lg">
                  <WrenchIcon className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-forest">
                      {detailRequest.tracking_number}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full border uppercase tracking-wider ${getPriorityBadge(detailRequest.priority)}`}>
                      {detailRequest.priority}
                    </span>
                    {detailRequest.is_overdue && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                        Overdue
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-serif font-bold text-slate-900 mt-0.5">
                    {detailRequest.title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
              {/* SUPERVISOR REVIEW BANNER (When status is pending_review) */}
              {detailRequest.status === "pending_review" && (
                <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl shadow-xs space-y-3 animate-fade-in">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-bold uppercase rounded bg-amber-500 text-white">
                          Completion Review Required
                        </span>
                        <span className="text-xs text-amber-900 font-medium">
                          Submitted by {detailRequest.assigned_to?.name || "Technician"}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">
                        Technician submitted repair completion for approval.
                      </h4>
                      <p className="text-xs text-slate-700">
                        Please review the repair notes, verify photographic evidence, and approve completion or request changes.
                      </p>
                    </div>

                    {detailRequest.capabilities?.can_review && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openReviewDecisionModal("approve")}
                          className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition"
                        >
                          Approve &amp; Resolve
                        </button>
                        <button
                          type="button"
                          onClick={() => openReviewDecisionModal("reject")}
                          className="px-3.5 py-2 text-xs font-semibold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100/50 rounded-xl transition"
                        >
                          Request Changes
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Resource & Assignment Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Resource Info */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Affected Resource
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Resource:</span>
                      <p className="font-semibold text-slate-900">{detailRequest.resource_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Type:</span>
                      <p className="font-semibold uppercase text-slate-900">{detailRequest.resource_type}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Location:</span>
                      <p className="text-slate-800">{detailRequest.location || "General Property"}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Maintenance Cost:</span>
                      <p className="font-bold text-forest">{formatPhp(detailRequest.cost_php)}</p>
                    </div>
                  </div>
                </div>

                {/* Assignment & Deadlines */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Staff Assignment
                    </h4>
                    {detailRequest.capabilities?.can_assign && (
                      <button
                        type="button"
                        onClick={() => openAssignModal(detailRequest)}
                        className="text-xs font-semibold text-forest hover:underline"
                      >
                        {detailRequest.assigned_to ? "Reassign Staff" : "+ Assign Staff"}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Assigned Technician:</span>
                      <p className="font-semibold text-slate-900">
                        {detailRequest.assigned_to ? detailRequest.assigned_to.name : "Unassigned"}
                      </p>
                      {detailRequest.assigned_to?.department && (
                        <span className="text-[10px] text-slate-500">{detailRequest.assigned_to.department}</span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500">Target Due Date:</span>
                      <p className={`font-semibold ${detailRequest.is_overdue ? "text-rose-600" : "text-slate-900"}`}>
                        {detailRequest.due_date ? new Date(detailRequest.due_date).toLocaleString() : "Standard SLA"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Current Status:</span>
                      <div>
                        <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded border mt-0.5 ${getStatusBadge(detailRequest.status)}`}>
                          {formatStatusLabel(detailRequest.status)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Work Started:</span>
                      <p className="text-slate-800">
                        {detailRequest.started_at ? new Date(detailRequest.started_at).toLocaleString() : "Not started yet"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION TOOLBAR: Staff & Admin Contextual Actions */}
              <div className="p-4 bg-white border-2 border-forest/20 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-forest uppercase tracking-wider">
                  Available Actions
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {detailRequest.capabilities?.can_acknowledge && (
                    <button
                      type="button"
                      onClick={() => handleAcknowledge(detailRequest)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm"
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                      Acknowledge Assignment
                    </button>
                  )}

                  {detailRequest.capabilities?.can_start && (
                    <button
                      type="button"
                      onClick={() => handleStartWork(detailRequest)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-forest hover:bg-forest/90 rounded-lg shadow-sm"
                    >
                      <ClockIcon className="h-3.5 w-3.5" />
                      Start Work
                    </button>
                  )}

                  {detailRequest.capabilities?.can_update_progress && (
                    <button
                      type="button"
                      onClick={() => openProgressModal(detailRequest)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg"
                    >
                      <EditIcon className="h-3.5 w-3.5" />
                      Log Progress &amp; Evidence
                    </button>
                  )}

                  {detailRequest.capabilities?.can_submit_review && (
                    <button
                      type="button"
                      onClick={() => openSubmitReviewModal(detailRequest)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                    >
                      <CheckIcon className="h-3.5 w-3.5" />
                      Submit for Review
                    </button>
                  )}

                  {detailRequest.capabilities?.can_assign && (
                    <button
                      type="button"
                      onClick={() => openAssignModal(detailRequest)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-forest bg-forest/5 hover:bg-forest/10 border border-forest/20 rounded-lg"
                    >
                      <UsersIcon className="h-3.5 w-3.5" />
                      {detailRequest.assigned_to ? "Reassign" : "Assign"}
                    </button>
                  )}
                </div>
              </div>

              {/* Problem Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Problem Description
                </h4>
                <div className="p-3.5 bg-white border border-slate-200 rounded-lg text-slate-800 whitespace-pre-wrap">
                  {detailRequest.description}
                </div>
              </div>

              {/* Repair Notes & History Log */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Technician Work Notes &amp; Activity
                </h4>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {detailRequest.repair_notes || "No repair notes recorded yet."}
                </div>
              </div>

              {/* Attached Photos / Documents */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Attachments &amp; Evidence ({detailRequest.attachments?.length || 0})
                  </h4>
                </div>

                {detailRequest.attachments && detailRequest.attachments.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {detailRequest.attachments.map((att) => {
                      const isImage = att.file_type.startsWith("image/");
                      return (
                        <div
                          key={att.id}
                          className="group relative bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between"
                        >
                          {isImage ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImageUrl(att.url)}
                              className="block aspect-video w-full bg-slate-200 overflow-hidden relative"
                            >
                              <img
                                src={att.url}
                                alt={att.file_name}
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                            </button>
                          ) : (
                            <div className="aspect-video w-full bg-slate-100 flex items-center justify-center text-slate-400">
                              <span className="font-mono text-xs uppercase font-bold">📄 PDF</span>
                            </div>
                          )}

                          <div className="p-2">
                            <span className="block truncate text-[11px] font-medium text-slate-700" title={att.file_name}>
                              {att.file_name}
                            </span>
                            <div className="flex items-center justify-between mt-1 text-[10px]">
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-forest hover:underline font-semibold"
                              >
                                Download
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteAttachment(att.id)}
                                className="text-rose-500 hover:text-rose-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No attachments uploaded for this request.</p>
                )}
              </div>

              {/* Chronological Audit & History Timeline */}
              {detailRequest.history && detailRequest.history.length > 0 && (
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Assignment &amp; Status Change History
                  </h4>
                  <div className="space-y-3">
                    {detailRequest.history.map((h) => (
                      <div key={h.id} className="flex items-start gap-3 text-xs p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="p-1 rounded bg-forest/10 text-forest shrink-0 mt-0.5">
                          <ClockIcon className="h-3.5 w-3.5" />
                        </span>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 capitalize">
                              {h.action.replace(/_/g, " ")}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(h.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-slate-600">
                            By <strong className="text-slate-800">{h.user?.name || "System"}</strong> ({h.actor_role || h.user?.role || "Staff"})
                            {h.to_assigned_to && (
                              <span> &rarr; Assigned to <strong>{h.to_assigned_to.name}</strong></span>
                            )}
                          </p>
                          {h.notes && (
                            <p className="text-slate-700 italic bg-white p-2 rounded border border-slate-100 mt-1">
                              &ldquo;{h.notes}&rdquo;
                            </p>
                          )}
                          {h.changes_payload && Object.keys(h.changes_payload).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5 pt-1 border-t border-slate-200/60">
                              {Object.entries(h.changes_payload).map(([field, delta]: [string, any]) => {
                                const fieldLabel = field.replace(/_/g, " ");
                                if (field === "assigned_to") {
                                  return (
                                    <span key={field} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-sky-50 text-sky-800 border border-sky-200">
                                      <strong>Assignee:</strong> {delta.from_name || "Unassigned"} &rarr; {delta.to_name || "Unassigned"}
                                    </span>
                                  );
                                }
                                if (field === "cost_php") {
                                  return (
                                    <span key={field} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <strong>Cost:</strong> ₱{Number(delta.from || 0).toLocaleString()} &rarr; ₱{Number(delta.to || 0).toLocaleString()}
                                    </span>
                                  );
                                }
                                return (
                                  <span key={field} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                                    <strong className="capitalize">{fieldLabel}:</strong> {String(delta.from ?? "none")} &rarr; {String(delta.to ?? "none")}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  openEditModal(detailRequest);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <EditIcon className="h-3.5 w-3.5" />
                Edit Full Record
              </button>

              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOG PROGRESS MODAL */}
      {progressModalOpen && detailRequest && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-serif font-bold text-forest">Log Work Progress</h3>
              <button type="button" onClick={() => setProgressModalOpen(false)} className="p-1 text-slate-400">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleProgressSubmit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Progress Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe parts replaced, diagnostics, or work done..."
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={progressStatus}
                    onChange={(e) => setProgressStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Updated Cost (PHP)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={progressCostPhp}
                    onChange={(e) => setProgressCostPhp(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Attach Evidence Photos / Invoices
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    if (e.target.files) setProgressFiles(Array.from(e.target.files));
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-forest/10 file:text-forest"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setProgressModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={progressSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-forest rounded-lg disabled:opacity-50"
                >
                  {progressSubmitting ? "Saving..." : "Save Progress"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBMIT FOR REVIEW MODAL */}
      {submitReviewModalOpen && detailRequest && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-indigo-50">
              <h3 className="font-serif font-bold text-indigo-950">Submit Work for Completion Review</h3>
              <button type="button" onClick={() => setSubmitReviewModalOpen(false)} className="p-1 text-slate-400">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitReview} className="p-6 space-y-4 text-sm">
              <p className="text-xs text-slate-600">
                Your completion notes and attached proof will be submitted to the administrator for quality inspection and final sign-off.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Completion Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail final repairs done, testing performed, and verification that issue is resolved..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Final Incurred Cost (PHP)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={completionCostPhp}
                  onChange={(e) => setCompletionCostPhp(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Attach Completion Proof / Photos
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    if (e.target.files) setCompletionFiles(Array.from(e.target.files));
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-indigo-100 file:text-indigo-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSubmitReviewModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitReviewSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg disabled:opacity-50"
                >
                  {submitReviewSubmitting ? "Submitting..." : "Submit to Supervisor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPERVISOR REVIEW DECISION MODAL */}
      {reviewDecisionModalOpen && detailRequest && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className={`flex items-center justify-between px-6 py-4 border-b ${
              reviewAction === "approve" ? "bg-emerald-50 text-emerald-950" : "bg-amber-50 text-amber-950"
            }`}>
              <h3 className="font-serif font-bold">
                {reviewAction === "approve" ? "Confirm & Approve Completion" : "Request Revisions / Reject Work"}
              </h3>
              <button type="button" onClick={() => setReviewDecisionModalOpen(false)} className="p-1 text-slate-400">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleReviewDecisionSubmit} className="p-6 space-y-4 text-sm">
              <p className="text-xs text-slate-600">
                {reviewAction === "approve"
                  ? "Marking this request as Resolved confirms that maintenance work has been inspected and meets resort quality standards."
                  : "Rejecting this submission will return the task to In Progress status and notify the assigned technician with your feedback."}
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Supervisor Notes / Rationale {reviewAction === "reject" && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  required={reviewAction === "reject"}
                  rows={3}
                  placeholder={reviewAction === "approve" ? "Optional approval remarks..." : "State clearly what corrections are required..."}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReviewDecisionModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className={`px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 ${
                    reviewAction === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-700 hover:bg-amber-800"
                  }`}
                >
                  {reviewSubmitting ? "Processing..." : (reviewAction === "approve" ? "Confirm Approval" : "Send Back for Revision")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT REQUEST MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-forest/10 text-forest rounded-lg">
                  <WrenchIcon className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-serif font-bold text-forest">
                  {editingRequest ? `Edit Request — ${editingRequest.tracking_number}` : "New Maintenance Request"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
                  {formError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Issue Summary / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master bathroom water heater leaking"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                />
              </div>

              {/* Resource Type & Room */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Resource Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formResourceType}
                    onChange={(e) => {
                      const type = e.target.value as MaintenanceResourceType;
                      setFormResourceType(type);
                      if (type !== "room" && type !== "villa") {
                        setFormRoomId("");
                      }
                    }}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
                  >
                    <option value="room">Room</option>
                    <option value="villa">Villa</option>
                    <option value="facility">Facility</option>
                    <option value="equipment">Equipment</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {(formResourceType === "room" || formResourceType === "villa") && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Link Room / Accommodation
                    </label>
                    <select
                      value={formRoomId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setFormRoomId(id);
                        const match = rooms.find((r) => String(r.id) === id);
                        if (match && !formResourceName) {
                          setFormResourceName(match.name);
                        }
                      }}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
                    >
                      <option value="">-- Select accommodation --</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.category})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Resource Name & Specific Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Resource Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deluxe Villa 102 or Backup Generator #1"
                    value={formResourceName}
                    onChange={(e) => setFormResourceName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Specific Location / Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. West Wing, 2nd floor balcony"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                  />
                </div>
              </div>

              {/* Assignment & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assign to Technician / Staff
                  </label>
                  <select
                    value={formAssignedToUserId}
                    onChange={(e) => setFormAssignedToUserId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
                  >
                    <option value="">-- Leave Unassigned for now --</option>
                    {assignees.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} — {staff.role} {staff.department ? `(${staff.department})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Target Completion Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                  />
                </div>
              </div>

              {/* Priority, Status, Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as MaintenancePriority)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as MaintenanceStatus)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-forest/30"
                  >
                    <option value="reported">Reported</option>
                    <option value="assigned">Assigned</option>
                    <option value="acknowledged">Acknowledged</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="on_hold">On Hold</option>
                    <option value="resolved">Resolved</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cost in PHP (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formCostPhp}
                    onChange={(e) => setFormCostPhp(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                  />
                </div>
              </div>

              {/* Problem Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Problem Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail the issue observed, symptoms, or malfunction..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                />
              </div>

              {/* Repair Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Repair Notes / Actions Taken
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes from maintenance personnel, replacement parts used, contractor details..."
                  value={formRepairNotes}
                  onChange={(e) => setFormRepairNotes(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest"
                />
              </div>

              {/* Existing Attachments in Edit Mode */}
              {editingRequest && editingRequest.attachments && editingRequest.attachments.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Current Attachments ({editingRequest.attachments.length})
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {editingRequest.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="relative p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between"
                      >
                        <div className="truncate text-xs font-medium text-slate-700">
                          {att.file_name}
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 text-[11px]">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-forest hover:underline font-semibold"
                          >
                            View
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="text-rose-600 hover:text-rose-800"
                            title="Remove file"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Attachments */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Upload Supporting Photos / Documents (Images, PDFs up to 10MB)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-forest/10 file:text-forest hover:file:bg-forest/20"
                />

                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600">Pending upload:</span>
                    <ul className="text-xs text-slate-600 divide-y divide-slate-100">
                      {selectedFiles.map((file, idx) => (
                        <li key={idx} className="py-1 flex items-center justify-between">
                          <span className="truncate max-w-xs">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removePendingFile(idx)}
                            className="text-rose-500 hover:text-rose-700 text-[11px]"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-forest hover:bg-forest/90 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting && <RefreshIcon className="h-4 w-4 animate-spin" />}
                  {editingRequest ? "Save Changes" : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL FOR IMAGES */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImageUrl}
              alt="Attachment preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-white text-slate-800 rounded-full shadow-lg hover:bg-slate-100"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Delete Maintenance Request?</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this maintenance request, assignment history, and all associated files? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {isDeleting && <RefreshIcon className="h-4 w-4 animate-spin" />}
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PLACE ACCOMMODATION AVAILABILITY RESTRICTION MODAL
          ======================================================== */}
      {isRestrictionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-purple-50">
              <div className="flex items-center gap-2">
                <DoorIcon className="h-5 w-5 text-purple-700" />
                <h3 className="font-serif font-bold text-purple-950 text-base">
                  Place Accommodation Availability Restriction
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRestrictionModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRestrictionSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
              {restrError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
                  {restrError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Accommodation <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={restrRoomId}
                    onChange={(e) => {
                      const newRoomId = e.target.value;
                      setRestrRoomId(newRoomId);
                      triggerConflictScan(newRoomId, restrStartDate, restrEndDate, restrIsIndefinite, restrBlockedUnits);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  >
                    <option value="">-- Choose accommodation --</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Restriction Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={restrType}
                    onChange={(e: any) => setRestrType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  >
                    <option value="maintenance_block">Maintenance Block</option>
                    <option value="emergency_repair">Emergency Repair</option>
                    <option value="scheduled_renovation">Scheduled Renovation</option>
                    <option value="safety_hazard">Safety Hazard</option>
                    <option value="operational_hold">Operational Hold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Restriction Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Bathroom Leak Repair / Flooring Refurbishment"
                  value={restrTitle}
                  onChange={(e) => setRestrTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={restrStartDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setRestrStartDate(newStart);
                      triggerConflictScan(restrRoomId, newStart, restrEndDate, restrIsIndefinite, restrBlockedUnits);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    End Date {!restrIsIndefinite && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="date"
                    disabled={restrIsIndefinite}
                    value={restrEndDate}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      setRestrEndDate(newEnd);
                      triggerConflictScan(restrRoomId, restrStartDate, newEnd, restrIsIndefinite, restrBlockedUnits);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:bg-slate-100 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Blocked Units <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={restrBlockedUnits}
                    onChange={(e) => {
                      const newUnits = Math.max(1, parseInt(e.target.value) || 1);
                      setRestrBlockedUnits(newUnits);
                      triggerConflictScan(restrRoomId, restrStartDate, restrEndDate, restrIsIndefinite, newUnits);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="restrIsIndefinite"
                  checked={restrIsIndefinite}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setRestrIsIndefinite(checked);
                    triggerConflictScan(restrRoomId, restrStartDate, restrEndDate, checked, restrBlockedUnits);
                  }}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                />
                <label htmlFor="restrIsIndefinite" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Indefinite restriction (requires operational inspection to restore availability)
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason &amp; Scope of Work <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detailed rationale for taking this unit out of booking availability..."
                  value={restrReason}
                  onChange={(e) => setRestrReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-xs"
                />
              </div>

              {/* REAL-TIME CONFLICT SCAN CARD */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    {conflictScanning ? (
                      <RefreshIcon className="h-3.5 w-3.5 animate-spin text-purple-600" />
                    ) : (
                      <InfoIcon className="h-3.5 w-3.5 text-slate-500" />
                    )}
                    Live Existing Reservation Conflict Scan
                  </span>
                  {conflictResult && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        conflictResult.conflicts_detected
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : conflictResult.overlapping_count > 0
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      }`}
                    >
                      {conflictResult.conflicts_detected
                        ? "⚠️ Capacity Exceeded"
                        : conflictResult.overlapping_count > 0
                        ? `${conflictResult.overlapping_count} Overlap(s) within inventory`
                        : "✓ No Conflicting Bookings"}
                    </span>
                  )}
                </div>

                {conflictResult && conflictResult.overlapping_reservations.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <p className="text-xs text-amber-900 font-semibold">
                      {conflictResult.message}
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {conflictResult.overlapping_reservations.map((res) => (
                        <div
                          key={res.id}
                          className="p-2 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{res.booking_reference}</span>
                            <span className="text-slate-500 ml-2">&bull; {res.guest_name}</span>
                            <div className="text-[10px] text-slate-400">
                              Tel: {res.guest_phone || "N/A"} | Email: {res.guest_email || "N/A"}
                            </div>
                          </div>
                          <span className="font-mono text-[11px] text-slate-700">
                            {res.check_in} &rarr; {res.check_out}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Handling Protocol for Overlapping Bookings <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={restrHandlingProtocol}
                        onChange={(e) => setRestrHandlingProtocol(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                      >
                        <option value="manager_review_queued">Manager Review Queued (Retain bookings for manual inspection)</option>
                        <option value="relocate_guest_approved">Relocate Guest Approved (Operations approved accommodation upgrade)</option>
                        <option value="contact_guest_for_reschedule">Contact Guest for Reschedule / Modification</option>
                      </select>
                      <p className="text-[10px] text-slate-500 mt-1 italic">
                        Note: Placing this restriction will preserve existing reservations without corrupting guest data.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRestrictionModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={restrSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {restrSubmitting && <RefreshIcon className="h-4 w-4 animate-spin" />}
                  Place Availability Restriction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          CLEAR RESTRICTION / RESTORE AVAILABILITY MODAL
          ======================================================== */}
      {clearModalOpen && targetRestriction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-emerald-50">
              <div className="flex items-center gap-2">
                <CheckIcon className="h-5 w-5 text-emerald-700" />
                <h3 className="font-serif font-bold text-emerald-950 text-base">
                  Verify Clearance &amp; Restore Availability
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setClearModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleClearRestrictionSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <span className="font-mono font-bold text-purple-900">{targetRestriction.restriction_number}</span>
                <p className="font-semibold text-slate-800">{targetRestriction.title}</p>
                <p className="text-slate-600">
                  Accommodation: {targetRestriction.room?.name || `Room #${targetRestriction.room_id}`}
                </p>
                <p className="text-slate-500">
                  Blocked units to restore: <span className="font-bold text-forest">{targetRestriction.blocked_units}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Operational Inspection Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail the verified repairs, inspection results, and readiness for guest check-in..."
                  value={clearanceNotes}
                  onChange={(e) => setClearanceNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Update Accommodation Readiness Status
                </label>
                <select
                  value={clearanceRoomCondition}
                  onChange={(e: any) => setClearanceRoomCondition(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="inspected">Inspected &amp; Ready for Guests</option>
                  <option value="clean">Clean (Ready for Inspection)</option>
                  <option value="dirty">Dirty (Requires Housekeeping Turn-down)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1 italic">
                  Availability will immediately return to the public booking engine and reservation transactions upon confirmation.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setClearModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clearSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {clearSubmitting && <RefreshIcon className="h-4 w-4 animate-spin" />}
                  Confirm Operational Clearance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          CANCEL RESTRICTION MODAL
          ======================================================== */}
      {cancelModalOpen && cancelTargetRestriction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 text-xs sm:text-sm">
            <h3 className="text-base font-bold text-slate-900">
              Cancel Restriction {cancelTargetRestriction.restriction_number}?
            </h3>
            <p className="text-xs text-slate-600">
              Cancelling will release the inventory block without recording an operational clearance event.
            </p>

            <form onSubmit={handleCancelRestrictionSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Cancellation Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Reason for cancelling this restriction..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={cancelSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {cancelSubmitting && <RefreshIcon className="h-4 w-4 animate-spin" />}
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
