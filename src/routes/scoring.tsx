import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useRecompute, useSaveWeights, useWeights } from "@/lib/svs/data";
import { DEFAULT_WEIGHTS, type Weights } from "@/lib/svs/types";

export const Route = createFileRoute("/scoring")({
  head: () => ({
    meta: [
      { title: "Scoring weights — SvS Prep Scheduler" },
      {
        name: "description",
        content:
          "Edit the priority values for fire crystals, refined crystals, shards and speedups, then rebuild every day's schedule.",
      },
      { property: "og:title", content: "Scoring weights — SvS Prep Scheduler" },
      {
        property: "og:description",
        content: "Tune the priority formulas and recompute the SvS Prep Week schedule.",
      },
    ],
  }),
  component: ScoringPage,
});

const FIELDS: { key: keyof Weights; label: string; hint: string }[] = [
  { key: "normalFireCrystal", label: "Normal fire crystal", hint: "Monday · points each" },
  { key: "refinedFireCrystal", label: "Refined fire crystal", hint: "Monday · points each" },
  {
    key: "constructionSpeedupMinute",
    label: "Construction speedup minute",
    hint: "Monday · points per minute",
  },
  { key: "fireCrystalShard", label: "Fire crystal shard", hint: "Tuesday · points each" },
  {
    key: "researchSpeedupMinute",
    label: "Research speedup minute",
    hint: "Tuesday · points per minute",
  },
  {
    key: "daysToMinutes",
    label: "Days to minutes",
    hint: "Monday & Tuesday · conversion, 1 day = 1,440 minutes",
  },
  { key: "trainingSpeedupDay", label: "Training speedup day", hint: "Thursday · points per day" },
];

function ScoringPage() {
  const weights = useWeights();
  const save = useSaveWeights();
  const recompute = useRecompute();
  const [draft, setDraft] = useState<Weights>(DEFAULT_WEIGHTS);
  const isProductionReadOnly = import.meta.env.PROD;

  useEffect(() => {
    if (weights.data) setDraft(weights.data);
  }, [weights.data]);

  function apply() {
    if (isProductionReadOnly) return;

    save.mutate(draft, {
      onSuccess: () =>
        recompute.mutate(undefined, {
          onSuccess: (r) =>
            toast.success(
              `Weights saved · ${r.scheduled} appointments, ${r.waitlisted} waitlisted`,
            ),
          onError: (e) => toast.error(e.message),
        }),
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <AppShell>
      <div className="sticky top-0 z-20 bg-ink border-b border-line px-4 py-2.5 flex items-center gap-3">
        <h1 className="text-base font-semibold tracking-tight">Scoring weights</h1>
        <span className="hidden sm:inline font-mono text-[11px] text-mut">
          AFFECTS SLOT RANKING
        </span>
      </div>

      <div className="px-4 py-4 max-w-xl space-y-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="rounded-md ring-1 ring-line bg-panel px-3 py-2.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col justify-center">
                <label className="text-sm font-medium">{f.label}</label>
                <p className="font-mono text-[10px] text-mut mt-0.5">{f.hint}</p>
              </div>
              <input
                type="number"
                value={draft[f.key]}
                disabled={isProductionReadOnly}
                aria-disabled={isProductionReadOnly || undefined}
                onChange={(e) => setDraft({ ...draft, [f.key]: Number(e.target.value) || 0 })}
                className="w-32 bg-panel2 ring-1 ring-line rounded-md px-2.5 py-1.5 font-mono text-[13px] tabular-nums text-right outline-none focus:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
        ))}

        <div className="flex gap-2 pt-1">
          <button
            onClick={apply}
            disabled={isProductionReadOnly || save.isPending || recompute.isPending}
            aria-disabled={isProductionReadOnly || undefined}
            className="text-sm font-medium px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {save.isPending || recompute.isPending
              ? "Recomputing…"
              : isProductionReadOnly
                ? "Scoring locked in production"
                : "Save and recompute schedule"}
          </button>
          <button
            onClick={() => setDraft(DEFAULT_WEIGHTS)}
            disabled={isProductionReadOnly}
            aria-disabled={isProductionReadOnly || undefined}
            className="px-3 text-sm font-medium rounded-md ring-1 ring-line text-mut hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
          </button>
        </div>

        {isProductionReadOnly && (
          <p className="font-mono text-[11px] text-amber-400 pt-1">
            Scoring weights are read-only in production.
          </p>
        )}

        <p className="font-mono text-[11px] text-mut pt-2">
          Monday = fire crystals + refined fire crystals + construction speedups. <br></br>
          Tuesday = fire crystal shards + research speedups. <br></br> Thursday = training speedups.{" "}
          <br></br>
          <p className="font-mono text-[11px] text-amber-400/90 pt-1">
            Ties go to the earliest submission.
          </p>
        </p>
      </div>
    </AppShell>
  );
}
