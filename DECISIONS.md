# DECISIONS

Notes while building. Not a write-up after the fact.

## First cut

A demo I can run in front of him. Single user. One Docker command, app + database, local. Nothing in the cloud.

## Problem

He already has four lists. They do not talk. He wants everything in one place and he cannot look at the whole pile. He turned off notifications and still got burned by silence (the email sign-off).

He asked for a scan: now vs next, plus a morning card.

## Home screen

Looked at a todo inbox (that is the "200 items" failure), a calendar (not what he asked for), and a scan.

Went with scan:

- NOW = overdue + today
- NEXT = next few days
- WATCH = went quiet. Lives on the page. No pings.

Board still has everything. Just not first.

## Capture

If this takes more than a few seconds, the prototype is wrong. Bar on the scan: title, due date, optional notes.

Skipped role and source fields. The notes describe four piles and three hats, but he asked for one place and a scan, not a taxonomy.

## Recurring stuff

Monday brief / Friday roll-up / quarterly paperwork. Cron felt like fake completeness for a short cut. Templates + "spawn this period." Seed puts this week's Monday copy on the scan. Friday and quarterly he spawns in the demo.

## Stack

Angular 20 because that is what I wanted to use and I can walk it.

- UI: Angular 20, one component, signals. No NgRx, no Material — he said he does not care what it looks like, and Material would have looked like another admin grid.
- API: Express + `pg`. Nest would have been extra scaffolding.
- DB: Postgres. Needed a real database, local.
- No auth. It is his laptop.

Express serves `/api` and the Angular build from one process so Docker is one app container + Postgres.

## Not building

Pings, email ingest, multi-user, auth, cloud, a real recurrence engine.

## Seed

His examples: email sign-off (NOW + WATCH), sticky / tow bar (NOW), line grab / hydraulics Friday (NEXT), whiteboard / fuel truck (NEXT), one Monday brief already spawned. Friday and quarterly templates are there to spawn.
