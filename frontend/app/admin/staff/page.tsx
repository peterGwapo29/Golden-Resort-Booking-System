"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "@/lib/admin-auth";
import {
  getAdminStaff,
  createAdminStaff,
  updateAdminStaff,
  toggleAdminStaffActive,
  resetAdminStaffPassword,
  type StaffMember,
  type StaffMetrics,
} from "@/lib/admin-api";
import {
  UsersIcon,
  SearchIcon,
  CheckIcon,
  CloseIcon,
  InfoIcon,
  PlusIcon,
  KeyIcon,
} from "@/components/ui/Icons";

const ROLE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  admin: {
    label: "Administrator",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    desc: "Full administrative access & system controls",
  },
  manager: {
    label: "Operations Manager",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    desc: "Oversees bookings, housekeeping, and front desk",
  },
  front_desk: {
    label: "Front Desk Reception",
    color: "bg-teal-100 text-teal-800 border-teal-200",
    desc: "Check-in/out, reservations & guest inquiries",
  },
  housekeeper: {
    label: "Housekeeping",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    desc: "Room readiness, cleanings & turn-downs",
  },
  maintenance: {
    label: "Maintenance",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    desc: "Technical repairs & room maintenance blocks",
  },
  staff: {
    label: "General Staff",
    color: "bg-stone-100 text-stone-800 border-stone-200",
    desc: "Base resort operations & task completion",
  },
};

