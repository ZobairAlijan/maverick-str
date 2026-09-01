-- Dates move with today so the demo still has now / next / watch.

CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('flight', 'admin', 'supply')),
  cadence TEXT NOT NULL CHECK (cadence IN ('weekly_monday', 'weekly_friday', 'quarterly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('flight', 'admin', 'supply')),
  source TEXT NOT NULL CHECK (source IN ('email', 'flight_line', 'sticky', 'whiteboard', 'memory', 'template')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  due_at DATE,
  last_touched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  template_id UUID REFERENCES templates(id)
);

INSERT INTO templates (id, title, notes, role, cadence) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Monday morning brief', 'Weather, jet status, who is flying. Same every week.', 'flight', 'weekly_monday'),
  ('22222222-2222-2222-2222-222222222222', 'Friday status roll-up', 'What flew, what broke, what is still open.', 'admin', 'weekly_friday'),
  ('33333333-3333-3333-3333-333333333333', 'Quarterly currency paperwork', 'Same packet as last time. Easy to miss.', 'admin', 'quarterly');

INSERT INTO items (title, notes, role, source, status, due_at, last_touched_at, created_at, template_id) VALUES
  ('Sign off jet 203', 'Been sitting in email for weeks. Needs a signature.', 'flight', 'email', 'open', CURRENT_DATE - 1, now() - INTERVAL '21 days', now() - INTERVAL '21 days', NULL),
  ('Call about the tow bar', 'Shop still has it. Need to call them today.', 'supply', 'sticky', 'open', CURRENT_DATE, now() - INTERVAL '4 days', now() - INTERVAL '6 days', NULL),
  ('Hydraulics write-up', 'Caught me on the line. Due Friday.', 'flight', 'flight_line', 'open', date_trunc('week', CURRENT_DATE)::date + 4, now() - INTERVAL '2 days', now() - INTERVAL '2 days', NULL),
  ('Monday morning brief', 'Weather, jets, who is flying.', 'flight', 'template', 'open', date_trunc('week', CURRENT_DATE)::date, now() - INTERVAL '3 days', now() - INTERVAL '3 days', '11111111-1111-1111-1111-111111111111'),
  ('Friday status roll-up', 'What flew, what broke, what is still open.', 'admin', 'template', 'open', date_trunc('week', CURRENT_DATE)::date + 4, now() - INTERVAL '1 days', now() - INTERVAL '1 days', '22222222-2222-2222-2222-222222222222'),
  ('Quarterly currency paperwork', 'Same packet as last quarter.', 'admin', 'template', 'open', CURRENT_DATE + 12, now() - INTERVAL '10 days', now() - INTERVAL '10 days', '33333333-3333-3333-3333-333333333333'),
  ('Fuel truck delay', 'Wrote it on the whiteboard. Truck is running late.', 'supply', 'whiteboard', 'open', CURRENT_DATE + 1, now() - INTERVAL '8 hours', now() - INTERVAL '8 hours', NULL),
  ('Pre-flight card for tomorrow', 'Hop in the morning. Still need to fill this out.', 'flight', 'memory', 'open', CURRENT_DATE + 1, now() - INTERVAL '3 hours', now() - INTERVAL '5 hours', NULL),
  ('Leave chit for two maintainers', 'Signed and sent.', 'admin', 'email', 'done', CURRENT_DATE - 3, now() - INTERVAL '2 days', now() - INTERVAL '5 days', NULL),
  ('Headset ear pads', 'Came in last week.', 'supply', 'sticky', 'done', CURRENT_DATE - 5, now() - INTERVAL '4 days', now() - INTERVAL '8 days', NULL);
