import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatScore } from "@/lib/svs/scoring";
import type { DayKey, Player, Submission } from "@/lib/svs/types";
import { DAYS } from "@/lib/svs/types";

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-xs text-mut">{label}</span>
      <span className="font-mono text-[12px] tabular-nums text-fg">{value}</span>
    </div>
  );
}

export function PlayerDetail({
  playerId,
  player,
  submission,
  scores,
  hours,
  onClose,
}: {
  playerId: string | null;
  player?: Player | undefined;
  submission?: Submission | undefined;
  scores?: Record<DayKey, number> | undefined;
  hours?: Record<DayKey, number[]> | undefined;
  onClose: () => void;
}) {
  const open = Boolean(playerId);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-panel border-line text-fg max-w-lg">
        <DialogHeader>
          <DialogTitle className="tracking-tight">
            {player?.name ?? playerId}
            <span className="ml-2 font-mono text-[11px] text-mut">
              {playerId} · {player?.alliance || "—"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {!submission ? (
          <p className="font-mono text-[11px] text-mut">No submission on file.</p>
        ) : (
          <div className="space-y-4">
            {DAYS.map((d) => (
              <div key={d.key} className="rounded-md ring-1 ring-line bg-panel2 px-3 py-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium">
                    {d.label} · {d.focus}
                  </p>
                  <span className="font-mono text-[11px] text-primary tabular-nums">
                    {scores ? formatScore(scores[d.key]) : "—"}
                  </span>
                </div>
                {d.key === "monday" && (
                  <>
                    <Row label="Requested" value={submission.requests_monday ? "Yes" : "No"} />
                    <Row label="Normal fire crystals" value={submission.mon_normal_fc} />
                    <Row label="Refined fire crystals" value={submission.mon_refined_fc} />
                    <Row label="Construction speedups (days)" value={submission.mon_speedup_days} />
                  </>
                )}
                {d.key === "tuesday" && (
                  <>
                    <Row label="Requested" value={submission.requests_tuesday ? "Yes" : "No"} />
                    <Row label="Fire crystal shards" value={submission.tue_shards} />
                    <Row label="Research speedups (days)" value={submission.tue_speedup_days} />
                  </>
                )}
                {d.key === "thursday" && (
                  <>
                    <Row label="Requested" value={submission.requests_thursday ? "Yes" : "No"} />
                    <Row label="Training speedups (days)" value={submission.thu_speedup_days} />
                  </>
                )}
                <Row
                  label="Preferred hours (UTC)"
                  value={
                    hours && hours[d.key].length
                      ? hours[d.key].map((h) => `${String(h).padStart(2, "0")}:00`).join(" ")
                      : "—"
                  }
                />
              </div>
            ))}
            {submission.comment ? (
              <div className="rounded-md ring-1 ring-line px-3 py-2.5">
                <p className="text-[10px] font-mono uppercase tracking-widest text-mut mb-1">
                  Comment
                </p>
                <p className="text-sm">{submission.comment}</p>
              </div>
            ) : null}
            <p className="font-mono text-[10px] text-mut">
              Submitted {new Date(submission.submitted_at).toISOString().replace("T", " ").slice(0, 16)} UTC
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
