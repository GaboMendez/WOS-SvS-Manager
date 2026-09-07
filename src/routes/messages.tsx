import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { allianceToken, useRoster, useSchedule } from "@/lib/svs/data";
import { buildAllianceMessages } from "@/lib/svs/messages";
import type { DayKey } from "@/lib/svs/types";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Output messages — SvS Prep Scheduler" },
      {
        name: "description",
        content: "Copy-paste appointment lists grouped by alliance for R4/R5s to send to their chiefs.",
      },
      { property: "og:title", content: "Output messages — SvS Prep Scheduler" },
      {
        property: "og:description",
        content: "Per-alliance schedule messages, split to fit a 250 character limit.",
      },
    ],
  }),
  component: MessagesPage,
});

const DAY_OPTIONS: { key: DayKey; label: string }[] = [
  { key: "monday", label: "1 — Construction" },
  { key: "tuesday", label: "2 — Research" },
  { key: "thursday", label: "4 — Training" },
];

const CHAR_LIMIT = 250;

function MessagesPage() {
  const roster = useRoster();
  const schedule = useSchedule();
  const [day, setDay] = useState<DayKey>("monday");
  const [allianceFilter, setAllianceFilter] = useState("all");

  const appts = useMemo(
    () => (schedule.data?.appointments ?? []).filter((a) => a.day === day),
    [schedule.data, day],
  );
  const playersById = roster.data?.playersById ?? {};
  const messages = useMemo(
    () => buildAllianceMessages(day, appts, playersById, CHAR_LIMIT),
    [day, appts, playersById],
  );

  const allianceOptions = useMemo(
    () => [...new Set(messages.map((m) => m.alliance))].sort(),
    [messages],
  );
  const visibleMessages = useMemo(
    () =>
      allianceFilter === "all" ? messages : messages.filter((m) => m.alliance === allianceFilter),
    [messages, allianceFilter],
  );

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy — copy it manually instead");
    }
  }

  return (
    <AppShell>
      <div className="sticky top-0 z-20 bg-ink border-b border-line px-4 py-2.5 flex items-center gap-3">
        <h1 className="text-base font-semibold tracking-tight">Output messages</h1>
        <span className="hidden sm:inline font-mono text-[11px] text-mut">
          MAX {CHAR_LIMIT} CHARS
        </span>
      </div>

      <div className="px-4 py-3 border-b border-line flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-mut">Day</span>
          <select
            value={day}
            onChange={(e) => setDay(e.target.value as DayKey)}
            className="text-xs bg-panel ring-1 ring-line rounded-md px-2 py-1.5 outline-none focus:ring-primary/60"
          >
            {DAY_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-mut">Alliance</span>
          <select
            value={allianceFilter}
            onChange={(e) => setAllianceFilter(e.target.value)}
            className="text-xs bg-panel ring-1 ring-line rounded-md px-2 py-1.5 outline-none focus:ring-primary/60"
          >
            <option value="all">All</option>
            {allianceOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="px-4 py-4 flex flex-row flex-wrap items-start gap-3">
        {visibleMessages.length === 0 ? (
          <p className="font-mono text-[11px] text-mut">
            No appointments scheduled for this day yet.
          </p>
        ) : (
          visibleMessages.map((m) => (
            <div
              key={`${m.alliance}-${m.index}`}
              className="w-fit max-w-full rounded-md ring-1 ring-line bg-panel px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span
                  className="size-2 rounded-[2px] inline-block"
                  style={{ backgroundColor: `var(--color-${allianceToken(m.alliance)})` }}
                />
                <span className="text-sm font-medium">
                  {m.alliance} {m.index}/{m.total}
                </span>
                <span className="font-mono text-[11px] text-mut">{m.count} chiefs</span>
                <button
                  onClick={() => copy(m.text)}
                  className="ml-auto text-xs font-medium px-2.5 py-1 rounded-md ring-1 ring-line text-mut hover:text-fg"
                >
                  Copy
                </button>
              </div>
              <pre className="font-mono text-[12px] whitespace-pre text-fg overflow-x-auto">
                {m.text}
              </pre>
              <p className="mt-1.5 font-mono text-[10px] text-mut">{m.text.length} chars</p>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
