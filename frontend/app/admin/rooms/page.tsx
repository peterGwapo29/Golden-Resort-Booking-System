"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  getAdminRooms,
  createAdminRoom,
  updateAdminRoom,
  toggleAdminRoomActive,
  deleteAdminRoom,
  type PaginatedResult,
} from "@/lib/admin-api";
import { formatPhp } from "@/lib/booking-utils";
import {
  PlusIcon,
  SearchIcon,
  FilterIcon,
  EditIcon,
  TrashIcon,
  CloseIcon,
  InfoIcon,
} from "@/components/ui/Icons";
import DataTablesWrapper from "@/components/admin/DataTablesWrapper";

interface RoomFormData {
  name: string;
  slug: string;
  category: "room" | "suite" | "villa";
  tagline: string;
  description: string;
  long_description: string;
  nightly_rate_php: number;
  total_inventory: number;
  max_guests: number;
  adults_capacity: number;
  children_capacity: number;
  bed_configuration: string;
  size_sqm: number;
  view: string;
  amenities: string;
  image_alt: string;
}

const initialForm: RoomFormData = {
  name: "",
  slug: "",
  category: "room",
  tagline: "",
  description: "",
  long_description: "",
  nightly_rate_php: 5000,
  total_inventory: 1,
  max_guests: 2,
  adults_capacity: 2,
  children_capacity: 1,
  bed_configuration: "1 King Bed",
  size_sqm: 40,
  view: "Garden View",
  amenities: "Wi-Fi, Air Conditioning, Rainfall Shower",
  image_alt: "Resort room interior",
};

