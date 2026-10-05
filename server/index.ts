import express from 'express';
import cors from 'cors';
import * as db from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Error handler middleware
const handleError = (fn: (req: express.Request, res: express.Response) => Promise<void>) => async (req: express.Request, res: express.Response) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: String(err) });
  }
};

// Get current period ID from request or database
async function getPeriodId(req: express.Request): Promise<string | null> {
  // Check if period_id is provided in query
  const queryPeriodId = req.query.period_id as string | undefined;
  if (queryPeriodId) return queryPeriodId;

  // Get current period
  const result = await db.getCurrentPeriod();
  if (result.rows.length === 0) return null;
  return (result.rows[0] as { id: string }).id;
}

// ============ PERIODS ============

app.get('/api/periods', handleError(async (_req, res) => {
  const result = await db.getPeriods();
  res.json(result.rows);
}));

app.get('/api/periods/current', handleError(async (_req, res) => {
  const result = await db.getCurrentPeriod();
  res.json(result.rows[0] || null);
}));

app.post('/api/periods', handleError(async (req, res) => {
  const { name, month, year } = req.body;
  const id = crypto.randomUUID();
  await db.createPeriod({ id, name, month, year });
  res.json({ success: true, id });
}));

app.post('/api/periods/:id/close', handleError(async (req, res) => {
  await db.closePeriod(req.params.id);
  res.json({ success: true });
}));

// ============ PLAYERS ============

app.get('/api/players', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.json([]); return; }
  const result = await db.getPlayers(periodId);
  res.json(result.rows);
}));

app.post('/api/players/bulk', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.status(400).json({ error: 'No active period' }); return; }
  await db.insertPlayersBulk(periodId, req.body);
  res.json({ success: true });
}));

app.delete('/api/players', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.json({ success: true }); return; }
  await db.deleteAllPlayers(periodId);
  res.json({ success: true });
}));

// ============ SUBMISSIONS ============

app.get('/api/submissions', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.json([]); return; }
  const result = await db.getSubmissions(periodId);
  res.json(result.rows);
}));

app.post('/api/submissions/bulk', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.status(400).json({ error: 'No active period' }); return; }
  await db.insertSubmissionsBulk(periodId, req.body);
  res.json({ success: true });
}));

app.delete('/api/submissions', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.json({ success: true }); return; }
  await db.deleteAllSubmissions(periodId);
  res.json({ success: true });
}));

// ============ APPOINTMENTS ============

app.get('/api/appointments', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.json([]); return; }
  const result = await db.getAppointments(periodId);
  res.json(result.rows);
}));

app.get('/api/appointments/:day', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.json([]); return; }
  const result = await db.getAppointmentsByDay(periodId, req.params.day);
  res.json(result.rows);
}));

app.post('/api/appointments', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.status(400).json({ error: 'No active period' }); return; }
  await db.insertAppointment(periodId, req.body);
  res.json({ success: true });
}));

app.post('/api/appointments/bulk', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.status(400).json({ error: 'No active period' }); return; }
  await db.insertAppointmentsBulk(periodId, req.body);
  res.json({ success: true });
}));

app.patch('/api/appointments/:id', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.status(400).json({ error: 'No active period' }); return; }
  await db.updateAppointment(periodId, req.params.id, req.body);
  res.json({ success: true });
}));

app.delete('/api/appointments/:id', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.status(400).json({ error: 'No active period' }); return; }
  await db.deleteAppointment(periodId, req.params.id);
  res.json({ success: true });
}));

app.delete('/api/appointments', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.json({ success: true }); return; }
  await db.deleteAllAppointments(periodId);
  res.json({ success: true });
}));

// ============ WAITLIST ============

app.get('/api/waitlist', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.json([]); return; }
  const result = await db.getWaitlist(periodId);
  res.json(result.rows);
}));

app.get('/api/waitlist/:day', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.json([]); return; }
  const result = await db.getWaitlistByDay(periodId, req.params.day);
  res.json(result.rows);
}));

app.post('/api/waitlist', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.status(400).json({ error: 'No active period' }); return; }
  await db.insertWaitlist(periodId, req.body);
  res.json({ success: true });
}));

app.post('/api/waitlist/bulk', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.status(400).json({ error: 'No active period' }); return; }
  await db.insertWaitlistBulk(periodId, req.body);
  res.json({ success: true });
}));

app.delete('/api/waitlist/:id', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.status(400).json({ error: 'No active period' }); return; }
  await db.deleteWaitlist(periodId, req.params.id);
  res.json({ success: true });
}));

app.delete('/api/waitlist', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.json({ success: true }); return; }
  await db.deleteAllWaitlist(periodId);
  res.json({ success: true });
}));

// ============ SETTINGS ============

app.get('/api/settings', handleError(async (_req, res) => {
  const settings = await db.getSettings();
  res.json(settings);
}));

app.post('/api/settings', handleError(async (req, res) => {
  await db.upsertSettings(req.body);
  res.json({ success: true });
}));

// ============ IMPORTS ============

app.get('/api/imports/latest', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.json(null); return; }
  const result = await db.getLatestImport(periodId);
  res.json(result.rows[0] || null);
}));

app.post('/api/imports', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.status(400).json({ error: 'No active period' }); return; }
  await db.insertImport(periodId, req.body);
  res.json({ success: true });
}));

app.delete('/api/imports', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.json({ success: true }); return; }
  await db.deleteAllImports(periodId);
  res.json({ success: true });
}));

// ============ CLEAR ALL ============

app.delete('/api/all', handleError(async (req, res) => {
  const periodId = await getPeriodId(req);
  if (!periodId) { res.json({ success: true }); return; }
  await db.deleteAllAppointments(periodId);
  await db.deleteAllWaitlist(periodId);
  await db.deleteAllSubmissions(periodId);
  await db.deleteAllPlayers(periodId);
  await db.deleteAllImports(periodId);
  res.json({ success: true });
}));

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
