import express from 'express';
import cors from 'cors';
import * as db from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Error handler middleware
const handleError = (fn: Function) => async (req: express.Request, res: express.Response) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: String(err) });
  }
};

// Players
app.get('/api/players', handleError(async (_req, res) => {
  const result = await db.getPlayers();
  res.json(result.rows);
}));

app.post('/api/players', handleError(async (req, res) => {
  await db.upsertPlayer(req.body);
  res.json({ success: true });
}));

app.delete('/api/players', handleError(async (_req, res) => {
  await db.deleteAllPlayers();
  res.json({ success: true });
}));

// Submissions
app.get('/api/submissions', handleError(async (_req, res) => {
  const result = await db.getSubmissions();
  res.json(result.rows);
}));

app.post('/api/submissions', handleError(async (req, res) => {
  await db.upsertSubmission(req.body);
  res.json({ success: true });
}));

app.delete('/api/submissions', handleError(async (_req, res) => {
  await db.deleteAllSubmissions();
  res.json({ success: true });
}));

// Appointments
app.get('/api/appointments', handleError(async (_req, res) => {
  const result = await db.getAppointments();
  res.json(result.rows);
}));

app.get('/api/appointments/:day', handleError(async (req, res) => {
  const result = await db.getAppointmentsByDay(req.params.day);
  res.json(result.rows);
}));

app.post('/api/appointments', handleError(async (req, res) => {
  await db.insertAppointment(req.body);
  res.json({ success: true });
}));

app.patch('/api/appointments/:id', handleError(async (req, res) => {
  await db.updateAppointment(req.params.id, req.body);
  res.json({ success: true });
}));

app.delete('/api/appointments/:id', handleError(async (req, res) => {
  await db.deleteAppointment(req.params.id);
  res.json({ success: true });
}));

app.delete('/api/appointments', handleError(async (_req, res) => {
  await db.deleteAllAppointments();
  res.json({ success: true });
}));

// Waitlist
app.get('/api/waitlist', handleError(async (_req, res) => {
  const result = await db.getWaitlist();
  res.json(result.rows);
}));

app.get('/api/waitlist/:day', handleError(async (req, res) => {
  const result = await db.getWaitlistByDay(req.params.day);
  res.json(result.rows);
}));

app.post('/api/waitlist', handleError(async (req, res) => {
  await db.insertWaitlist(req.body);
  res.json({ success: true });
}));

app.delete('/api/waitlist/:id', handleError(async (req, res) => {
  await db.deleteWaitlist(req.params.id);
  res.json({ success: true });
}));

app.delete('/api/waitlist', handleError(async (_req, res) => {
  await db.deleteAllWaitlist();
  res.json({ success: true });
}));

// Settings
app.get('/api/settings', handleError(async (_req, res) => {
  const settings = await db.getSettings();
  res.json(settings);
}));

app.post('/api/settings', handleError(async (req, res) => {
  await db.upsertSettings(req.body);
  res.json({ success: true });
}));

// Imports
app.get('/api/imports/latest', handleError(async (_req, res) => {
  const result = await db.getLatestImport();
  res.json(result.rows[0] || null);
}));

app.post('/api/imports', handleError(async (req, res) => {
  await db.insertImport(req.body);
  res.json({ success: true });
}));

app.delete('/api/imports', handleError(async (_req, res) => {
  await db.deleteAllImports();
  res.json({ success: true });
}));

// Clear all data
app.delete('/api/all', handleError(async (_req, res) => {
  await db.deleteAllAppointments();
  await db.deleteAllWaitlist();
  await db.deleteAllSubmissions();
  await db.deleteAllPlayers();
  await db.deleteAllImports();
  res.json({ success: true });
}));

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
