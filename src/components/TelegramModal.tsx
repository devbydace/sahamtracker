"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X,
  Send,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Bell,
  Sparkles,
  ExternalLink,
  Globe,
} from "lucide-react";
import {
  getTelegramSettingsAction,
  saveTelegramSettingsAction,
  testTelegramMessageAction,
  sendTelegramPortfolioReportAction,
  setTelegramWebhookAction,
  getTelegramWebhookInfoAction,
  deleteTelegramWebhookAction,
} from "@/app/actions";

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TelegramModal({ isOpen, onClose }: TelegramModalProps) {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [notifyTrades, setNotifyTrades] = useState(true);
  const [notifyDividends, setNotifyDividends] = useState(true);
  const [notifyCash, setNotifyCash] = useState(true);

  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const [isSaving, startTransitionSave] = useTransition();
  const [isTesting, startTransitionTest] = useTransition();
  const [isSendingReport, startTransitionReport] = useTransition();
  const [isSettingWebhook, startTransitionWebhook] = useTransition();
  const [appUrl, setAppUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      getTelegramSettingsAction().then((res) => {
        if (res.success && res.config) {
          setBotToken(res.config.botToken || "");
          setChatId(res.config.chatId || "");
          setNotifyTrades(res.config.notifyTrades);
          setNotifyDividends(res.config.notifyDividends);
          setNotifyCash(res.config.notifyCash);
        }
      });

      getTelegramWebhookInfoAction().then((res) => {
        if (res.success && res.info && res.info.url) {
          setWebhookUrl(res.info.url);
        } else {
          setWebhookUrl(null);
        }
      });

      if (typeof window !== "undefined" && window.location.origin) {
        if (!window.location.origin.includes("localhost")) {
          setAppUrl(window.location.origin);
        }
      }
    }
  }, [isOpen]);

  const handleSetWebhook = () => {
    if (!appUrl.trim()) {
      setStatusMessage({
        type: "error",
        text: "Silakan masukkan domain Vercel Anda (contoh: https://tracking-saham.vercel.app)",
      });
      return;
    }

    startTransitionWebhook(async () => {
      const res = await setTelegramWebhookAction(appUrl);
      if (res.success && res.webhookUrl) {
        setWebhookUrl(res.webhookUrl);
        setStatusMessage({
          type: "success",
          text: `Webhook berhasil diaktifkan 24/7 ke: ${res.webhookUrl}`,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: `Gagal mengatur webhook: ${res.error}`,
        });
      }
    });
  };

  const handleDeleteWebhook = () => {
    startTransitionWebhook(async () => {
      const res = await deleteTelegramWebhookAction();
      if (res.success) {
        setWebhookUrl(null);
        setStatusMessage({
          type: "success",
          text: "Webhook cloud dinonaktifkan. Bot kembali ke mode polling lokal.",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: `Gagal: ${res.error}`,
        });
      }
    });
  };

  if (!isOpen) return null;

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setStatusMessage(null);

    startTransitionSave(async () => {
      const res = await saveTelegramSettingsAction({
        botToken,
        chatId,
        notifyTrades,
        notifyDividends,
        notifyCash,
      });

      if (res.success) {
        setStatusMessage({
          type: "success",
          text: "Pengaturan integrasi Telegram berhasil disimpan!",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Gagal menyimpan pengaturan.",
        });
      }
    });
  };

  const handleTest = () => {
    if (!botToken.trim() || !chatId.trim()) {
      setStatusMessage({
        type: "error",
        text: "Silakan isi Bot Token dan Chat ID terlebih dahulu.",
      });
      return;
    }

    setStatusMessage(null);
    startTransitionTest(async () => {
      const res = await testTelegramMessageAction(botToken, chatId);
      if (res.success) {
        setStatusMessage({
          type: "success",
          text: "Pesan uji coba terkirim! Silakan periksa aplikasi Telegram Anda.",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: `Gagal mengirim: ${res.error}`,
        });
      }
    });
  };

  const handleSendReport = () => {
    setStatusMessage(null);
    startTransitionReport(async () => {
      const res = await sendTelegramPortfolioReportAction();
      if (res.success) {
        setStatusMessage({
          type: "success",
          text: "Rekap portofolio lengkap berhasil dikirim ke Telegram!",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: `Gagal mengirim rekap: ${res.error}`,
        });
      }
    });
  };

  const isConfigured = Boolean(botToken && chatId);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Integrasi Bot Telegram
                {isConfigured && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Terhubung
                  </span>
                )}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                statusMessage.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span className="font-medium leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* Quick Action: Send Full Report */}
          {isConfigured && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/40 to-slate-950 border border-sky-800/40 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">
                  Kirim Rekap Portofolio Sekarang
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Kirim ringkasan lengkap nilai aset, floating PnL, & target DCA ke HP
                </span>
              </div>
              <button
                onClick={handleSendReport}
                disabled={isSendingReport}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow-md shadow-sky-500/20 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingReport ? "Mengirim..." : "Kirim Rekap"}</span>
              </button>
            </div>
          )}

          {/* Configuration Form */}
          <form onSubmit={handleSave} className="space-y-4">
            {/* Bot Token */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Telegram Bot Token
                </label>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
                >
                  {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showToken ? "Sembunyikan" : "Tampilkan"}</span>
                </button>
              </div>
              <input
                type={showToken ? "text" : "password"}
                placeholder="e.g. 7123456789:AAHq..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Chat ID */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Chat ID Telegram Penerima
              </label>
              <input
                type="text"
                placeholder="e.g. 123456789 atau -100xxxxxxxxxx"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Notification Toggles */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <span className="text-xs font-semibold text-slate-300 block">
                Notifikasi Otomatis:
              </span>

              <label className="flex items-center justify-between cursor-pointer text-xs text-slate-300">
                <span>Notifikasi transaksi Beli / Jual saham</span>
                <input
                  type="checkbox"
                  checked={notifyTrades}
                  onChange={(e) => setNotifyTrades(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-xs text-slate-300">
                <span>Notifikasi saat Dividen saham masuk</span>
                <input
                  type="checkbox"
                  checked={notifyDividends}
                  onChange={(e) => setNotifyDividends(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-xs text-slate-300">
                <span>Notifikasi mutasi kas RDN (Setor / Tarik)</span>
                <input
                  type="checkbox"
                  checked={notifyCash}
                  onChange={(e) => setNotifyCash(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-0"
                />
              </label>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !botToken || !chatId}
                className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isTesting ? "Menguji..." : "Kirim Uji Coba"}
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-sky-500/20 disabled:opacity-50"
              >
                {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
              </button>
            </div>
          </form>

          {/* Serverless Cloud Webhook 24/7 Section */}
          <div className="pt-2 border-t border-slate-800">
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sky-400" />
                  Mode Cloud Serverless 24/7 (Vercel)
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    webhookUrl
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {webhookUrl ? "Webhook Aktif" : "Mode Polling"}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {webhookUrl
                  ? `Bot merespon otomatis 24 jam di cloud melalui webhook Vercel:`
                  : "Untuk menjalankan bot 24 jam tanpa menyalakan laptop, pasang URL deployment Vercel Anda di sini."}
              </p>

              {webhookUrl ? (
                <div className="space-y-2 pt-1">
                  <div className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono break-all">
                    {webhookUrl}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleDeleteWebhook}
                      disabled={isSettingWebhook}
                      className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                    >
                      {isSettingWebhook ? "Memproses..." : "Kembali ke Polling Lokal"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <input
                    type="text"
                    placeholder="https://tracking-saham.vercel.app"
                    value={appUrl}
                    onChange={(e) => setAppUrl(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleSetWebhook}
                    disabled={isSettingWebhook || !appUrl}
                    className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow transition-all disabled:opacity-50"
                  >
                    {isSettingWebhook ? "Menghubungkan Webhook..." : "Aktifkan Webhook Cloud 24/7"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Setup Guide Accordion */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                Cara Membuat Bot & Mendapatkan Chat ID
              </span>
              {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showGuide && (
              <div className="mt-2.5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-2 leading-relaxed">
                <div className="flex gap-2">
                  <span className="font-bold text-sky-400">1.</span>
                  <div>
                    Buka Telegram, cari akun resmi <code>@BotFather</code>. Ketik <code>/newbot</code>, berikan nama untuk bot Anda (misal: <i>MyPortoBot</i>).
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-sky-400">2.</span>
                  <div>
                    Salin <b>HTTP API Token</b> yang diberikan BotFather (contoh: <code>7123456789:AAH...</code>) dan tempel ke kolom <i>Telegram Bot Token</i> di atas.
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-sky-400">3.</span>
                  <div>
                    Untuk mengetahui <b>Chat ID</b> Anda, cari akun <code>@userinfobot</code> di Telegram dan klik Start. Salin angka <b>Id</b> Anda (contoh: <code>123456789</code>).
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="font-bold text-sky-400">4.</span>
                  <div>
                    Buka bot yang baru saja Anda buat di Telegram, lalu klik <b>Start</b> agar bot memiliki izin untuk mengirim pesan ke Anda.
                  </div>
                </div>
                <div className="pt-1 text-[10px] text-slate-500">
                  Tip: Perintah Telegram interaktif seperti <code>/portfolio</code>, <code>/harga BBCA</code>, dan <code>/dca</code> didukung melalui webhook API <code>/api/telegram/webhook</code>.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

