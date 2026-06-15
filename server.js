const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'leads.json');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-token';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
}

function loadLeads() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveLeads(leads) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), 'utf8');
}

function createLeadId() {
  return `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (token === ADMIN_TOKEN) {
    return next();
  }

  return res.status(401).json({ error: 'Admin access required' });
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({ token: ADMIN_TOKEN });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/api/leads', authMiddleware, (req, res) => {
  const { status, search } = req.query;
  let leads = loadLeads();

  if (status && status !== 'all') {
    leads = leads.filter((lead) => lead.status === status);
  }

  const searchTerm = String(search || '').trim().toLowerCase();
  if (searchTerm) {
    leads = leads.filter((lead) => {
      const haystack = [lead.name, lead.email, lead.phone, lead.source, lead.status, lead.followUpDate]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(searchTerm);
    });
  }

  leads.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  res.json(leads);
});

app.get('/api/analytics', authMiddleware, (req, res) => {
  const leads = loadLeads();
  const byStatus = { new: 0, contacted: 0, converted: 0 };

  leads.forEach((lead) => {
    if (byStatus[lead.status] !== undefined) {
      byStatus[lead.status] += 1;
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueFollowUps = leads.filter(
    (lead) => lead.status !== 'converted' && lead.followUpDate && new Date(lead.followUpDate) < today
  ).length;
  const pendingFollowUps = leads.filter((lead) => lead.status !== 'converted' && lead.followUpDate).length;
  const conversionRate = leads.length ? Math.round((byStatus.converted / leads.length) * 100) : 0;

  res.json({
    total: leads.length,
    byStatus,
    overdueFollowUps,
    pendingFollowUps,
    conversionRate
  });
});

app.post('/api/leads', authMiddleware, (req, res) => {
  const { name, email, phone = '', source = 'Website Contact Form', status = 'new', followUpDate = '', note = '' } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const leads = loadLeads();
  const newLead = {
    id: createLeadId(),
    name,
    email,
    phone,
    source,
    status,
    followUpDate,
    notes: note ? [{ text: note, createdAt: new Date().toISOString() }] : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  leads.unshift(newLead);
  saveLeads(leads);
  res.status(201).json(newLead);
});

app.put('/api/leads/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const leads = loadLeads();
  const index = leads.findIndex((lead) => lead.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const lead = leads[index];
  const updates = { ...req.body };

  if (updates.note && updates.note.trim()) {
    const noteEntry = {
      text: updates.note.trim(),
      createdAt: new Date().toISOString()
    };
    updates.notes = [...(lead.notes || []), noteEntry];
  }

  const updatedLead = {
    ...lead,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  leads[index] = updatedLead;
  saveLeads(leads);
  res.json(updatedLead);
});

app.delete('/api/leads/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const leads = loadLeads();
  const nextLeads = leads.filter((lead) => lead.id !== id);

  if (nextLeads.length === leads.length) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  saveLeads(nextLeads);
  res.json({ success: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`CRM server running at http://localhost:${PORT}`);
  });
}

module.exports = { app };
