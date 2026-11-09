export type LeadInput = {
  service?: unknown;
  destination?: unknown;
  date?: unknown;
  time?: unknown;
  passengers?: unknown;
  luggage?: unknown;
  indonesianDriver?: unknown;
  name?: unknown;
  whatsapp?: unknown;
  notes?: unknown;
  promoCode?: unknown;
  utm?: unknown;
  page?: unknown;
  consent?: unknown;
  company?: unknown;
};

export type Lead = {
  service: "Private Trip";
  destination: string;
  date: string;
  time: string;
  passengers: number;
  luggage: number;
  indonesianDriver: boolean;
  name: string;
  whatsapp: string;
  notes: string;
  promoCode: string;
  utm: string;
  page: string;
};

export type LeadDeps = {
  now: () => Date;
  allow: (ip: string) => boolean;
  appendRow: (row: string[]) => Promise<void>;
  sendTelegram: (text: string) => Promise<void>;
};

export type LeadResult = {
  status: number;
  body: { ok: boolean; error?: string };
};

const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 5;
const hits = new Map<string, number[]>();

export function clearRateLimit(): void {
  hits.clear();
}

export function allowRequest(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((stamp) => now - stamp < WINDOW_MS);
  if (recent.length >= MAX_HITS) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (cleaned.length > max) return null;
  return cleaned;
}

function parseDate(value: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!iso && !dmy) return null;
  const year = Number(iso ? iso[1] : dmy?.[3]);
  const month = Number(iso ? iso[2] : dmy?.[2]);
  const day = Number(iso ? iso[3] : dmy?.[1]);
  if (year < 2026 || year > 2035) return null;
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function normalizeWhatsApp(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("62")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^8\d{7,12}$/.test(digits)) return null;
  return `+62${digits}`;
}

export function validateLead(
  input: LeadInput,
): { ok: true; lead: Lead } | { ok: false; error: string } {
  if (input.service !== "Private Trip") {
    return { ok: false, error: "Jenis layanan tidak valid." };
  }
  const destination = text(input.destination, 120);
  if (!destination || destination.length < 2) {
    return { ok: false, error: "Isi destinasi perjalanan." };
  }
  const rawDate = text(input.date, 10);
  const date = rawDate ? parseDate(rawDate) : null;
  if (!date) return { ok: false, error: "Isi tanggal keberangkatan." };
  const time = text(input.time, 5);
  if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return { ok: false, error: "Isi jam keberangkatan." };
  }
  const passengers = Number(input.passengers);
  const luggage = Number(input.luggage);
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 20) {
    return { ok: false, error: "Jumlah penumpang wajib diisi." };
  }
  if (!Number.isInteger(luggage) || luggage < 0 || luggage > 20) {
    return { ok: false, error: "Jumlah koper tidak valid." };
  }
  if (typeof input.indonesianDriver !== "boolean") {
    return { ok: false, error: "Pilihan driver tidak valid." };
  }
  const name = text(input.name, 80);
  if (!name || !/^[\p{L}\s.'-]{2,80}$/u.test(name)) {
    return { ok: false, error: "Isi nama lengkap." };
  }
  const whatsappRaw = text(input.whatsapp, 20);
  const whatsapp = whatsappRaw ? normalizeWhatsApp(whatsappRaw) : null;
  if (!whatsapp) return { ok: false, error: "Nomor WhatsApp belum valid." };
  const notes = text(input.notes, 400);
  if (notes === null) return { ok: false, error: "Catatan terlalu panjang." };
  const promoCode = text(input.promoCode, 40);
  if (promoCode === null || (promoCode !== "" && !/^[A-Za-z0-9_-]{2,40}$/.test(promoCode))) {
    return { ok: false, error: "Kode promo tidak valid." };
  }
  const utm = text(input.utm, 500);
  if (utm === null) return { ok: false, error: "Data kampanye tidak valid." };
  const page = text(input.page, 80);
  if (!page || !/^\/[a-z0-9/-]*$/.test(page)) {
    return { ok: false, error: "Halaman tidak valid." };
  }
  if (input.consent !== true) {
    return { ok: false, error: "Setujui penggunaan data untuk dihubungi." };
  }
  return {
    ok: true,
    lead: {
      service: "Private Trip",
      destination,
      date,
      time,
      passengers,
      luggage,
      indonesianDriver: input.indonesianDriver,
      name,
      whatsapp,
      notes,
      promoCode,
      utm,
      page,
    },
  };
}

