# PREBRIEF

One-pager before the demo. First cut, not a product. Single user, his laptop.

## What we heard

The work around flying is the problem, not flying. He is wearing three hats — flying, admin, and supply — and tracking it in four places: sticky notes, flagged email, a whiteboard, and memory. None of those lists talk to each other.

A maintenance sign-off sat in email for three weeks and he missed it. Same pattern in person: someone tells him something is due Friday, and the only copy is in his head.

He wants one place for all of it. He closes any app that dumps two hundred items on him. He turned off phone notifications, then the quiet stuff burned him.

What he asked for: a home screen he can scan quickly — what is due now, what is next. Maybe a short morning summary. Version one is just him.

## What we built and why

SCAN. Home is a daily view, not a full inbox:

- **NOW** — overdue and today
- **NEXT** — the next few days
- **WATCH** — items that went quiet (no notifications)

A morning card at the top (on track / behind). Capture is on that same screen: title, due date, optional notes. Park it in a few seconds.

Monday brief, Friday roll-up, and quarterly paperwork are templates. He hits spawn for this period instead of retyping them. Board is the full list with search and open/done. It is not the home screen.

One Docker command starts the app and Postgres locally. No cloud, no login.

## What we're guessing on

- Three panes vs. only the morning card
- "I scanned this" instead of pings — enough, or does he still want a printed card?
- Typing email in by hand OK for day one, or does he need inbox ingest?
- Spawn this period vs. automatic recurrence
- Sharing with other people — later, not this cut

I skipped a normal todo-app layout: inbox as home, Material, NgRx, push notifications, login, cloud, cron. If the scan is the wrong bet, we will know in five minutes.
