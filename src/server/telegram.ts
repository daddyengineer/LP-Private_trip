async function postMessage(token: string, chatId: string, text: string): Promise<Response> {
  return fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
}

export async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
  if (!token || !chatId) throw new Error("telegram_not_configured");
  const response = await postMessage(token, chatId, text);
  if (response.ok) return;
  const body = (await response.json().catch(() => null)) as {
    parameters?: { migrate_to_chat_id?: number };
  } | null;
  const migrated = body?.parameters?.migrate_to_chat_id;
  if (!migrated) throw new Error("telegram_send_failed");
  const retry = await postMessage(token, String(migrated), text);
  if (!retry.ok) throw new Error("telegram_send_failed");
}
