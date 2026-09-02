# PREBRIEF

One-pager before the demo. First cut, not a product. Day one is just him.

## What we heard

Flying is fine. Everything around it is the problem. He is part pilot, part manager, part supply clerk, and the system is sticky notes, flagged email, a whiteboard, and memory. Four lists. None of them talk.

He wants one place: flight, admin, the tow bar, whatever matters. He also closes any app that dumps two hundred items on him. He turned off every notification. Then the quiet stuff burned him — a sign-off sat in email for three weeks. Same pattern on the line: someone says it is due Friday, and the only copy is in his head.

Monday brief, Friday roll-up, quarterly paperwork: same items every time, retyped by hand, still missed.

He asked for a scan, like in the jet — what's now, what's next. Maybe a morning card: here's your day, here's what's coming. He wants to open it and feel ahead of the jet, not behind it. Squadron / handing work off is later.

## What we built and why

SCAN is the one place. Those four piles all land here. We did not put sticky / email / whiteboard back as dropdowns — that would be four lists again. The seed stories are his: email sign-off, sticky (tow bar), line grab (hydraulics Friday), whiteboard (fuel truck).

Home is a scan, not an inbox:

- **NOW** — overdue and today
- **NEXT** — the next few days
- **WATCH** — went quiet. No buzz. On the page.

Morning card at the top: ahead of the jet / behind the jet, plus "here's your day" and "here's what's coming." Capture is on that screen so a shoulder-tap can get out of his head in a few seconds.

Monday / Friday / quarterly are templates. Spawn this period instead of retyping. Board is the full pile with search and open/done. Not the home screen.

One Docker command, app + Postgres, his laptop. No cloud, no login, no pings.

## What we're guessing on

- NOW / NEXT / WATCH vs. only the morning card
- "I scanned this" instead of pings — enough, or does he still want it printed?
- Typing email in by hand OK for day one, or is inbox ingest the real job?
- Spawn this period vs. auto recurrence
- When other people actually matter

If the scan is the wrong bet, we will know in five minutes.
