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

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
};

export async function appendLeadRow(row: string[]): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID?.trim() ?? "";
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() ?? "";
  assertSpreadsheetId(spreadsheetId);
  if (!raw) throw new Error("sheets_not_configured");
  let credentials: ServiceAccount;
  try {
    credentials = JSON.parse(raw) as ServiceAccount;
  } catch {
    throw new Error("sheets_not_configured");
  }
  if (!credentials.client_email || !credentials.private_key) {
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
    range: "A:N",
    // RAW keeps a leading + on WhatsApp numbers. USER_ENTERED stores them as numbers.
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}
