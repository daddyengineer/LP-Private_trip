import { google } from "googleapis";

/**
 * Spreadsheet ids in a Google Sheets URL are a long mixed-case token.
 * A 40-character hex string is not one of those ids.
 */
export function assertSpreadsheetId(id: string): void {
  if (!/^[a-zA-Z0-9-_]{30,}$/.test(id) || /^[0-9a-f]{40}$/.test(id)) {
    throw new Error("spreadsheet_id_invalid");
  }
}

/** Tab "Private Trip". Quoted because the name contains a space. */
export const LEAD_SHEET_RANGE = "'Private Trip'!A:N";

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
};

function envValue(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function sheetSettings(): { spreadsheetId: string; rawKey: string; email: string } {
  return {
    spreadsheetId: envValue("SHEET_ID") || envValue("GOOGLE_SHEET_ID"),
    rawKey: envValue("GOOGLE_SHEETS_KEY") || envValue("GOOGLE_SERVICE_ACCOUNT_JSON"),
    email: envValue("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
  };
}

export async function appendLeadRow(row: string[]): Promise<void> {
  const { spreadsheetId, rawKey, email } = sheetSettings();
  assertSpreadsheetId(spreadsheetId);
  if (!rawKey) throw new Error("sheets_not_configured");
  let credentials: ServiceAccount;
  try {
    credentials = JSON.parse(rawKey) as ServiceAccount;
  } catch {
    throw new Error("sheets_not_configured");
  }
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error("sheets_not_configured");
  }
  if (email && email !== credentials.client_email) {
    throw new Error("sheets_not_configured");
  }
  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: LEAD_SHEET_RANGE,
    // RAW keeps a leading + on WhatsApp numbers. USER_ENTERED stores them as numbers.
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}
