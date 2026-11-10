import type { APIRoute } from "astro";
import { allowRequest, handleLead } from "../../server/lead";
import { appendLeadRow } from "../../server/sheets";
import { sendTelegramMessage } from "../../server/telegram";

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const result = await handleLead(request, clientAddress || "unknown", {
    now: () => new Date(),
    allow: allowRequest,
    appendRow: appendLeadRow,
    sendTelegram: sendTelegramMessage,
  });
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
