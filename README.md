# SCAN — Maverick First Cut

Run the application locally with Docker using a single command. This starts both the application and the database. No cloud services are required.

```bash
docker compose up --build
```

Once everything is running, open:

`http://localhost:8080`

To reset the database and start with a clean environment:

```bash
docker compose down -v
docker compose up --build
```
