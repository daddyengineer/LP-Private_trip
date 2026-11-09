import assert from "node:assert/strict";
import test from "node:test";
import { allowRequest, clearRateLimit, handleLead, type LeadDeps } from "../src/server/lead.ts";
import { assertSpreadsheetId, LEAD_SHEET_RANGE } from "../src/server/sheets.ts";

function payload(extra: Record<string, unknown> = {}) {
  return {
    service: "Private Trip",
    destination: "Paris - Swiss - Italia",
    date: "2026-12-20",
    time: "09:30",
    passengers: 4,
    luggage: 5,
    indonesianDriver: true,
    name: "Rina Wulandari",
    whatsapp: "081234567890",
    notes: "1 child seat",
    promoCode: "AKHIRTAHUN26",
    utm: "utm_source=ads",
    page: "/penawaran",
    consent: true,
    company: "",
    ...extra,
  };
}

function request(body: unknown, origin = "http://127.0.0.1:4321"): Request {
  return new Request("http://127.0.0.1:4321/api/lead", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  });
}

function deps(overrides: Partial<LeadDeps> = {}): LeadDeps & { rows: string[][]; messages: string[] } {
  const rows: string[][] = [];
  const messages: string[] = [];
  return {
    rows,
    messages,
    now: () => new Date("2026-11-09T06:00:00.000Z"),
    allow: () => true,
    appendRow: async (row) => {
      rows.push(row);
    },
    sendTelegram: async (text) => {
      messages.push(text);
    },
    ...overrides,
  };
}

test("appends one sheet row then sends Telegram", async () => {
  const sink = deps();
  const result = await handleLead(request(payload()), "203.0.113.1", sink);
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(sink.rows.length, 1);
  assert.equal(sink.messages.length, 1);
  assert.deepEqual(sink.rows[0], [
    "2026-11-09T06:00:00.000Z",
    "Private Trip",
    "Paris - Swiss - Italia",
    "2026-12-20",
    "09:30",
    "4",
    "5",
    "Ya",
    "Rina Wulandari",
    "+6281234567890",
    "1 child seat",
    "AKHIRTAHUN26",
    "utm_source=ads",
    "/penawaran",
  ]);
  assert.match(sink.messages[0] ?? "", /Destinasi: Paris - Swiss - Italia/);
});

test("does not send Telegram when the sheet append fails", async () => {
  let telegram = 0;
  const result = await handleLead(
    request(payload()),
    "203.0.113.2",
    deps({
      appendRow: async () => {
        throw new Error("down");
      },
      sendTelegram: async () => {
        telegram += 1;
      },
    }),
  );
  assert.equal(result.status, 502);
  assert.equal(result.body.ok, false);
  assert.equal(telegram, 0);
});

test("returns an error when Telegram fails after the sheet append", async () => {
  let appended = 0;
  const result = await handleLead(
    request(payload()),
    "203.0.113.3",
    deps({
      appendRow: async () => {
        appended += 1;
      },
      sendTelegram: async () => {
        throw new Error("down");
      },
    }),
  );
  assert.equal(result.status, 502);
  assert.equal(appended, 1);
  assert.equal(result.body.ok, false);
});

test("rejects a filled honeypot without storing the lead", async () => {
  const sink = deps();
  const result = await handleLead(request(payload({ company: "https://spam.test" })), "203.0.113.4", sink);
  assert.equal(result.status, 400);
  assert.equal(sink.rows.length, 0);
  assert.equal(sink.messages.length, 0);
});

test("rate limits repeated posts from one address", async () => {
  clearRateLimit();
  const sink = deps({ allow: allowRequest });
  let last = 200;
  for (let i = 0; i < 6; i += 1) {
    const result = await handleLead(request(payload()), "203.0.113.5", sink);
    last = result.status;
  }
  assert.equal(last, 429);
  assert.equal(sink.rows.length, 5);
});

test("rejects a lead without consent", async () => {
  const result = await handleLead(request(payload({ consent: false })), "203.0.113.6", deps());
  assert.equal(result.status, 400);
  assert.match(result.body.error ?? "", /Setujui/);
});

test("new leads append on the Private Trip tab", () => {
  assert.equal(LEAD_SHEET_RANGE, "'Private Trip'!A:N");
});

test("40-hex string is not a spreadsheet id", () => {
  assert.throws(() => assertSpreadsheetId("ab".repeat(20)));
  assert.doesNotThrow(() => assertSpreadsheetId("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"));
});
