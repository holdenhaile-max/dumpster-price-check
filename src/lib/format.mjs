export const NOT_LISTED = "Not listed";
export const NOT_PUBLISHED = "Not published";
export const CALL_FOR_QUOTE = "Call for quote";

export function formatDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function checkedPhrase(iso) {
  return `Checked ${formatDate(iso)}`;
}

export function money(amount) {
  if (amount == null || Number.isNaN(amount)) return NOT_LISTED;
  const cents = Math.round(amount * 100) % 100;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function statusLabel(status) {
  if (status === "verified") return "Verified";
  if (status === "conflict") return "Sources disagree";
  if (status === "quote") return CALL_FOR_QUOTE;
  return "Unverified";
}
