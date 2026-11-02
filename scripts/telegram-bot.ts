import { getTelegramConfig } from "../src/lib/telegram";
import { handleTelegramMessage } from "../src/lib/telegram-handler";

async function runTelegramPoller() {
  console.log("==========================================");
  console.log("  SahamTracker Telegram Bot Polling Service");
  console.log("==========================================");

  let config = await getTelegramConfig();

  if (!config.botToken) {
    console.error("❌ Telegram bot token belum diatur di database!");
    console.log("Buka http://localhost:3000 dan isi token bot di menu Telegram.");
    process.exit(1);
  }

  const token = config.botToken;

  // 1. Delete webhook if active so getUpdates works
  try {
    const delRes = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    const delData = await delRes.json();
    console.log("📡 Webhook status cleared for long polling:", delData.description || "OK");
  } catch (err) {
    console.warn("Could not delete webhook:", err);
  }

  console.log("✅ Bot aktif dan sedang mendengarkan pesan dari Telegram...");
  console.log("👉 Coba ketik /start, /portfolio, atau /analisa BBCA di Telegram Anda!\n");

  let offset = 0;

  while (true) {
    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=20`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;

          const msg = update.message || update.channel_post;
          if (msg && msg.text && msg.chat) {
            const chatId = msg.chat.id.toString();
            const text = msg.text.trim();
            const fromUser = msg.from?.first_name || msg.from?.username || chatId;

            console.log(`📩 [Pesan Diterima] Dari: ${fromUser} (${chatId}) -> "${text}"`);

            try {
              await handleTelegramMessage(chatId, text);
              console.log(`✅ [Terkirim] Respon berhasil dikirim ke ${fromUser}`);
            } catch (handleErr) {
              console.error(`❌ Gagal memproses perintah "${text}":`, handleErr);
            }
          }
        }
      } else if (!data.ok) {
        console.warn("Telegram getUpdates returned not ok:", data);
        await new Promise((r) => setTimeout(r, 5000));
      }
    } catch (pollErr: any) {
      console.error("Polling network error:", pollErr.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

runTelegramPoller().catch((err) => {
  console.error("Fatal poller error:", err);
});

