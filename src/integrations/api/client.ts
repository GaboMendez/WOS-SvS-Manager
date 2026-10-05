const API_BASE = import.meta.env['VITE_API_URL'] || 'http://localhost:3001/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Helper to add period_id to URL if provided
function buildUrl(endpoint: string, periodId?: string): string {
  const base = `${API_BASE}${endpoint}`;
  if (periodId) {
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${base}${separator}period_id=${periodId}`;
  }
  return base;
}

// Periods
export interface Period {
  id: string;
  name: string;
  month: number;
  year: number;
  is_closed: number;
  created_at: string;
  closed_at: string | null;
}

export const api = {
  // Periods
  getPeriods: () => fetchJson<Period[]>(`${API_BASE}/periods`),
  getCurrentPeriod: () => fetchJson<Period | null>(`${API_BASE}/periods/current`),
  createPeriod: (period: { name: string; month: number; year: number }) =>
    fetchJson<{ success: boolean; id: string }>(`${API_BASE}/periods`, {
      method: 'POST',
      body: JSON.stringify(period),
    }),
  closePeriod: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/periods/${id}/close`, { method: 'POST' }),

  // Players
  getPlayers: (periodId?: string) => fetchJson<unknown[]>(buildUrl('/players', periodId)),

  insertPlayersBulk: (players: { player_id: string; name: string; alliance: string; updated_at: string }[], periodId?: string) =>
    fetchJson<{ success: boolean }>(buildUrl('/players/bulk', periodId), {
      method: 'POST',
      body: JSON.stringify(players),
    }),

  deleteAllPlayers: (periodId?: string) => fetchJson<{ success: boolean }>(buildUrl('/players', periodId), { method: 'DELETE' }),

  // Submissions
  getSubmissions: (periodId?: string) => fetchJson<unknown[]>(buildUrl('/submissions', periodId)),

  insertSubmissionsBulk: (submissions: {
    player_id: string;
    import_id?: string;
    comment?: string;
    requests_monday?: boolean;
    requests_tuesday?: boolean;
    requests_thursday?: boolean;
    mon_hours?: number[];
    mon_normal_fc?: number;
    mon_refined_fc?: number;
    mon_speedup_days?: number;
    tue_hours?: number[];
    tue_shards?: number;
    tue_speedup_days?: number;
    thu_hours?: number[];
    thu_speedup_days?: number;
    submitted_at: string;
  }[], periodId?: string) =>
    fetchJson<{ success: boolean }>(buildUrl('/submissions/bulk', periodId), {
      method: 'POST',
      body: JSON.stringify(submissions),
    }),

  deleteAllSubmissions: (periodId?: string) => fetchJson<{ success: boolean }>(buildUrl('/submissions', periodId), { method: 'DELETE' }),

  // Appointments
  getAppointments: (periodId?: string) => fetchJson<unknown[]>(buildUrl('/appointments', periodId)),

  getAppointmentsByDay: (day: string, periodId?: string) => fetchJson<unknown[]>(buildUrl(`/appointments/${day}`, periodId)),

  insertAppointment: (appointment: { id: string; day: string; slot: string; player_id: string; alliance: string; score: number }, periodId?: string) =>
    fetchJson<{ success: boolean }>(buildUrl('/appointments', periodId), {
      method: 'POST',
      body: JSON.stringify(appointment),
    }),

  insertAppointmentsBulk: (appointments: { id: string; day: string; slot: string; player_id: string; alliance: string; score: number }[], periodId?: string) =>
    fetchJson<{ success: boolean }>(buildUrl('/appointments/bulk', periodId), {
      method: 'POST',
      body: JSON.stringify(appointments),
    }),

  updateAppointment: (id: string, updates: { slot?: string; player_id?: string; alliance?: string; score?: number }, periodId?: string) =>
    fetchJson<{ success: boolean }>(buildUrl(`/appointments/${id}`, periodId), {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteAppointment: (id: string, periodId?: string) =>
    fetchJson<{ success: boolean }>(buildUrl(`/appointments/${id}`, periodId), { method: 'DELETE' }),

  deleteAllAppointments: (periodId?: string) => fetchJson<{ success: boolean }>(buildUrl('/appointments', periodId), { method: 'DELETE' }),

  // Waitlist
  getWaitlist: (periodId?: string) => fetchJson<unknown[]>(buildUrl('/waitlist', periodId)),

  getWaitlistByDay: (day: string, periodId?: string) => fetchJson<unknown[]>(buildUrl(`/waitlist/${day}`, periodId)),

  insertWaitlist: (entry: { id: string; day: string; player_id: string; alliance: string; score: number; reason?: string }, periodId?: string) =>
    fetchJson<{ success: boolean }>(buildUrl('/waitlist', periodId), {
      method: 'POST',
      body: JSON.stringify(entry),
    }),

  insertWaitlistBulk: (entries: { id: string; day: string; player_id: string; alliance: string; score: number; reason?: string }[], periodId?: string) =>
    fetchJson<{ success: boolean }>(buildUrl('/waitlist/bulk', periodId), {
      method: 'POST',
      body: JSON.stringify(entries),
    }),

  deleteWaitlist: (id: string, periodId?: string) =>
    fetchJson<{ success: boolean }>(buildUrl(`/waitlist/${id}`, periodId), { method: 'DELETE' }),

  deleteAllWaitlist: (periodId?: string) => fetchJson<{ success: boolean }>(buildUrl('/waitlist', periodId), { method: 'DELETE' }),

  // Settings
  getSettings: () => fetchJson<{ weights: unknown; updated_at: string } | null>(`${API_BASE}/settings`),

  upsertSettings: (settings: { id: number; weights: unknown; updated_at: string }) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/settings`, {
      method: 'POST',
      body: JSON.stringify(settings),
    }),

  // Imports
  getLatestImport: (periodId?: string) => fetchJson<unknown | null>(buildUrl('/imports/latest', periodId)),

  insertImport: (imp: { id: string; filename: string; raw_csv: string; row_count: number; created_at: string }, periodId?: string) =>
    fetchJson<{ success: boolean }>(buildUrl('/imports', periodId), {
      method: 'POST',
      body: JSON.stringify(imp),
    }),

  deleteAllImports: (periodId?: string) => fetchJson<{ success: boolean }>(buildUrl('/imports', periodId), { method: 'DELETE' }),

  // Clear all
  wipeAll: (periodId?: string) => fetchJson<{ success: boolean }>(buildUrl('/all', periodId), { method: 'DELETE' }),
};
