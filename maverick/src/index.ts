// @ts-nocheck
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://maverick:maverick@localhost:5432/maverick",
});

const todayIso = () => new Date().toISOString().slice(0, 10);
const asDate = (v) => (v ? String(v).slice(0, 10) : null);
const daysBetween = (a, b) =>
  Math.round(
    (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000,
  );
const hoursSince = (iso) => (Date.now() - Date.parse(iso)) / 3600000;

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function mondayOf(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function periodDue(cadence, today) {
  if (cadence === "weekly_monday") return mondayOf(today);
  if (cadence === "weekly_friday") return addDays(mondayOf(today), 4);
  const month = new Date(`${today}T00:00:00Z`).getUTCMonth();
  const end = month < 3 ? 2 : month < 6 ? 5 : month < 9 ? 8 : 11;
  return new Date(Date.UTC(new Date(today).getUTCFullYear(), end + 1, 0))
    .toISOString()
    .slice(0, 10);
}

function item(row) {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    status: row.status,
    dueAt: asDate(row.due_at),
    lastTouchedAt: row.last_touched_at.toISOString(),
    templateId: row.template_id,
  };
}

function isQuiet(i, today) {
  if (i.status !== "open") return false;
  const cold = hoursSince(i.lastTouchedAt);
  const dueIn = i.dueAt == null ? null : daysBetween(today, i.dueAt);
  if (dueIn !== null && dueIn < 0) return cold >= 24;
  if (dueIn !== null && dueIn <= 3) return cold >= 36;
  return cold >= 72;
}

function bucket(i, today) {
  if (!i.dueAt) return "next";
  const dueIn = daysBetween(today, i.dueAt);
  return dueIn <= 0 ? "now" : dueIn <= 3 ? "next" : "later";
}

function dailyCard(scan, today) {
  const overdue = scan.now.filter(
    (i) => i.dueAt && daysBetween(today, i.dueAt) < 0,
  );
  const lines = [
    scan.now.length === 0
      ? "NOW is clear."
      : overdue.length
        ? `${overdue.length} overdue. Start here.`
        : `${scan.now.length} due today.`,
    scan.next.length
      ? `${scan.next.length} coming in the next few days.`
      : "NEXT is light.",
    scan.watch.length
      ? `${scan.watch.length} went quiet. They are on WATCH.`
      : "Nothing on WATCH.",
  ];
  const ahead = overdue.length === 0 && scan.watch.length <= 1;
  return { headline: ahead ? "On track" : "Behind", ahead, lines };
}

const handle = (fn) => (req, res) =>
  fn(req, res).catch((err) =>
    res.status(500).json({ error: String(err.message) }),
  );

const app = express();
app.use(express.json());

app.get(
  "/api/health",
  handle(async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  }),
);

app.get(
  "/api/scan",
  handle(async (_req, res) => {
    const today = todayIso();
    const { rows } = await pool.query(
      "SELECT * FROM items ORDER BY due_at NULLS LAST, created_at",
    );
    const open = rows.map(item).filter((i) => i.status === "open");
    const now = open.filter((i) => bucket(i, today) === "now");
    const next = open.filter((i) => bucket(i, today) === "next");
    const watch = open.filter((i) => isQuiet(i, today));
    res.json({
      today,
      dailyCard: dailyCard({ now, next, watch }, today),
      now,
      next,
      watch,
      quietCount: watch.length,
    });
  }),
);

app.get(
  "/api/items",
  handle(async (req, res) => {
    const { rows } = await pool.query(
      "SELECT * FROM items ORDER BY status ASC, due_at NULLS LAST, created_at DESC",
    );
    let items = rows.map(item);
    const { status, q } = req.query;
    if (status) items = items.filter((i) => i.status === status);
    if (q) {
      const n = String(q).toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(n) ||
          i.notes.toLowerCase().includes(n),
      );
    }
    res.json(items);
  }),
);

app.post(
  "/api/items",
  handle(async (req, res) => {
    const { title, notes, dueAt } = req.body || {};
    if (!title?.trim())
      return res.status(400).json({ error: "title is required" });
    const { rows } = await pool.query(
      `INSERT INTO items (title, notes, due_at) VALUES ($1, $2, $3) RETURNING *`,
      [title.trim(), notes || "", dueAt || null],
    );
    res.status(201).json(item(rows[0]));
  }),
);

app.post(
  "/api/items/:id/ack",
  handle(async (req, res) => {
    const { rows } = await pool.query(
      `UPDATE items SET last_touched_at = now() WHERE id = $1 RETURNING *`,
      [req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: "not found" });
    res.json(item(rows[0]));
  }),
);

app.patch(
  "/api/items/:id",
  handle(async (req, res) => {
    const found = await pool.query("SELECT * FROM items WHERE id = $1", [
      req.params.id,
    ]);
    if (!found.rows[0]) return res.status(404).json({ error: "not found" });
    const cur = item(found.rows[0]);
    const status = req.body.status ?? cur.status;
    if (!["open", "done"].includes(status))
      return res.status(400).json({ error: "invalid update" });
    const { rows } = await pool.query(
      `UPDATE items SET title=$2, notes=$3, status=$4, due_at=$5, last_touched_at=now()
     WHERE id=$1 RETURNING *`,
      [
        req.params.id,
        req.body.title ?? cur.title,
        req.body.notes ?? cur.notes,
        status,
        req.body.dueAt === undefined ? cur.dueAt : req.body.dueAt,
      ],
    );
    res.json(item(rows[0]));
  }),
);

app.get(
  "/api/templates",
  handle(async (_req, res) => {
    const { rows } = await pool.query(
      "SELECT * FROM templates ORDER BY cadence, title",
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        notes: r.notes,
        cadence: r.cadence,
      })),
    );
  }),
);

app.post(
  "/api/templates/:id/spawn",
  handle(async (req, res) => {
    const found = await pool.query("SELECT * FROM templates WHERE id = $1", [
      req.params.id,
    ]);
    if (!found.rows[0]) return res.status(404).json({ error: "not found" });
    const t = found.rows[0];
    const dueAt = periodDue(t.cadence, todayIso());
    const already = await pool.query(
      `SELECT * FROM items WHERE template_id = $1 AND due_at = $2 AND status = 'open'`,
      [req.params.id, dueAt],
    );
    if (already.rows[0])
      return res.json({ item: item(already.rows[0]), spawned: false });
    const inserted = await pool.query(
      `INSERT INTO items (title, notes, due_at, template_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [t.title, t.notes, dueAt, req.params.id],
    );
    res.status(201).json({ item: item(inserted.rows[0]), spawned: true });
  }),
);

const staticDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist/maverick/browser",
);
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.use((req, res) => {
    if (req.path.startsWith("/api"))
      return res.status(404).json({ error: "not found" });
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

app.listen(process.env.PORT || 8080, () => console.log("maverick listening"));
