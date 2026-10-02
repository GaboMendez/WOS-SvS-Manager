import express from 'express';
import cors from 'cors';
import * as db from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Players
app.get('/api/players', (_req, res) => {
  res.json(db.getPlayers());
});

app.post('/api/players', (req, res) => {
  db.upsertPlayer(req.body);
  res.json({ success: true });
});

app.delete('/api/players', (_req, res) => {
  db.deleteAllPlayers();
  res.json({ success: true });
});

// Submissions
app.get('/api/submissions', (_req, res) => {
  res.json(db.getSubmissions());
});

app.post('/api/submissions', (req, res) => {
  db.upsertSubmission(req.body);
  res.json({ success: true });
});

app.delete('/api/submissions', (_req, res) => {
  db.deleteAllSubmissions();
  res.json({ success: true });
});

// Appointments
app.get('/api/appointments', (_req, res) => {
  res.json(db.getAppointments());
});

app.get('/api/appointments/:day', (req, res) => {
  res.json(db.getAppointmentsByDay(req.params.day));
});

app.post('/api/appointments', (req, res) => {
  db.insertAppointment(req.body);
  res.json({ success: true });
});

app.patch('/api/appointments/:id', (req, res) => {
  db.updateAppointment(req.params.id, req.body);
  res.json({ success: true });
});

app.delete('/api/appointments/:id', (req, res) => {
  db.deleteAppointment(req.params.id);
  res.json({ success: true });
});

app.delete('/api/appointments', (_req, res) => {
  db.deleteAllAppointments();
  res.json({ success: true });
});

// Waitlist
app.get('/api/waitlist', (_req, res) => {
  res.json(db.getWaitlist());
});

app.get('/api/waitlist/:day', (req, res) => {
  res.json(db.getWaitlistByDay(req.params.day));
});

app.post('/api/waitlist', (req, res) => {
  db.insertWaitlist(req.body);
  res.json({ success: true });
});

app.delete('/api/waitlist/:id', (req, res) => {
  db.deleteWaitlist(req.params.id);
  res.json({ success: true });
});

app.delete('/api/waitlist', (_req, res) => {
  db.deleteAllWaitlist();
  res.json({ success: true });
});

// Settings
app.get('/api/settings', (_req, res) => {
  res.json(db.getSettings());
});

app.post('/api/settings', (req, res) => {
  db.upsertSettings(req.body);
  res.json({ success: true });
});

// Imports
app.get('/api/imports/latest', (_req, res) => {
  res.json(db.getLatestImport());
});

app.post('/api/imports', (req, res) => {
  db.insertImport(req.body);
  res.json({ success: true });
});

app.delete('/api/imports', (_req, res) => {
  db.deleteAllImports();
  res.json({ success: true });
});

// Clear all data
app.delete('/api/all', (_req, res) => {
  db.deleteAllAppointments();
  db.deleteAllWaitlist();
  db.deleteAllSubmissions();
  db.deleteAllPlayers();
  db.deleteAllImports();
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
