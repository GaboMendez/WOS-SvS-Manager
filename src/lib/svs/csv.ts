import Papa from "papaparse";
import type { Player, Submission } from "./types";

export type ParseWarning = { row: number; message: string };

export type ParsedImport = {
  players: Player[];
  submissions: Submission[];
  warnings: ParseWarning[];
  rowsRead: number;
  duplicatesDropped: number;
  counts: { monday: number; tuesday: number; thursday: number };
};

const yes = (v: string) => /^(y|yes|true|1)/i.test((v ?? "").trim());

const num = (v: string): number => {
  const cleaned = (v ?? "").replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

export function parseHours(v: string): number[] {
  if (!v) return [];
  const out: number[] = [];
  for (const part of v.split(/[,;/|]+/)) {
    const m = part.trim().match(/^(\d{1,2})/);
    if (!m) continue;
    const h = Number.parseInt(m[1] ?? "", 10);
    if (h >= 0 && h <= 23 && !out.includes(h)) out.push(h);
  }
  return out;
}

/** Splits raw CSV text into rows/columns for display (e.g. a preview table), no domain parsing. */
export function parseCsvRows(text: string): string[][] {
  const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  return (parsed.data ?? []).filter((r): r is string[] => Array.isArray(r));
}

/** Google Forms export: 17 columns, fixed order (see spec). */
export function parseCsv(text: string): ParsedImport {
  const parsed = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  const rows = (parsed.data ?? []).filter((r) => Array.isArray(r) && r.length > 1);
  const warnings: ParseWarning[] = [];

  // Drop header row if it looks like a header: either the timestamp column says so (English or
  // German Google Forms exports), or the player ID column isn't a plain number like real IDs are.
  const first = rows[0] ?? [];
  const hasHeader =
    /timestamp|zeitstempel/i.test(String(first[0] ?? "")) ||
    !/^\d+$/.test(String(first[2] ?? "").trim());
  const body = hasHeader ? rows.slice(1) : rows;

  const latest = new Map<string, { player: Player; submission: Submission }>();
  let duplicatesDropped = 0;

  body.forEach((r, i) => {
    const rowNo = i + (hasHeader ? 2 : 1);
    const c = (n: number) => String(r[n] ?? "").trim();
    const playerId = c(2);
    const name = c(1);
    if (!playerId) {
      warnings.push({ row: rowNo, message: "Missing player ID — row skipped" });
      return;
    }
    if (!name) warnings.push({ row: rowNo, message: "Missing player name" });

    const ts = c(0);
    const parsedTs = Date.parse(ts);
    if (!Number.isFinite(parsedTs)) {
      warnings.push({ row: rowNo, message: `Unreadable timestamp "${ts}" — treated as oldest` });
    }
    const submittedAt = Number.isFinite(parsedTs)
      ? new Date(parsedTs).toISOString()
      : new Date(0).toISOString();

    const submission: Submission = {
      player_id: playerId,
      submitted_at: submittedAt,
      requests_monday: yes(c(4)),
      mon_normal_fc: num(c(5)),
      mon_refined_fc: num(c(6)),
      mon_speedup_days: num(c(7)),
      mon_hours: parseHours(c(8)),
      requests_tuesday: yes(c(9)),
      tue_speedup_days: num(c(10)),
      tue_shards: num(c(11)),
      tue_hours: parseHours(c(12)),
      requests_thursday: yes(c(13)),
      thu_speedup_days: num(c(14)),
      thu_hours: parseHours(c(15)),
      comment: c(16),
    };

    if (submission.requests_monday && submission.mon_hours.length === 0)
      warnings.push({ row: rowNo, message: `${name || playerId}: wants Monday but gave no times` });
    if (submission.requests_tuesday && submission.tue_hours.length === 0)
      warnings.push({ row: rowNo, message: `${name || playerId}: wants Tuesday but gave no times` });
    if (submission.requests_thursday && submission.thu_hours.length === 0)
      warnings.push({ row: rowNo, message: `${name || playerId}: wants Thursday but gave no times` });

    const player: Player = { player_id: playerId, name: name || playerId, alliance: c(3) };
    const existing = latest.get(playerId);
    if (existing) {
      duplicatesDropped += 1;
      if (Date.parse(existing.submission.submitted_at) > Date.parse(submittedAt)) return;
    }
    latest.set(playerId, { player, submission });
  });

  const entries = [...latest.values()];
  return {
    players: entries.map((e) => e.player),
    submissions: entries.map((e) => e.submission),
    warnings,
    rowsRead: body.length,
    duplicatesDropped,
    counts: {
      monday: entries.filter((e) => e.submission.requests_monday).length,
      tuesday: entries.filter((e) => e.submission.requests_tuesday).length,
      thursday: entries.filter((e) => e.submission.requests_thursday).length,
    },
  };
}

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
