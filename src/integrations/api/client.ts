const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

// Players
export const api = {
  getPlayers: () => fetchJson<unknown[]>(`${API_BASE}/players`),

  insertPlayersBulk: (players: { player_id: string; name: string; alliance: string; updated_at: string }[]) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/players/bulk`, {
      method: 'POST',
      body: JSON.stringify(players),
    }),

  deleteAllPlayers: () => fetchJson<{ success: boolean }>(`${API_BASE}/players`, { method: 'DELETE' }),

  // Submissions
  getSubmissions: () => fetchJson<unknown[]>(`${API_BASE}/submissions`),

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
  }[]) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/submissions/bulk`, {
      method: 'POST',
      body: JSON.stringify(submissions),
    }),

  deleteAllSubmissions: () => fetchJson<{ success: boolean }>(`${API_BASE}/submissions`, { method: 'DELETE' }),

  // Appointments
  getAppointments: () => fetchJson<unknown[]>(`${API_BASE}/appointments`),

  getAppointmentsByDay: (day: string) => fetchJson<unknown[]>(`${API_BASE}/appointments/${day}`),

  insertAppointment: (appointment: { id: string; day: string; slot: string; player_id: string; alliance: string; score: number }) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/appointments`, {
      method: 'POST',
      body: JSON.stringify(appointment),
    }),

  insertAppointmentsBulk: (appointments: { id: string; day: string; slot: string; player_id: string; alliance: string; score: number }[]) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/appointments/bulk`, {
      method: 'POST',
      body: JSON.stringify(appointments),
    }),

  updateAppointment: (id: string, updates: { slot?: string; player_id?: string; alliance?: string; score?: number }) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deleteAppointment: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/appointments/${id}`, { method: 'DELETE' }),

  deleteAllAppointments: () => fetchJson<{ success: boolean }>(`${API_BASE}/appointments`, { method: 'DELETE' }),

  // Waitlist
  getWaitlist: () => fetchJson<unknown[]>(`${API_BASE}/waitlist`),

  getWaitlistByDay: (day: string) => fetchJson<unknown[]>(`${API_BASE}/waitlist/${day}`),

  insertWaitlist: (entry: { id: string; day: string; player_id: string; alliance: string; score: number; reason?: string }) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/waitlist`, {
      method: 'POST',
      body: JSON.stringify(entry),
    }),

  insertWaitlistBulk: (entries: { id: string; day: string; player_id: string; alliance: string; score: number; reason?: string }[]) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/waitlist/bulk`, {
      method: 'POST',
      body: JSON.stringify(entries),
    }),

  deleteWaitlist: (id: string) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/waitlist/${id}`, { method: 'DELETE' }),

  deleteAllWaitlist: () => fetchJson<{ success: boolean }>(`${API_BASE}/waitlist`, { method: 'DELETE' }),

  // Settings
  getSettings: () => fetchJson<{ weights: unknown; updated_at: string } | null>(`${API_BASE}/settings`),

  upsertSettings: (settings: { id: number; weights: unknown; updated_at: string }) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/settings`, {
      method: 'POST',
      body: JSON.stringify(settings),
    }),

  // Imports
  getLatestImport: () => fetchJson<unknown | null>(`${API_BASE}/imports/latest`),

  insertImport: (imp: { id: string; filename: string; raw_csv: string; row_count: number; created_at: string }) =>
    fetchJson<{ success: boolean }>(`${API_BASE}/imports`, {
      method: 'POST',
      body: JSON.stringify(imp),
    }),

  deleteAllImports: () => fetchJson<{ success: boolean }>(`${API_BASE}/imports`, { method: 'DELETE' }),

  // Clear all
  wipeAll: () => fetchJson<{ success: boolean }>(`${API_BASE}/all`, { method: 'DELETE' }),
};
