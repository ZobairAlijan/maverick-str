# SCAN — Maverick first cut

One command. Docker only. App + database. Nothing in the cloud.

```bash
docker compose up --build
```

Then open http://localhost:8080

To reset data: `docker compose down -v` and run the `command docker compose up --build` again.