export function toSheetRow(lead: Lead, at: Date): string[] {
  return [
    at.toISOString(),
    lead.service,
    lead.destination,
    lead.date,
    lead.time,
    String(lead.passengers),
    String(lead.luggage),
    lead.indonesianDriver ? "Ya" : "Tidak",
    lead.name,
    lead.whatsapp,
    lead.notes,
    lead.promoCode,
    lead.utm,
    lead.page,
  ];
}

export function toTelegram(lead: Lead, atIso: string): string {
  return [
    "Private Trip — permintaan baru",
    `Waktu: ${atIso}`,
    `Layanan: ${lead.service}`,
    `Destinasi: ${lead.destination}`,
    `Tanggal: ${lead.date}`,
    `Jam: ${lead.time}`,
    `Penumpang: ${lead.passengers}`,
    `Koper: ${lead.luggage}`,
    `Driver Indonesia: ${lead.indonesianDriver ? "Ya" : "Tidak"}`,
    `Nama: ${lead.name}`,
    `WhatsApp: ${lead.whatsapp}`,
    `Catatan: ${lead.notes || "-"}`,
    `Promo: ${lead.promoCode || "-"}`,
    `UTM: ${lead.utm || "-"}`,
    `Halaman: ${lead.page}`,
  ].join("\n");
}

function honeypotTripped(input: LeadInput): boolean {
  if (input.company === undefined || input.company === null) return false;
  return String(input.company).trim() !== "";
}

export async function handleLead(
  request: Request,
  ip: string,
  deps: LeadDeps,
): Promise<LeadResult> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > 20_000) {
    return { status: 413, body: { ok: false, error: "Data terlalu besar." } };
  }
  const origin = request.headers.get("origin");
  if (origin && !originAllowed(origin)) {
    return { status: 403, body: { ok: false, error: "Permintaan ditolak." } };
  }
  let input: LeadInput;
  try {
    input = (await request.json()) as LeadInput;
  } catch {
    return { status: 400, body: { ok: false, error: "Data tidak valid." } };
  }
  if (!input || typeof input !== "object") {
    return { status: 400, body: { ok: false, error: "Data tidak valid." } };
  }
  if (honeypotTripped(input)) {
    return { status: 400, body: { ok: false, error: "Permintaan ditolak." } };
  }
  if (!deps.allow(ip)) {
    return { status: 429, body: { ok: false, error: "Terlalu banyak percobaan. Coba lagi nanti." } };
  }
  const parsed = validateLead(input);
  if (!parsed.ok) return { status: 400, body: { ok: false, error: parsed.error } };
  const at = deps.now();
  const row = toSheetRow(parsed.lead, at);
  try {
    await deps.appendRow(row);
  } catch {
    console.error("sheets_append_failed");
    return { status: 502, body: { ok: false, error: "Penawaran belum terkirim. Coba lagi sebentar." } };
  }
  try {
    await deps.sendTelegram(toTelegram(parsed.lead, row[0] ?? at.toISOString()));
  } catch {
    console.error("telegram_send_failed");
    return { status: 502, body: { ok: false, error: "Penawaran belum terkirim. Coba lagi sebentar." } };
  }
  return { status: 200, body: { ok: true } };
}

function originAllowed(origin: string): boolean {
  let host = "";
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const allowed = new Set(["localhost:4321", "127.0.0.1:4321"]);
  const site = process.env.PUBLIC_SITE_URL?.trim();
  if (site) {
    try {
      allowed.add(new URL(site).host);
    } catch {
      return false;
    }
  }
  return allowed.has(host);
}
