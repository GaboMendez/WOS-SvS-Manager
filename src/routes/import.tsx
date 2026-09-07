import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { parseCsv, type ParsedImport } from "@/lib/svs/csv";
import { useImportCsv, useRecompute } from "@/lib/svs/data";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Import sign-ups — SvS Prep Scheduler" },
      {
        name: "description",
        content: "Upload the Google Forms CSV export and review the parse summary before scheduling.",
      },
      { property: "og:title", content: "Import sign-ups — SvS Prep Scheduler" },
      {
        property: "og:description",
        content: "Upload the Google Forms CSV export of SvS Prep Week sign-ups.",
      },
    ],
  }),
  component: ImportPage,
});

function ImportPage() {
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [raw, setRaw] = useState("");
  const [filename, setFilename] = useState("");
  const importCsv = useImportCsv();
  const recompute = useRecompute();
  const navigate = useNavigate();

  async function onFile(file: File) {
    const text = await file.text();
    try {
      const result = parseCsv(text);
      setRaw(text);
      setFilename(file.name);
      setParsed(result);
    } catch (e) {
      toast.error("That file could not be read as a sign-up export.");
      console.error(e);
    }
  }

  function save() {
    if (!parsed) return;
    importCsv.mutate(
      { filename, raw, players: parsed.players, submissions: parsed.submissions },
      {
        onSuccess: () =>
          recompute.mutate(undefined, {
            onSuccess: (r) => {
              toast.success(`Saved · ${r.scheduled} appointments assigned`);
              navigate({ to: "/", search: { day: "monday" } });
            },
            onError: (e) => toast.error(e.message),
          }),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <AppShell>
      <div className="sticky top-0 z-20 bg-ink border-b border-line px-4 py-2.5 flex items-center gap-3">
        <h1 className="text-base font-semibold tracking-tight">Import sign-ups</h1>
        <span className="hidden sm:inline font-mono text-[11px] text-mut">
          GOOGLE FORMS CSV · 17 COLUMNS
        </span>
      </div>

      <div className="px-4 py-4 max-w-3xl space-y-4">
        <label className="block rounded-md ring-1 ring-line bg-panel px-4 py-8 text-center cursor-pointer hover:ring-primary/50 transition-colors">
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
          <p className="text-sm font-medium">Choose a CSV file</p>
          <p className="font-mono text-[11px] text-mut mt-1">
            Latest submission per player ID is kept · times read as UTC hours
          </p>
        </label>

        {parsed ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ["Rows read", parsed.rowsRead],
                ["Monday", parsed.counts.monday],
                ["Tuesday", parsed.counts.tuesday],
                ["Thursday", parsed.counts.thursday],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-md ring-1 ring-line bg-panel px-3 py-3">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-mut">{label}</p>
                  <p className="font-mono text-xl tabular-nums mt-1">{value}</p>
                </div>
              ))}
            </div>

            <p className="font-mono text-[11px] text-mut">
              {parsed.players.length} unique players · {parsed.duplicatesDropped} duplicate
              submissions dropped
            </p>

            <div className="rounded-md ring-1 ring-line bg-panel">
              <div className="px-3 py-2 border-b border-line flex items-center justify-between">
                <p className="text-sm font-medium">Validation warnings</p>
                <span className="font-mono text-[11px] text-warn">{parsed.warnings.length}</span>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-line">
                {parsed.warnings.length === 0 ? (
                  <p className="px-3 py-2 font-mono text-[11px] text-ok">No problems found.</p>
                ) : (
                  parsed.warnings.map((w, i) => (
                    <p key={i} className="px-3 py-1.5 font-mono text-[11px] text-mut">
                      row {w.row} · {w.message}
                    </p>
                  ))
                )}
              </div>
            </div>

            <button
              onClick={save}
              disabled={importCsv.isPending || recompute.isPending}
              className="text-sm font-medium px-4 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
            >
              {importCsv.isPending || recompute.isPending
                ? "Saving…"
                : "Save import and build schedule"}
            </button>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
