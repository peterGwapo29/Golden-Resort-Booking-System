/**
 * Golden Resort Utility Helpers
 */

export function formatCurrency(amount: number | string | undefined | null): string {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount ?? 0);
  if (isNaN(num)) return "₱0.00";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "—";
  const cleanDate = typeof dateStr === "string" ? dateStr.split("T")[0] : "";
  const parts = cleanDate.split("-").map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    const [year, month, day] = parts;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
