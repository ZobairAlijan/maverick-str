import { NgTemplateOutlet } from "@angular/common";
import { Component, computed, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";

type Page = "scan" | "board" | "rhythm";

interface Item {
  id: string;
  title: string;
  notes: string;
  status: "open" | "done";
  dueAt: string | null;
}

interface Template {
  id: string;
  title: string;
  notes: string;
  cadence: "weekly_monday" | "weekly_friday" | "quarterly";
}

interface Scan {
  dailyCard: { headline: string; ahead: boolean; lines: string[] };
  now: Item[];
  next: Item[];
  watch: Item[];
  quietCount: number;
}

@Component({
  selector: "app-root",
  imports: [FormsModule, NgTemplateOutlet],
  templateUrl: "./app.html",
  styleUrl: "./app.css",
})
export class App {
  readonly todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

  page = signal<Page>("scan");
  scan = signal<Scan | null>(null);
  items = signal<Item[]>([]);
  templates = signal<Template[]>([]);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  saving = signal(false);
  quietIds = computed(
    () => new Set((this.scan()?.watch ?? []).map((i) => i.id)),
  );

  title = "";
  notes = "";
  dueAt = "";
  q = "";
  boardStatus: "open" | "done" | "" = "open";

  constructor() {
    this.loadScan();
  }

  panes(s: Scan) {
    return [
      {
        key: "now",
        label: "NOW",
        items: s.now,
        quiet: false,
        empty: "Nothing due today.",
      },
      {
        key: "next",
        label: "NEXT",
        items: s.next,
        quiet: false,
        empty: "Nothing coming up.",
      },
      {
        key: "watch",
        label: "WATCH",
        items: s.watch,
        quiet: true,
        empty: "Nothing went quiet.",
      },
    ];
  }

  isQuiet(item: Item) {
    return this.quietIds().has(item.id);
  }

  cadenceLabel(cadence: Template["cadence"]) {
    return {
      weekly_monday: "Every Monday",
      weekly_friday: "Every Friday",
      quarterly: "Every quarter",
    }[cadence];
  }

  dueLabel(iso: string) {
    const [year, month, day] = iso.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(year, month - 1, day));
  }

  show(page: Page) {
    this.page.set(page);
    if (page === "scan") this.loadScan();
    if (page === "board") this.loadBoard();
    if (page === "rhythm") this.loadRhythm();
  }

  private async api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    if (!res.ok) throw new Error("request failed");
    return res.json();
  }

  async loadScan() {
    try {
      this.scan.set(await this.api<Scan>("/api/scan"));
      this.error.set(null);
    } catch {
      this.error.set("Scan is down. Is docker compose up?");
    }
  }

  async loadBoard() {
    const q = new URLSearchParams();
    if (this.boardStatus) q.set("status", this.boardStatus);
    if (this.q.trim()) q.set("q", this.q.trim());
    this.items.set(await this.api<Item[]>(`/api/items?${q}`));
  }

  async loadRhythm() {
    this.templates.set(await this.api<Template[]>("/api/templates"));
  }

  async capture() {
    if (!this.title.trim()) return;
    this.saving.set(true);
    try {
      await this.api("/api/items", {
        method: "POST",
        body: JSON.stringify({
          title: this.title.trim(),
          notes: this.notes.trim(),
          dueAt: this.dueAt || null,
        }),
      });
      this.title = "";
      this.notes = "";
      this.dueAt = "";
      await this.loadScan();
    } catch {
      this.error.set("Capture failed.");
    }
    this.saving.set(false);
  }

  async markDone(item: Item) {
    await this.api(`/api/items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "done" }),
    });
    await this.refresh();
  }

  async reopen(item: Item) {
    await this.api(`/api/items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "open" }),
    });
    await this.refresh();
  }

  async ack(item: Item) {
    await this.api(`/api/items/${item.id}/ack`, { method: "POST" });
    await this.refresh();
  }

  async spawn(t: Template) {
    const result = await this.api<{ item: Item; spawned: boolean }>(
      `/api/templates/${t.id}/spawn`,
      {
        method: "POST",
      },
    );
    this.message.set(
      result.spawned
        ? `Parked "${result.item.title}" on the scan for this period.`
        : `"${result.item.title}" is already on the scan for this period.`,
    );
  }

  private refresh() {
    if (this.page() === "board") return this.loadBoard();
    return this.loadScan();
  }
}
