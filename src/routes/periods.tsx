import { createFileRoute, useNavigate, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useClosePeriod, useCreatePeriod, useCurrentPeriod, usePeriods } from "@/lib/svs/data";

export const Route = createFileRoute("/periods")({
  head: () => ({
    meta: [
      { title: "History — SvS Prep Scheduler" },
      { name: "description", content: "View and manage historical SvS preparation periods." },
    ],
  }),
  component: PeriodsPage,
});

function PeriodsPage() {
  const navigate = useNavigate();
  const periods = usePeriods();
  const currentPeriod = useCurrentPeriod();
  const createPeriod = useCreatePeriod();
  const closePeriod = useClosePeriod();

  const [showCreate, setShowCreate] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState("");
  const [newPeriodMonth, setNewPeriodMonth] = useState(new Date().getMonth() + 1);
  const [newPeriodYear, setNewPeriodYear] = useState(new Date().getFullYear());

  const handleCreate = async () => {
    if (!newPeriodName.trim()) {
      toast.error("Please enter a period name");
      return;
    }
    try {
      await createPeriod.mutateAsync({
        name: newPeriodName,
        month: newPeriodMonth,
        year: newPeriodYear,
      });
      toast.success("Period created");
      setShowCreate(false);
      setNewPeriodName("");
    } catch (e) {
      toast.error(String(e));
    }
  };

  const handleClose = async (periodId: string) => {
    if (!confirm("Are you sure you want to close this period? Closed periods become read-only.")) {
      return;
    }
    try {
      await closePeriod.mutateAsync(periodId);
      toast.success("Period closed");
    } catch (e) {
      toast.error(String(e));
    }
  };

  const periodList = periods.data ?? [];
  const closedPeriods = periodList.filter(p => p.is_closed);
  const openPeriods = periodList.filter(p => !p.is_closed);

  return (
    <AppShell>
      <div className="sticky top-0 z-20 bg-ink border-b border-line px-4 py-2.5 flex items-center gap-3">
        <h1 className="text-base font-semibold tracking-tight">History</h1>
        <span className="hidden sm:inline font-mono text-[11px] text-mut">
          CLOSED PERIODS · READ ONLY
        </span>
      </div>

      <div className="px-4 py-4 max-w-3xl space-y-6">
        {/* Current Period Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Current Period</h2>
            {!currentPeriod.data && (
              <button
                onClick={() => setShowCreate(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground"
              >
                Create Period
              </button>
            )}
          </div>

          {currentPeriod.data ? (
            <div className="rounded-md ring-1 ring-primary bg-panel px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{currentPeriod.data.name}</p>
                  <p className="font-mono text-[11px] text-mut mt-0.5">
                    {currentPeriod.data.month}/{currentPeriod.data.year} · Active
                  </p>
                </div>
                <button
                  onClick={() => handleClose(currentPeriod.data!.id)}
                  disabled={closePeriod.isPending}
                  className="text-xs font-medium px-3 py-1.5 rounded-md ring-1 ring-warn text-warn hover:bg-warn/10"
                >
                  Close Period
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-md ring-1 ring-line bg-panel px-4 py-8 text-center">
              <p className="text-sm text-mut">
                No active period. Create one to start tracking data.
              </p>
            </div>
          )}
        </div>

        {/* Create Period Modal */}
        {showCreate && (
          <div className="rounded-md ring-1 ring-line bg-panel px-4 py-4">
            <h3 className="text-sm font-semibold mb-3">Create New Period</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-mut mb-1">Period Name</label>
                <input
                  type="text"
                  value={newPeriodName}
                  onChange={(e) => setNewPeriodName(e.target.value)}
                  placeholder="e.g., October 2024"
                  className="w-full px-3 py-2 rounded-md bg-panel2 border border-line text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-mut mb-1">Month</label>
                  <select
                    value={newPeriodMonth}
                    onChange={(e) => setNewPeriodMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-md bg-panel2 border border-line text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-mut mb-1">Year</label>
                  <select
                    value={newPeriodYear}
                    onChange={(e) => setNewPeriodYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-md bg-panel2 border border-line text-sm"
                  >
                    {[2023, 2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={createPeriod.isPending}
                  className="flex-1 text-sm font-medium px-4 py-2 rounded-md bg-primary text-primary-foreground"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-sm font-medium px-4 py-2 rounded-md ring-1 ring-line"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Closed Periods Section */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Closed Periods (Read Only)</h2>

          {closedPeriods.length === 0 ? (
            <div className="rounded-md ring-1 ring-line bg-panel px-4 py-8 text-center">
              <p className="text-sm text-mut">No closed periods yet.</p>
              <p className="font-mono text-[11px] text-mut mt-1">
                Close a period to archive its data for tracking.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {closedPeriods.map(period => (
                <div
                  key={period.id}
                  className="rounded-md ring-1 ring-line bg-panel px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{period.name}</p>
                    <p className="font-mono text-[11px] text-mut mt-0.5">
                      {period.month}/{period.year} · Closed {period.closed_at ? new Date(period.closed_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate({ to: "/periods/$periodId", params: { periodId: period.id }, search: { day: "monday" } })}
                    className="text-xs font-medium px-3 py-1.5 rounded-md ring-1 ring-line text-mut hover:text-fg"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open Periods Section */}
        {openPeriods.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-3">Other Open Periods</h2>
            <div className="space-y-2">
              {openPeriods.map(period => (
                <div
                  key={period.id}
                  className="rounded-md ring-1 ring-line bg-panel px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{period.name}</p>
                    <p className="font-mono text-[11px] text-mut mt-0.5">
                      {period.month}/{period.year} · Open
                    </p>
                  </div>
                  {period.id !== currentPeriod.data?.id ? (
                    <button
                      onClick={() => {
                        // Could implement switching current period here
                        toast.info("Switch period functionality coming soon");
                      }}
                      className="text-xs font-medium px-3 py-1.5 rounded-md ring-1 ring-line text-mut hover:text-fg"
                    >
                      Set Active
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-primary">Active</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Outlet />
    </AppShell>
  );
}
