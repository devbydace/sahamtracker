export function formatRupiah(amount: number, compact: boolean = false): string {
  if (isNaN(amount)) return "Rp 0";

  if (compact && Math.abs(amount) >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(2)} M`;
  }
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(2)} Jt`;
  }

  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat("id-ID").format(Math.abs(rounded));
  return `${amount < 0 ? "-Rp " : "Rp "}${formatted}`;
}

export function formatPercent(percent: number, includeSign: boolean = true): string {
  if (isNaN(percent)) return "0.00%";
  const sign = includeSign && percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(2)}%`;
}

export function formatNumber(val: number): string {
  if (isNaN(val)) return "0";
  return new Intl.NumberFormat("id-ID").format(val);
}

export function formatDate(dateInput: Date | string): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function calculateBrokerFee(
  grossAmount: number,
  type: "BUY" | "SELL",
  feeRate?: number
): number {
  if (feeRate !== undefined && feeRate >= 0) {
    return Math.round(grossAmount * (feeRate / 100));
  }
  // Standar sekuritas Indonesia (termasuk PPN & levy):
  // Beli: ~0.15% (0.0015)
  // Jual: ~0.25% (0.0025, termasuk PPh Final 0.1%)
  const rate = type === "BUY" ? 0.0015 : 0.0025;
  return Math.round(grossAmount * rate);
}

export function getIDXTickSize(price: number): number {
  if (price < 200) return 1;
  if (price < 500) return 2;
  if (price < 2000) return 5;
  if (price < 5000) return 10;
  return 25;
}

export function roundToIDXTick(price: number): number {
  if (price <= 0) return 0;
  const tick = getIDXTickSize(price);
  return Math.round(price / tick) * tick;
}

