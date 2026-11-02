import { NextRequest, NextResponse } from "next/server";
import { getTelegramConfig, sendTelegramMessage } from "@/lib/telegram";
import { handleTelegramMessage } from "@/lib/telegram-handler";

export async function POST(req: NextRequest) {
  try {
    const config = await getTelegramConfig();
    if (!config.botToken) {
      return NextResponse.json({ error: "Telegram bot token not configured" }, { status: 400 });
    }

    const body = await req.json();

    const message = body.message || body.channel_post;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id.toString();
    const text = message.text.trim();

    if (!config.chatId) {
      await sendTelegramMessage(
        `👋 <b>Halo!</b>\n\nChat ID Telegram Anda adalah:\n<code>${chatId}</code>\n\nSilakan masukkan Chat ID ini di pengaturan aplikasi SahamTracker untuk mengaktifkan sinkronisasi.`,
        { chatId }
      );
      return NextResponse.json({ ok: true });
    }

    await handleTelegramMessage(chatId, text);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    service: "SahamTracker Telegram Webhook Endpoint",
  });
}
