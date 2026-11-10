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

One new row on the **Private Trip** tab, columns A–N:

`time`, `service`, `destination`, `date`, `departure time`, `passengers`, `luggage`, `Indonesian driver`, `name`, `WhatsApp`, `notes`, `promo code`, `UTM`, `page`.

The form asks for destinasi as free text. The API only appends data rows. Share the sheet with the service account email.

A Telegram message follows the row. It includes name, contact, product, and the submission time. If the stored chat was upgraded to a supergroup, the send is retried once with Telegram's new chat id. If the sheet or Telegram call fails, the visitor sees a failure and the success animation does not play.

## Coolify

Application folder: **TravelKIF**. Domain: `privatetrip.travelkif.id` with HTTPS, only when DNS already points at this host. Build with the repo `Dockerfile`. The server listens on `0.0.0.0:$PORT`.

Set the names in `.env.example` on the app. Do not commit values.

- `SHEET_ID` is the spreadsheet id. A 40-character hex string is rejected before any Google call.
- `GOOGLE_SHEETS_KEY` is the full service-account JSON. `GOOGLE_SERVICE_ACCOUNT_EMAIL` must match `client_email` in that JSON.
- `UMAMI_SRC` and `UMAMI_WEBSITE_ID` load the analytics script. Both are required.
- `PROMO_ENDS_AT` defaults to `2026-12-31T23:59:59+07:00`: end of 31 December 2026, WIB, because the frame says Akhir Tahun / November–Desember. The 12:08:45:30 counter in Figma is a static mock.
- `PUBLIC_GTAG_ID` stays empty until Google Ads is ready. The tag is not rendered when it is empty.

Sibling links: `https://airtransfer.travelkif.id` and `https://privatetransport.travelkif.id`.