export default function AdminStaffPage() {
  const { user: currentAdmin } = useAdminAuth();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [metrics, setMetrics] = useState<StaffMetrics>({
    total: 0,
    active: 0,
    deactivated: 0,
    roles: {},
  });
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [page, setPage] = useState(1);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [toggleStaff, setToggleStaff] = useState<StaffMember | null>(null);
  const [resetStaff, setResetStaff] = useState<StaffMember | null>(null);

  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add Form
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("front_desk");
  const [addPassword, setAddPassword] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addDept, setAddDept] = useState("");
  const [addNotes, setAddNotes] = useState("");

  // Edit Form
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("front_desk");
  const [editPhone, setEditPhone] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Password Reset Form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminStaff({
        search,
        role: roleFilter,
        status: statusFilter,
        page,
      });
      setStaff(res.data);
      setMetrics(res.metrics);
      setMeta(res.meta);
    } catch (err: any) {
      setError(err.message || "Failed to load staff accounts.");
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStaff();
  };

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAddPassword(pwd);
  };

  const handleOpenAdd = () => {
    setAddName("");
    setAddEmail("");
    setAddRole("front_desk");
    setAddPassword("");
    setAddPhone("");
    setAddDept("");
    setAddNotes("");
    setFormError(null);
    setShowAddModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await createAdminStaff({
        name: addName,
        email: addEmail,
        role: addRole,
        password: addPassword,
        phone: addPhone || undefined,
        department: addDept || undefined,
        notes: addNotes || undefined,
      });
      setActionSuccess(res.message);
      setShowAddModal(false);
      await fetchStaff();
    } catch (err: any) {
      setFormError(err.message || "Failed to create staff account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditRole(member.role);
    setEditPhone(member.phone || "");
    setEditDept(member.department || "");
    setEditNotes(member.notes || "");
    setFormError(null);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await updateAdminStaff(editingStaff.id, {
        name: editName,
        email: editEmail,
        role: editRole,
        phone: editPhone || undefined,
        department: editDept || undefined,
        notes: editNotes || undefined,
      });
      setActionSuccess(res.message);
      setEditingStaff(null);
      await fetchStaff();
    } catch (err: any) {
      setFormError(err.message || "Failed to update staff account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleConfirm = async () => {
    if (!toggleStaff) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await toggleAdminStaffActive(toggleStaff.id);
      setActionSuccess(res.message);
      setToggleStaff(null);
      await fetchStaff();
    } catch (err: any) {
      setError(err.message || "Failed to update account status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStaff) return;
    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await resetAdminStaffPassword(resetStaff.id, newPassword, confirmPassword);
      setActionSuccess(res.message);
      setResetStaff(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setFormError(err.message || "Failed to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentAdmin && currentAdmin.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-stone-200">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
          <InfoIcon className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-stone-800">Administrator Access Required</h2>
        <p className="text-xs text-stone-500 max-w-md mt-1">
          Staff account administration and role management is restricted to system administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif font-bold text-forest sm:text-3xl">
              Staff Accounts &amp; Access
            </h1>
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold/20 text-forest border border-gold/30">
              <UsersIcon className="w-3.5 h-3.5 text-forest" />
              RBAC Directory
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Create staff accounts, assign operational permissions, manage active statuses, and initiate password resets.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-forest hover:bg-forest-dark text-white rounded-xl text-xs font-semibold shadow-xs transition"
        >
          <PlusIcon className="w-4 h-4 text-gold" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
          <div className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
          <div className="flex items-center gap-2">
            <InfoIcon className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-[11px] font-semibold tracking-wider uppercase text-stone-500">
            Total Staff Directory
          </p>
          <p className="text-2xl font-serif font-bold text-forest mt-1 tabular-nums">
            {metrics.total.toLocaleString()}
          </p>
          <p className="text-[10px] text-stone-400 mt-0.5">All registered resort personnel</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-[11px] font-semibold tracking-wider uppercase text-emerald-700">
            Active Accounts
          </p>
          <p className="text-2xl font-serif font-bold text-emerald-600 mt-1 tabular-nums">
            {metrics.active.toLocaleString()}
          </p>
          <p className="text-[10px] text-emerald-700/70 mt-0.5">Authorized for portal login</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-[11px] font-semibold tracking-wider uppercase text-rose-700">
            Deactivated
          </p>
          <p className="text-2xl font-serif font-bold text-rose-600 mt-1 tabular-nums">
            {metrics.deactivated.toLocaleString()}
          </p>
          <p className="text-[10px] text-rose-700/70 mt-0.5">Access disabled &amp; sessions revoked</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <p className="text-[11px] font-semibold tracking-wider uppercase text-amber-700">
            Key Departments
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md font-semibold">
              Admin: {metrics.roles?.admin || 0}
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-teal-50 text-teal-700 rounded-md font-semibold">
              Front Desk: {metrics.roles?.front_desk || 0}
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-semibold">
              Housekeeping: {metrics.roles?.housekeeper || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff by name, email, phone, or department..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-forest focus:border-forest"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-forest text-white rounded-xl text-xs font-semibold hover:bg-forest-dark transition"
          >
            <SearchIcon className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-stone-100 text-xs">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-1">
              Filter by Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs focus:ring-1 focus:ring-forest"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrator</option>
              <option value="manager">Operations Manager</option>
              <option value="front_desk">Front Desk Reception</option>
              <option value="housekeeper">Housekeeping</option>
              <option value="maintenance">Maintenance</option>
              <option value="staff">General Staff</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase text-stone-500 mb-1">
              Account Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-stone-200 text-xs focus:ring-1 focus:ring-forest"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="deactivated">Deactivated Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-8 h-8 border-3 border-forest border-t-gold rounded-full animate-spin mb-3" />
            <p className="text-xs text-stone-500">Loading staff accounts directory...</p>
          </div>
        ) : staff.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-3">
              <UsersIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-stone-800">No Staff Accounts Found</h3>
            <p className="text-xs text-stone-500 max-w-sm mt-1">
              There are no staff accounts matching your current search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-[10px] uppercase font-bold tracking-wider text-stone-500 border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {staff.map((member) => {
                  const roleMeta = ROLE_LABELS[member.role] || {
                    label: member.role,
                    color: "bg-stone-100 text-stone-700 border-stone-200",
                    desc: "Staff member",
                  };

                  return (
                    <tr
                      key={member.id}
                      className={`hover:bg-stone-50/70 transition ${
                        !member.is_active ? "bg-rose-50/30 opacity-75" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-bold text-gold">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-semibold text-stone-900">{member.name}</p>
                            <p className="text-[10px] text-stone-400">
                              {member.department || "General Operations"} {member.phone && `• ${member.phone}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-stone-800">{member.email}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleMeta.color}`}
                          title={roleMeta.desc}
                        >
                          {roleMeta.label}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {member.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-stone-500 whitespace-nowrap text-[11px]">
                        {member.last_login_at
                          ? new Date(member.last_login_at).toLocaleString("en-PH", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Never"}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(member)}
                            className="px-2.5 py-1 border border-stone-200 hover:bg-stone-100 rounded-lg text-[10px] font-medium text-stone-700 transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResetStaff(member);
                              setNewPassword("");
                              setConfirmPassword("");
                              setFormError(null);
                            }}
                            className="px-2 py-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg text-[10px] font-medium transition"
                            title="Reset password"
                          >
                            Password
                          </button>
                          <button
                            type="button"
                            onClick={() => setToggleStaff(member)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition ${
                              member.is_active
                                ? "text-rose-600 hover:bg-rose-50"
                                : "text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {member.is_active ? "Deactivate" : "Reactivate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta.last_page > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-stone-200 bg-stone-50 text-xs">
            <span className="text-stone-500">
              Showing page <strong className="text-stone-800">{meta.current_page}</strong> of{" "}
              <strong className="text-stone-800">{meta.last_page}</strong> ({meta.total} total staff)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.current_page <= 1}
                className="px-3 py-1 rounded-lg border border-stone-200 bg-white font-medium text-stone-700 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                disabled={meta.current_page >= meta.last_page}
                className="px-3 py-1 rounded-lg border border-stone-200 bg-white font-medium text-stone-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-forest" />
                <h3 className="font-serif font-bold text-lg text-forest">Add Staff Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-forest focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="e.g. maria@goldenresort.com"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-forest focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                    System Role *
                  </label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-forest focus:outline-none"
                  >
                    <option value="admin">Administrator</option>
                    <option value="manager">Operations Manager</option>
                    <option value="front_desk">Front Desk</option>
                    <option value="housekeeper">Housekeeping</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="staff">General Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={addDept}
                    onChange={(e) => setAddDept(e.target.value)}
                    placeholder="e.g. Front Office"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-forest focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold uppercase text-stone-500">
                    Initial Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[10px] text-forest font-semibold hover:underline"
                  >
                    Generate Secure
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 font-mono focus:ring-2 focus:ring-forest focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  placeholder="e.g. +63 917 123 4567"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-forest focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-100 rounded-xl font-semibold text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-forest hover:bg-forest-dark text-white rounded-xl font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-lg text-forest">Edit Staff Profile</h3>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-forest focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-forest focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                    System Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-forest focus:outline-none"
                  >
                    <option value="admin">Administrator</option>
                    <option value="manager">Operations Manager</option>
                    <option value="front_desk">Front Desk</option>
                    <option value="housekeeper">Housekeeping</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="staff">General Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-forest focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-forest focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-100 rounded-xl font-semibold text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-forest hover:bg-forest-dark text-white rounded-xl font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate / Reactivate Confirmation Modal */}
      {toggleStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-2 text-forest">
              <InfoIcon className="w-5 h-5 text-amber-600 shrink-0" />
              <h3 className="font-serif font-bold text-lg">
                {toggleStaff.is_active ? "Deactivate Staff Account?" : "Reactivate Staff Account?"}
              </h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {toggleStaff.is_active ? (
                <>
                  Are you sure you want to deactivate{" "}
                  <strong className="text-stone-900">{toggleStaff.name}</strong> ({toggleStaff.email})?
                  This will immediately terminate all active sessions and block any API access.
                </>
              ) : (
                <>
                  Are you sure you want to restore access for{" "}
                  <strong className="text-stone-900">{toggleStaff.name}</strong>? They will be able to
                  log in using their existing credentials.
                </>
              )}
            </p>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setToggleStaff(null)}
                className="px-4 py-2 border border-stone-200 hover:bg-stone-100 rounded-xl font-semibold text-xs text-stone-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleConfirm}
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-xl font-semibold text-xs text-white shadow-xs ${
                  toggleStaff.is_active
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                } disabled:opacity-50`}
              >
                {isSubmitting
                  ? "Processing..."
                  : toggleStaff.is_active
                  ? "Confirm Deactivation"
                  : "Confirm Reactivation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyIcon className="w-5 h-5 text-forest" />
                <h3 className="font-serif font-bold text-lg text-forest">Reset Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setResetStaff(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Set a new secure password for <strong className="text-stone-800">{resetStaff.name}</strong>.
              All active sessions will be revoked.
            </p>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  New Password (min 8 chars) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-forest focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-forest focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setResetStaff(null)}
                  className="px-4 py-2 border border-stone-200 hover:bg-stone-100 rounded-xl font-semibold text-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-forest hover:bg-forest-dark text-white rounded-xl font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
