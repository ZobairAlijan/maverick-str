-- Dates move with today so the demo still has now / next / watch.

CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  cadence TEXT NOT NULL CHECK (cadence IN ('weekly_monday', 'weekly_friday', 'quarterly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  due_at DATE,
  last_touched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  template_id TEXT REFERENCES templates(id)
);

INSERT INTO templates (id, title, notes, cadence) VALUES
  ('2026-001', 'Monday morning brief', 'Same every week.', 'weekly_monday'),
  ('2026-002', 'Friday status roll-up', 'What got done, what is still open.', 'weekly_friday'),
  ('2026-003', 'Quarterly paperwork', 'Same packet as last time. Easy to miss.', 'quarterly');

INSERT INTO items (title, notes, status, due_at, last_touched_at, created_at, template_id) VALUES
  ('Sign off jet 203', 'Flagged in email three weeks ago. Never left the inbox. Needs a signature.', 'open', CURRENT_DATE - 1, now() - INTERVAL '21 days', now() - INTERVAL '21 days', NULL),
  ('Call about the tow bar', 'Sticky note. Shop still has it. Need to call them today.', 'open', CURRENT_DATE, now() - INTERVAL '4 days', now() - INTERVAL '6 days', NULL),
  ('Hydraulics write-up', 'Grabbed me on the line. Due Friday. Was only in my head.', 'open', date_trunc('week', CURRENT_DATE)::date + 4, now() - INTERVAL '2 days', now() - INTERVAL '2 days', NULL),
  ('Fuel truck delay', 'On the ready-room whiteboard. Truck is running late.', 'open', CURRENT_DATE + 1, now() - INTERVAL '8 hours', now() - INTERVAL '8 hours', NULL),
  ('Monday morning brief', 'Same every week.', 'open', date_trunc('week', CURRENT_DATE)::date, now() - INTERVAL '3 days', now() - INTERVAL '3 days', '2026-001');


