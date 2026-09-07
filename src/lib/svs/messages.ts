import type { Appointment, DayKey, Player } from "./types";

export type AllianceMessage = {
  alliance: string;
  index: number;
  total: number;
  count: number;
  text: string;
};

const DAY_HEADERS: Record<DayKey, string> = {
  monday: "Day 1 - Construction",
  tuesday: "Day 2 - Research",
  thursday: "Day 4 - Training",
};

/** 30 minutes after `slot`, wrapping past 23:30 back to 00:00. */
function slotEnd(slot: string): string {
  const [h = 0, m = 0] = slot.split(":").map(Number);
  const total = (h * 60 + m + 30) % (24 * 60);
  const eh = Math.floor(total / 60);
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

function entryFor(a: Appointment, name: string): string {
  return `${a.slot} - ${slotEnd(a.slot)} | ${name} [${a.player_id}]`;
}

function chunkHeader(
  day: DayKey,
  alliance: string,
  index: number | string,
  total: number | string,
): string {
  return `${DAY_HEADERS[day]}\n${alliance} [${index}/${total}]`;
}

/**
 * Greedily packs entries into chunks under `charLimit`. Uses a 2-digit placeholder for the
 * "[i/n]" header while packing so the real (shorter) header never pushes a finished chunk
 * over the limit.
 */
function packAlliance(
  day: DayKey,
  alliance: string,
  entries: string[],
  charLimit: number,
): string[][] {
  const headerLen = chunkHeader(day, alliance, "99", "99").length;
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentLen = headerLen;
  for (const entry of entries) {
    const addLen = entry.length + 1;
    if (current.length > 0 && currentLen + addLen > charLimit) {
      chunks.push(current);
      current = [];
      currentLen = headerLen;
    }
    current.push(entry);
    currentLen += addLen;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

/** Groups a day's appointments by alliance and splits each into copy-pasteable, size-limited messages. */
export function buildAllianceMessages(
  day: DayKey,
  appointments: Appointment[],
  playersById: Record<string, Player>,
  charLimit = 250,
): AllianceMessage[] {
  const byAlliance = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const key = a.alliance || "—";
    const list = byAlliance.get(key) ?? [];
    list.push(a);
    byAlliance.set(key, list);
  }

  const result: AllianceMessage[] = [];
  const alliances = [...byAlliance.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [alliance, appts] of alliances) {
    const sorted = [...appts].sort((a, b) => a.slot.localeCompare(b.slot));
    const entries = sorted.map((a) => entryFor(a, playersById[a.player_id]?.name ?? a.player_id));
    const chunks = packAlliance(day, alliance, entries, charLimit);
    chunks.forEach((chunk, i) => {
      result.push({
        alliance,
        index: i + 1,
        total: chunks.length,
        count: chunk.length,
        text: `${chunkHeader(day, alliance, i + 1, chunks.length)}\n${chunk.join("\n")}`,
      });
    });
  }
  return result;
}
