import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadCsv, parseCsv, parseCsvRows, type ParsedImport } from "@/lib/svs/csv";
import { useImportCsv, useLatestImport, useRecompute } from "@/lib/svs/data";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Import sign-ups — SvS Prep Scheduler" },
      {
        name: "description",
        content:
          "Upload the Google Forms CSV export and review the parse summary before scheduling.",
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
  const [showCsv, setShowCsv] = useState(false);
  const importCsv = useImportCsv();
  const recompute = useRecompute();
  const latestImport = useLatestImport();
  const navigate = useNavigate();
  const csvRows = useMemo(
    () => (latestImport.data ? parseCsvRows(latestImport.data.raw_csv) : []),
    [latestImport.data],
  );
  const csvHeader = csvRows[0] ?? [];
  const csvBody = csvRows.slice(1);

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
              setTimeout(() => {
                navigate({ to: "/" });
              }, 700);
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
        {latestImport.data ? (
          <div className="rounded-md ring-1 ring-line bg-panel px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">📊 View Collected Responses</p>
              <p className="font-mono text-[11px] text-mut mt-0.5">
                {latestImport.data.filename} · {latestImport.data.row_count} rows imported <br></br>
                {new Date(latestImport.data.created_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => setShowCsv(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-md ring-1 ring-line text-mut hover:text-fg whitespace-nowrap inline-flex items-center gap-1.5"
            >
              <Eye className="size-3.5" />
              View CSV
            </button>
            <button
              onClick={() =>
                downloadCsv(
                  latestImport.data!.filename || "collected-responses.csv",
                  latestImport.data!.raw_csv,
                )
              }
              className="text-xs font-medium px-3 py-1.5 rounded-md ring-1 ring-line text-mut hover:text-fg whitespace-nowrap inline-flex items-center gap-1.5"
            >
              <Download className="size-3.5" />
              Download CSV
            </button>
          </div>
        ) : null}

        <div className="rounded-md ring-1 ring-line bg-panel px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              📂 First time? Download sample SvS data to try it out
            </p>
            <p className="font-mono text-[11px] text-mut mt-0.5">
              Download the sample CSV, then drag it into the upload zone
            </p>
          </div>
          <a
            href="/sample-signup.csv"
            download
            className="text-xs font-medium px-3 py-1.5 rounded-md ring-1 ring-line text-mut hover:text-fg whitespace-nowrap inline-flex items-center gap-1.5"
          >
            <Download className="size-3.5" />
            Download sample CSV
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-md ring-1 ring-line bg-panel px-4 py-3">
            <p className="text-sm font-semibold tracking-tight">How it works</p>
            <ul className="mt-2 space-y-1.5 font-mono text-[11px] text-mut list-disc list-inside">
              <li>
                Only the latest submission per Player ID is kept — older duplicates are dropped.
              </li>
              <li>
                Each player gets a priority score for the day based on what they submitted (fire
                crystals, rfc, fc shards, speedups, etc.), weighted using the settings on the
                Scoring page.
              </li>
              <li>
                Players with higher scores get seated first. If their preferred time is taken by
                someone with a lower score, that person is moved to another time they also said
                works for them — so nobody loses their spot, they just might get a different one of
                their own preferred hours. Only if there's truly no open time left among a player's
                choices do they end up on the waitlist.
              </li>
              <li>
                Re-importing replaces all data; you can still adjust slots manually afterward.
              </li>
            </ul>
          </div>
          <div className="rounded-md ring-1 ring-line bg-panel px-4 py-3">
            <p className="text-sm font-semibold tracking-tight">How to use</p>
            <ol className="mt-2 space-y-1.5 font-mono text-[11px] text-mut list-decimal list-inside">
              <li>
                Export the "Formularantworten 1" sheet as a .csv from the Excel "Kopie von SVS Prep
                Signup Template (Antworten)" file <br></br>(File → Download → .csv).
              </li>
              <li>Choose that file in the upload zone below.</li>
              <li>Review the parse summary and any validation warnings.</li>
              <li>Click "Save import and build schedule" to store it and auto-assign slots.</li>
            </ol>
          </div>
        </div>

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
                  <p className="text-[10px] font-mono uppercase tracking-widest text-mut">
                    {label}
                  </p>
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

      <Dialog open={showCsv} onOpenChange={setShowCsv}>
        <DialogContent className="bg-panel border-line text-fg max-w-6xl">
          <DialogHeader>
            <DialogTitle className="tracking-tight">
              {latestImport.data?.filename}
              <span className="ml-2 font-mono text-[11px] text-mut">
                {latestImport.data?.row_count} rows
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded-md ring-1 ring-line bg-panel2">
            <table className="w-full border-collapse font-mono text-[11px]">
              <thead className="text-mut">
                <tr className="border-b border-line">
                  {csvHeader.map((cell, i) => (
                    <th
                      key={i}
                      className="text-left font-medium px-3 py-2 bg-panel2 sticky top-0 whitespace-pre-line min-w-[140px]"
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvBody.map((row, r) => (
                  <tr key={r} className="border-b border-line last:border-0 hover:bg-panel">
                    {row.map((cell, c) => (
                      <td key={c} className="px-3 py-1.5 text-fg align-top whitespace-pre-line">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
