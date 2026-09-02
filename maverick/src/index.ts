// @ts-nocheck
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgres://maverick:maverick@localhost:5432/maverick",
});
const DAY = 864e5;
const today = () => new Date().toISOString().slice(0, 10);
const ymd = (v) => (v ? new Date(v).toISOString().slice(0, 10) : null);
const daysUntil = (from, to) => Math.round((new Date(to) - new Date(from)) / DAY);
const hoursAgo = (when) => (Date.now() - new Date(when)) / 36e5;

function periodDue(cadence, on) {
  const d = new Date(`${on}T00:00:00Z`);
  if (cadence.startsWith("weekly")) {
    const dow = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow) + (cadence === "weekly_friday" ? 4 : 0));
    return d.toISOString().slice(0, 10);
  }
  const end = [2, 5, 8, 11][Math.floor(d.getUTCMonth() / 3)];
  return new Date(Date.UTC(d.getUTCFullYear(), end + 1, 0)).toISOString().slice(0, 10);
}

const item = (row) => ({
  id: row.id,
  title: row.title,
  notes: row.notes,
  status: row.status,
  dueAt: ymd(row.due_at),
  lastTouchedAt: row.last_touched_at.toISOString(),
  templateId: row.template_id,
});

function isQuiet(i, on) {
  if (i.status !== "open") return false;
  const cold = hoursAgo(i.lastTouchedAt);
  const dueIn = i.dueAt == null ? null : daysUntil(on, i.dueAt);
  return dueIn !== null && dueIn < 0 ? cold >= 24 : dueIn !== null && dueIn <= 3 ? cold >= 36 : cold >= 72;
}

function bucket(i, on) {
  if (!i.dueAt) return "next";
  const dueIn = daysUntil(on, i.dueAt);
  return dueIn <= 0 ? "now" : dueIn <= 3 ? "next" : "later";
}

function dailyCard({ now, next, watch }, on) {
  const overdue = now.filter((i) => i.dueAt && daysUntil(on, i.dueAt) < 0).length;
  return {
    headline: overdue === 0 && watch.length <= 1 ? "Ahead of the jet" : "Behind the jet",
    ahead: overdue === 0 && watch.length <= 1,
    lines: [
      now.length === 0 ? "Here's your day: NOW is clear." : overdue ? `Here's your day: ${overdue} overdue. Start here.` : `Here's your day: ${now.length} due today.`,
      next.length ? `Here's what's coming: ${next.length} in the next few days.` : "Here's what's coming: NEXT is light.",
      watch.length ? `${watch.length} went quiet. They will not buzz. They are on WATCH.` : "Nothing on WATCH. Silence is actually silence.",
    ],
  };
}

const handle = (fn) => (req, res) => fn(req, res).catch((err) => res.status(500).json({ error: String(err.message) }));
const app = express();
app.use(express.json());

app.get("/api/health", handle(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
}));

app.get("/api/scan", handle(async (_req, res) => {
  const on = today();
  const { rows } = await pool.query("SELECT * FROM items ORDER BY due_at NULLS LAST, created_at");
  const open = rows.map(item).filter((i) => i.status === "open");
  const now = open.filter((i) => bucket(i, on) === "now");
  const next = open.filter((i) => bucket(i, on) === "next");
  const watch = open.filter((i) => isQuiet(i, on));
  res.json({ today: on, dailyCard: dailyCard({ now, next, watch }, on), now, next, watch, quietCount: watch.length });
}));

app.get("/api/items", handle(async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM items ORDER BY status ASC, due_at NULLS LAST, created_at DESC");
  let items = rows.map(item);
  const { status, q } = req.query;
  if (status) items = items.filter((i) => i.status === status);
  if (q) {
    const n = String(q).toLowerCase();
    items = items.filter((i) => i.title.toLowerCase().includes(n) || i.notes.toLowerCase().includes(n));
  }
  res.json(items);
}));

app.post("/api/items", handle(async (req, res) => {
  const { title, notes, dueAt } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: "title is required" });
  const { rows } = await pool.query(
    `INSERT INTO items (title, notes, due_at) VALUES ($1, $2, $3) RETURNING *`,
    [title.trim(), notes || "", dueAt || null],
  );
  res.status(201).json(item(rows[0]));
}));

app.post("/api/items/:id/ack", handle(async (req, res) => {
  const { rows } = await pool.query(`UPDATE items SET last_touched_at = now() WHERE id = $1 RETURNING *`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "not found" });
  res.json(item(rows[0]));
}));

app.patch("/api/items/:id", handle(async (req, res) => {
  const found = await pool.query("SELECT * FROM items WHERE id = $1", [req.params.id]);
  if (!found.rows[0]) return res.status(404).json({ error: "not found" });
  const cur = item(found.rows[0]);
  const status = req.body.status ?? cur.status;
  if (!["open", "done"].includes(status)) return res.status(400).json({ error: "invalid update" });
  const { rows } = await pool.query(
    `UPDATE items SET title=$2, notes=$3, status=$4, due_at=$5, last_touched_at=now() WHERE id=$1 RETURNING *`,
    [req.params.id, req.body.title ?? cur.title, req.body.notes ?? cur.notes, status, req.body.dueAt === undefined ? cur.dueAt : req.body.dueAt],
  );
  res.json(item(rows[0]));
}));

app.get("/api/templates", handle(async (_req, res) => {
  const { rows } = await pool.query("SELECT id, title, notes, cadence FROM templates ORDER BY cadence, title");
  res.json(rows);
}));

app.post("/api/templates/:id/spawn", handle(async (req, res) => {
  const found = await pool.query("SELECT * FROM templates WHERE id = $1", [req.params.id]);
  if (!found.rows[0]) return res.status(404).json({ error: "not found" });
  const t = found.rows[0];
  const dueAt = periodDue(t.cadence, today());
  const already = await pool.query(
    `SELECT * FROM items WHERE template_id = $1 AND due_at = $2 AND status = 'open'`,
    [req.params.id, dueAt],
  );
  if (already.rows[0]) return res.json({ item: item(already.rows[0]), spawned: false });
  const inserted = await pool.query(
    `INSERT INTO items (title, notes, due_at, template_id) VALUES ($1, $2, $3, $4) RETURNING *`,
    [t.title, t.notes, dueAt, req.params.id],
  );
  res.status(201).json({ item: item(inserted.rows[0]), spawned: true });
}));

const staticDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../dist/maverick/browser");
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.use((req, res) => {
    if (req.path.startsWith("/api")) return res.status(404).json({ error: "not found" });
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

app.listen(process.env.PORT || 8080, () => console.log("maverick listening"));
