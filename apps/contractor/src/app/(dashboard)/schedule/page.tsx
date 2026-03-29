"use client";

import { useState } from "react";
import { createShift, cancelShift, goOnline, goOffline } from "@/lib/actions/scheduling";
import { toast } from "sonner";
import { Calendar, Clock, Power, Plus, Trash2 } from "lucide-react";

interface ShiftEntry {
  id: string;
  startTime: string;
  endTime: string;
  type: "recurring" | "one_off";
  status: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
  }
}

export default function SchedulePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);
  const [showNewShift, setShowNewShift] = useState(false);
  const [newShiftDate, setNewShiftDate] = useState("");
  const [newShiftStart, setNewShiftStart] = useState("09:00");
  const [newShiftEnd, setNewShiftEnd] = useState("17:00");
  const [toggling, setToggling] = useState(false);

  async function handleToggleOnline() {
    setToggling(true);
    try {
      if (isOnline) {
        await goOffline();
        setIsOnline(false);
        toast.success("You are now offline");
      } else {
        await goOnline();
        setIsOnline(true);
        toast.success("You are now online — auto-timeout in 2 hours");
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setToggling(false);
    }
  }

  async function handleCreateShift() {
    if (!newShiftDate) {
      toast.error("Please select a date");
      return;
    }
    const startTime = `${newShiftDate}T${newShiftStart}:00`;
    const endTime = `${newShiftDate}T${newShiftEnd}:00`;

    const result = await createShift({ startTime, endTime, type: "one_off" });
    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Shift created");
      setShifts((prev) => [
        ...prev,
        { id: result.shiftId!, startTime, endTime, type: "one_off", status: "scheduled" },
      ]);
      setShowNewShift(false);
    }
  }

  async function handleCancelShift(shiftId: string) {
    await cancelShift(shiftId);
    setShifts((prev) => prev.filter((s) => s.id !== shiftId));
    toast.success("Shift cancelled");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <button
          onClick={handleToggleOnline}
          disabled={toggling}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors ${
            isOnline
              ? "bg-[var(--color-success)] text-white hover:bg-[var(--color-success)]/90"
              : "bg-[var(--color-muted)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/80"
          }`}
        >
          <Power className="h-4 w-4" />
          {isOnline ? "Online" : "Go Online"}
        </button>
      </div>

      {isOnline && (
        <div className="rounded-lg border border-[var(--color-success)]/20 bg-[var(--color-success)]/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-success)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-success)]" />
            You are currently online and receiving task offers
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Auto-timeout after 2 hours of inactivity
          </p>
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <Calendar className="h-4 w-4" /> Upcoming Shifts
          </h2>
          <button
            onClick={() => setShowNewShift(!showNewShift)}
            className="flex items-center gap-1 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)]"
          >
            <Plus className="h-4 w-4" /> New Shift
          </button>
        </div>

        {showNewShift && (
          <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Date</label>
                <input
                  type="date"
                  value={newShiftDate}
                  onChange={(e) => setNewShiftDate(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Start Time</label>
                <select
                  value={newShiftStart}
                  onChange={(e) => setNewShiftStart(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">End Time</label>
                <select
                  value={newShiftEnd}
                  onChange={(e) => setNewShiftEnd(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleCreateShift}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)]"
              >
                Create Shift
              </button>
              <button
                onClick={() => setShowNewShift(false)}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {shifts.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-muted-foreground)]">
            No upcoming shifts scheduled. Create a shift or go online to start receiving tasks.
          </p>
        ) : (
          <div className="space-y-2">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(shift.startTime).toLocaleDateString()} ·{" "}
                      {new Date(shift.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                      {new Date(shift.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-xs capitalize text-[var(--color-muted-foreground)]">{shift.type.replace("_", " ")}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleCancelShift(shift.id)}
                  className="rounded-lg p-2 text-[var(--color-destructive)] hover:bg-[var(--color-muted)]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <h2 className="mb-4 font-semibold">Weekly Recurring Schedule</h2>
        <div className="grid gap-2">
          {DAYS.map((day, index) => (
            <div key={day} className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] p-3">
              <span className="w-24 text-sm font-medium">{day}</span>
              <span className="text-sm text-[var(--color-muted-foreground)]">Not configured</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
          Configure your recurring weekly schedule from the settings page.
        </p>
      </div>
    </div>
  );
}
