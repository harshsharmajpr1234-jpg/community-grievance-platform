import { CLOSED_STATUSES, MAIN_FLOW, type ComplaintStatus } from "./constants";
import type { ComplaintUpdateDto } from "./types";

export type TimelineStep = { status: ComplaintStatus; state: "done" | "current" | "pending"; at: string | Date | null };

/**
 * Builds the visual lifecycle from status-change history. Statuses outside the
 * main flow (REJECTED, DUPLICATE, NEEDS_INFORMATION, CLOSED) are appended as a
 * terminal/side step so the resident always sees where the complaint stands.
 */
export function buildTimeline(updates: ComplaintUpdateDto[], currentStatus: ComplaintStatus): TimelineStep[] {
  const reached = new Map<ComplaintStatus, string | Date>();
  for (const u of updates) {
    if (u.newStatus && !reached.has(u.newStatus)) reached.set(u.newStatus, u.createdAt);
  }
  const currentIdx = MAIN_FLOW.indexOf(currentStatus);
  const isTerminalSide = !MAIN_FLOW.includes(currentStatus);
  const steps: TimelineStep[] = MAIN_FLOW.map((status, idx) => {
    const at = reached.get(status) ?? null;
    let state: TimelineStep["state"] = "pending";
    if (currentStatus === "RESOLVED" || currentStatus === "CLOSED") state = at || idx <= MAIN_FLOW.indexOf("RESOLVED") ? "done" : "pending";
    else if (idx < currentIdx || (at && idx !== currentIdx)) state = "done";
    if (idx === currentIdx) state = "current";
    if (isTerminalSide && at) state = "done";
    return { status, state, at };
  });
  if (isTerminalSide) {
    steps.push({ status: currentStatus, state: CLOSED_STATUSES.includes(currentStatus) ? "done" : "current", at: reached.get(currentStatus) ?? null });
  }
  return steps;
}
