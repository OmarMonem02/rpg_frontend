const STORAGE_PREFIX = "rpg:ticket-pending-item-discount:";

function storageKey(ticketId: number) {
  return `${STORAGE_PREFIX}${ticketId}`;
}

export function readTicketPendingItemDiscountRequests(
  ticketId: number,
): Record<number, number> {
  if (typeof window === "undefined") return {};

  try {
    const raw = sessionStorage.getItem(storageKey(ticketId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    const next: Record<number, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const itemId = Number(key);
      if (itemId > 0 && value > 0) {
        next[itemId] = value;
      }
    }
    return next;
  } catch {
    return {};
  }
}

export function writeTicketPendingItemDiscountRequests(
  ticketId: number,
  map: Record<number, number>,
) {
  if (typeof window === "undefined") return;

  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(map)) {
    if (value > 0) {
      normalized[key] = value;
    }
  }

  const storageId = storageKey(ticketId);
  if (Object.keys(normalized).length === 0) {
    sessionStorage.removeItem(storageId);
    return;
  }

  sessionStorage.setItem(storageId, JSON.stringify(normalized));
}
