# Private Trip — TravelKIF

Mobile landing for Private Trip (`privatetrip.travelkif.id`): promo page, a 3-step offer form, and a thank-you page. Leads are appended to Google Sheets and sent to Telegram.

## Local

```bash
npm install
cp .env.example .env
npm run dev
```

Routes: `/`, `/penawaran`, `/terima-kasih`, `POST /api/lead`.

`npm test` checks validation, the honeypot, the rate limit, and the rule that a failed sheet or Telegram call is not a success. It does not call Google or Telegram.

## Sheet row

One row, columns A–N:

`time`, `service`, `airport`, `date`, `time of arrival`, `passengers`, `luggage`, `Indonesian driver`, `name`, `WhatsApp`, `notes`, `promo code`, `UTM`, `page`.

The visible form asks for **Destinasi** (free text), not a CDG / Orly / Beauvais picker. That destinasi is stored in the `airport` column. `time of arrival` is the departure time the visitor entered.

Put this header in row 1 yourself. The API only appends data rows. Share the sheet with the service account email.

## Coolify

Application folder: **TravelKIF**. Domain: `privatetrip.travelkif.id` with HTTPS. Build with the repo `Dockerfile`. The server listens on `PORT` (default `4321`) and `HOST=0.0.0.0`.

Set the names in `.env.example` on the app. Do not commit values.

- `GOOGLE_SHEET_ID` is the id in `.env.example`, from the Private Trip leads sheet URL. A 40-character hex string is rejected before any Google call.
- `GOOGLE_SERVICE_ACCOUNT_JSON` is the key file contents. The Cloud Console service-account page is not a key.
- `PROMO_ENDS_AT` defaults to `2026-12-31T23:59:59+07:00`: end of 31 December 2026, WIB, because the frame says Akhir Tahun / November–Desember. The 12:08:45:30 counter in Figma is a static mock.
- `PUBLIC_GTAG_ID` stays empty until Google Ads is ready. The tag is not rendered when it is empty.
- `PUBLIC_WHATSAPP_E164` is optional. Empty uses `mailto:voyage@travelkif.com` for the floating button.

Sibling links from the design labels: `https://airport.travelkif.id` and `https://sewa.travelkif.id`.

## Deploy

The Coolify instance base URL was not in the repo or the environment, so the app was not created through the Coolify API. That panel URL is the remaining deploy blocker. A local `POST /api/lead` was checked against the sheet in `.env.example` and Telegram; the test row was removed afterward.
