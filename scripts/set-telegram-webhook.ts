import { getTelegramConfig } from "../src/lib/telegram";

async function main() {
  const action = (process.argv[2] || "").toLowerCase();
  const inputUrl = process.argv[3];

  const config = await getTelegramConfig();
  if (!config.botToken) {
    console.error("❌ Bot Token tidak ditemukan di database atau environment variable!");
    process.exit(1);
  }

  const token = config.botToken;

  if (action === "set" || action === "activate") {
    if (!inputUrl) {
      console.error("❌ Mohon sertakan URL deployment Vercel Anda!");
      console.log("Contoh: npx tsx scripts/set-telegram-webhook.ts set https://tracking-saham.vercel.app");
      process.exit(1);
    }

    const cleanBaseUrl = inputUrl.trim().replace(/\/+$/, "");
    const webhookUrl = `${cleanBaseUrl}/api/telegram/webhook`;

    console.log(`📡 Mendaftarkan webhook ke Telegram: ${webhookUrl}...`);
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });

    const data = await res.json();
    if (data.ok) {
      console.log("✅ Webhook berhasil diaktifkan 24/7 di cloud!");
      console.log("👉 Bot Telegram Anda sekarang dapat membalas pesan tanpa perlu laptop menyala!");
    } else {
      console.error("❌ Gagal mengatur webhook:", data.description);
    }
  } else if (action === "clear" || action === "delete") {
    console.log("🔄 Menghapus webhook (kembali ke mode polling lokal)...");
    const res = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    const data = await res.json();
    console.log(data.ok ? "✅ Webhook dihapus. Bot siap polling di localhost." : data.description);
  } else {
    console.log("🔍 Mengecek status webhook Telegram saat ini...");
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await res.json();
    console.log("Status Webhook:", JSON.stringify(data.result, null, 2));
  }
}

main().catch(console.error);