export default function AdminRoomsPage() {
  const [data, setData] = useState<PaginatedResult<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [formData, setFormData] = useState<RoomFormData>(initialForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingImageSrc, setExistingImageSrc] = useState<string>("");
  const [fileError, setFileError] = useState<string | null>(null);

  // Status Confirmation Modal State
  const [statusConfirmModalOpen, setStatusConfirmModalOpen] = useState(false);
  const [roomToToggle, setRoomToToggle] = useState<any | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [toggleStatusError, setToggleStatusError] = useState<string | null>(null);

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const res = await getAdminRooms({ search, category, status, page });
      setData(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [category, status, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRooms();
  };

  const handleClearSelectedFile = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setFileError("Supported formats: JPEG, PNG, or WebP.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setFileError("File size exceeds 5MB limit. Please choose a smaller image.");
      return;
    }

    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleOpenCreate = () => {
    setEditingRoomId(null);
    setFormData(initialForm);
    setSelectedFile(null);
    setPreviewUrl(null);
    setExistingImageSrc("");
    setFileError(null);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (room: any) => {
    setEditingRoomId(room.id);
    const existingSrc =
      room.featured_image?.src || room.featuredImage?.src || "";
    setExistingImageSrc(existingSrc);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileError(null);
    setFormData({
      name: room.name,
      slug: room.slug,
      category: room.category,
      tagline: room.tagline,
      description: room.description,
      long_description: Array.isArray(room.long_description)
        ? room.long_description.join("\n\n")
        : room.long_description || "",
      nightly_rate_php: room.nightly_rate_php,
      total_inventory: room.total_inventory,
      max_guests: room.max_guests,
      adults_capacity: room.adults_capacity,
      children_capacity: room.children_capacity,
      bed_configuration: room.bed_configuration,
      size_sqm: room.size_sqm,
      view: room.view,
      amenities: Array.isArray(room.amenities)
        ? room.amenities.join(", ")
        : room.amenities || "",
      image_alt:
        room.featured_image?.alt || room.featuredImage?.alt || "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formSubmitting) return;

    setFormSubmitting(true);
    setFormError(null);

    const formDataObj = new FormData();
    formDataObj.append("name", formData.name);
    formDataObj.append("slug", formData.slug);
    formDataObj.append("category", formData.category);
    formDataObj.append("tagline", formData.tagline);
    formDataObj.append("description", formData.description);

    const longDescArray = formData.long_description
      .split("\n\n")
      .map((p) => p.trim())
      .filter(Boolean);
    formDataObj.append("long_description", JSON.stringify(longDescArray));

    formDataObj.append("nightly_rate_php", String(formData.nightly_rate_php));
    formDataObj.append("total_inventory", String(formData.total_inventory));
    formDataObj.append("max_guests", String(formData.max_guests));
    formDataObj.append("adults_capacity", String(formData.adults_capacity));
    formDataObj.append("children_capacity", String(formData.children_capacity));
    formDataObj.append("bed_configuration", formData.bed_configuration);
    formDataObj.append("size_sqm", String(formData.size_sqm));
    formDataObj.append("view", formData.view);

    const amenitiesArray = formData.amenities
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    formDataObj.append("amenities", JSON.stringify(amenitiesArray));

    formDataObj.append("image_alt", formData.image_alt || formData.name);

    if (selectedFile) {
      formDataObj.append("image", selectedFile);
    }

    try {
      if (editingRoomId) {
        await updateAdminRoom(editingRoomId, formDataObj);
        setActionSuccess("Accommodation details updated successfully.");
      } else {
        await createAdminRoom(formDataObj);
        setActionSuccess("New accommodation created successfully.");
      }
      handleClearSelectedFile();
      setModalOpen(false);
      fetchRooms();
    } catch (err: any) {
      setFormError(err.message || "Failed to save accommodation.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenStatusModal = (room: any) => {
    setRoomToToggle(room);
    setToggleStatusError(null);
    setStatusConfirmModalOpen(true);
  };

  const handleConfirmToggleActive = async () => {
    if (!roomToToggle) return;
    setIsTogglingStatus(true);
    setToggleStatusError(null);

    try {
      const res = await toggleAdminRoomActive(roomToToggle.id);
      setActionSuccess(res.message);
      setStatusConfirmModalOpen(false);
      setRoomToToggle(null);
      fetchRooms();
    } catch (err: any) {
      setToggleStatusError(err.message || "Failed to update accommodation status.");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) {
      return;
    }

    try {
      await deleteAdminRoom(id);
      setActionSuccess(`"${name}" was deleted successfully.`);
      fetchRooms();
    } catch (err: any) {
      alert(err.message || "Could not delete accommodation.");
    }
  };

  const tableColumns = [
    { title: "Accommodation", data: "name", name: "accommodation" },
    { title: "Category", data: "category", name: "category" },
    { title: "Nightly Rate", data: "nightly_rate_php", name: "rate" },
    { title: "Inventory Units", data: "total_inventory", name: "inventory" },
    { title: "Max Guests", data: "max_guests", name: "guests" },
    { title: "Status", data: "is_active", name: "status" },
    { title: "Actions", data: null, name: "actions", orderable: false },
  ];

  const tableSlots = {
    accommodation: (_cellData: any, rowData: any) => {
      const fallbackUrl =
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80";
      const imgSrc =
        rowData.featured_image?.src ||
        rowData.featuredImage?.src ||
        rowData.image_url ||
        fallbackUrl;

      return (
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={rowData.name || "Room"}
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.failed) {
                  target.dataset.failed = "true";
                  target.src = fallbackUrl;
                }
              }}
            />
          </div>
          <div>
            <p className="font-serif text-base font-semibold text-forest">
              {rowData.name}
            </p>
            <p className="text-xs text-muted font-mono">{rowData.slug}</p>
          </div>
        </div>
      );
    },
    category: (cellData: any) => (
      <span className="uppercase text-xs font-semibold text-muted tracking-wider">
        {cellData}
      </span>
    ),
    rate: (cellData: any) => (
      <span className="font-semibold text-forest tabular-nums">
        {formatPhp(cellData)}
      </span>
    ),
    inventory: (cellData: any) => (
      <span className="text-xs font-medium text-ink tabular-nums">
        {cellData} Units
      </span>
    ),
    guests: (_cellData: any, rowData: any) => (
      <span className="text-xs text-muted tabular-nums">
        {rowData.max_guests} Guests ({rowData.adults_capacity}A / {rowData.children_capacity}C)
      </span>
    ),
    status: (cellData: any, rowData: any) => {
      const active = Boolean(cellData ?? rowData.is_active);
      return (
        <button
          type="button"
          onClick={() => handleOpenStatusModal(rowData)}
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            active
              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 focus-visible:ring-emerald-500"
              : "bg-slate-200 text-slate-800 hover:bg-slate-300 focus-visible:ring-slate-400"
          }`}
          title="Click to change status"
        >
          {active ? "Active" : "Inactive"}
        </button>
      );
    },
    actions: (_cellData: any, rowData: any) => (
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => handleOpenEdit(rowData)}
          className="rounded-lg p-1.5 text-forest hover:bg-forest/5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
          title="Edit Accommodation"
        >
          <EditIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => handleDelete(rowData.id, rowData.name)}
          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          title="Delete Accommodation"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      {/* Title & Create Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-semibold tracking-wider text-gold uppercase">
            Inventory &amp; Rates
          </span>
          <h2 className="font-serif text-3xl font-medium text-forest sm:text-4xl">
            Accommodations Management
          </h2>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-forest-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
        >
          <PlusIcon className="h-4 w-4 text-gold" />
          Add New Accommodation
        </button>
      </div>

      {actionSuccess && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-medium text-emerald-900">
          <span>{actionSuccess}</span>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or slug..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-ink focus:border-gold focus:bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-forest px-4 py-2 text-xs font-medium text-white hover:bg-forest-dark"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <FilterIcon className="h-3.5 w-3.5 text-forest" />
            <span>Category:</span>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-ink focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="room">Rooms</option>
              <option value="suite">Suites</option>
              <option value="villa">Villas</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span>Status:</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-ink focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accommodations DataTable */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden p-4">
        {isLoading && !data ? (
          <div className="py-20 text-center text-sm text-muted">
            <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading accommodations...
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">
            No accommodations match the specified filters.
          </div>
        ) : (
          <DataTablesWrapper
            data={data.data}
            columns={tableColumns}
            slots={tableSlots}
            options={{
              pageLength: 10,
              order: [[0, "asc"]],
            }}
          />
        )}
      </div>

      {/* Accommodation Status Confirmation Modal */}
      {statusConfirmModalOpen && roomToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-ivory-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <InfoIcon className="h-5 w-5 text-gold" />
                <h3 className="font-serif text-xl font-bold text-forest">
                  Confirm Status Change
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isTogglingStatus) {
                    setStatusConfirmModalOpen(false);
                    setRoomToToggle(null);
                  }
                }}
                disabled={isTogglingStatus}
                className="text-muted hover:text-ink disabled:opacity-40"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {toggleStatusError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900">
                <InfoIcon className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <p>{toggleStatusError}</p>
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50 border border-ivory-200">
                <div className="relative h-12 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      roomToToggle.featured_image?.src ||
                      roomToToggle.featuredImage?.src ||
                      roomToToggle.image_url ||
                      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80"
                    }
                    alt={roomToToggle.name || "Room"}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.dataset.failed) {
                        target.dataset.failed = "true";
                        target.src = "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80";
                      }
                    }}
                  />
                </div>
                <div>
                  <p className="font-serif font-bold text-forest text-sm">
                    {roomToToggle.name}
                  </p>
                  <span className="text-[0.7rem] uppercase tracking-wider text-muted font-semibold">
                    {roomToToggle.category} • {formatPhp(roomToToggle.nightly_rate_php)}/night
                  </span>
                </div>
              </div>

              {/* Status Transition Preview */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted font-medium">Current Status:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-semibold uppercase text-[0.65rem] tracking-wider ${
                      Boolean(roomToToggle.is_active)
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {Boolean(roomToToggle.is_active) ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-forest font-semibold">Proposed Status:</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-semibold uppercase text-[0.65rem] tracking-wider ${
                      !Boolean(roomToToggle.is_active)
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {!Boolean(roomToToggle.is_active) ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Explanatory Context */}
              <p className="text-xs text-stone-600 leading-relaxed">
                {Boolean(roomToToggle.is_active)
                  ? "Deactivating this accommodation will immediately remove it from public availability search and booking. Existing reservations for this accommodation will remain completely safe and unaffected."
                  : "Activating this accommodation will make it immediately visible and bookable by guests on the public Golden Resort website."}
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={isTogglingStatus}
                onClick={() => {
                  setStatusConfirmModalOpen(false);
                  setRoomToToggle(null);
                }}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 disabled:opacity-40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isTogglingStatus}
                onClick={handleConfirmToggleActive}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  Boolean(roomToToggle.is_active)
                    ? "bg-amber-700 hover:bg-amber-800 focus-visible:ring-amber-500"
                    : "bg-forest hover:bg-forest-dark focus-visible:ring-gold"
                }`}
              >
                {isTogglingStatus ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating Status...
                  </>
                ) : Boolean(roomToToggle.is_active) ? (
                  "Deactivate Accommodation"
                ) : (
                  "Activate Accommodation"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-serif text-2xl font-medium text-forest">
                {editingRoomId ? "Edit Accommodation" : "Add New Accommodation"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-muted hover:text-ink"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900">
                <InfoIcon className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-6 space-y-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-forest uppercase">
                    Accommodation Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
                      setFormData((prev) => ({
                        ...prev,
                        name,
                        slug: editingRoomId ? prev.slug : slug,
                      }));
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                    placeholder="e.g. Honeymoon Seaview Villa"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-forest uppercase">
                    URL Slug (Unique)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-ink focus:border-gold focus:outline-none"
                    placeholder="e.g. honeymoon-seaview-villa"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block font-semibold text-forest uppercase">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as any,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  >
                    <option value="room">Room</option>
                    <option value="suite">Suite</option>
                    <option value="villa">Villa</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-forest uppercase">
                    Nightly Rate (PHP)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.nightly_rate_php}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nightly_rate_php: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-forest focus:border-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-forest uppercase">
                    Inventory Units
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.total_inventory}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total_inventory: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-forest uppercase">
                  Tagline
                </label>
                <input
                  type="text"
                  required
                  value={formData.tagline}
                  onChange={(e) =>
                    setFormData({ ...formData, tagline: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  placeholder="e.g. An exclusive sanctuary designed for romance"
                />
              </div>

              <div>
                <label className="block font-semibold text-forest uppercase">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  placeholder="A concise 1-2 sentence overview for cards"
                />
              </div>

              <div>
                <label className="block font-semibold text-forest uppercase">
                  Long Detailed Description
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.long_description}
                  onChange={(e) =>
                    setFormData({ ...formData, long_description: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  placeholder="Full narrative paragraphs (separate paragraphs with blank lines)"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block font-semibold text-forest uppercase">
                    Max Total Guests
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.max_guests}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_guests: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-forest uppercase">
                    Adults Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.adults_capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        adults_capacity: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-forest uppercase">
                    Children Capacity
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.children_capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        children_capacity: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block font-semibold text-forest uppercase">
                    Bed Configuration
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bed_configuration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bed_configuration: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                    placeholder="e.g. 1 King Bed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-forest uppercase">
                    Size (sq.m.)
                  </label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={formData.size_sqm}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        size_sqm: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-forest uppercase">
                    View
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.view}
                    onChange={(e) =>
                      setFormData({ ...formData, view: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                    placeholder="e.g. Garden &amp; Pool"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-forest uppercase">
                  Amenities (comma-separated)
                </label>
                <input
                  type="text"
                  required
                  value={formData.amenities}
                  onChange={(e) =>
                    setFormData({ ...formData, amenities: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  placeholder="e.g. High-speed Wi-Fi, Private Veranda, Espresso Machine"
                />
              </div>

              <div>
                <label className="block font-semibold text-forest uppercase mb-1">
                  Featured Accommodation Image
                </label>
                <div className="rounded-xl border border-slate-200 bg-ivory-50/50 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Thumbnail preview */}
                    {(previewUrl || existingImageSrc) ? (
                      <div className="relative w-28 h-20 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white shadow-2xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl || existingImageSrc}
                          alt="Accommodation preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.failed && !previewUrl) {
                              target.dataset.failed = "true";
                              target.src = "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80";
                            }
                          }}
                        />
                        {previewUrl && (
                          <span className="absolute top-1 left-1 bg-forest text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                            New
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-28 h-20 shrink-0 rounded-lg border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-stone-400">
                        <span className="text-[10px] uppercase font-semibold">No Image</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center px-3.5 py-1.5 rounded-lg border border-forest text-xs font-semibold text-forest bg-white hover:bg-forest hover:text-white transition cursor-pointer shadow-xs focus-within:ring-2 focus-within:ring-gold">
                          <span>
                            {selectedFile
                              ? "Change Image File"
                              : existingImageSrc
                              ? "Replace Existing Image"
                              : "Choose Image File"}
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileChange}
                            className="sr-only"
                          />
                        </label>
                        {selectedFile && (
                          <button
                            type="button"
                            onClick={handleClearSelectedFile}
                            className="text-xs text-rose-700 hover:text-rose-900 underline font-medium cursor-pointer"
                          >
                            Clear Selection
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {selectedFile ? (
                          <span className="text-forest font-semibold">
                            Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                          </span>
                        ) : existingImageSrc ? (
                          <span>Current image is saved on file. Choose a new file to replace it.</span>
                        ) : (
                          <span>Upload JPEG, PNG, or WebP. Maximum file size: 5MB.</span>
                        )}
                      </p>
                      {fileError && (
                        <p className="text-xs text-rose-600 font-semibold">{fileError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-forest uppercase">
                  Image Alt Description
                </label>
                <input
                  type="text"
                  required
                  value={formData.image_alt}
                  onChange={(e) =>
                    setFormData({ ...formData, image_alt: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
                  placeholder="e.g. Deluxe Garden Room with king bed and veranda overlooking lush greenery"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-stone-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="rounded-xl bg-forest px-6 py-2.5 text-xs font-semibold text-white hover:bg-forest-dark disabled:opacity-50 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
                >
                  {formSubmitting
                    ? "Saving..."
                    : editingRoomId
                    ? "Update Accommodation"
                    : "Create Accommodation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
