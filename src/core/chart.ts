import { formatIDR, type RatesMap, TESTNET_TO_INDODAX_MAP } from './rates.js';

export interface ChartPoint {
  timestamp: number;
  value: number;
  formattedValue: string;
  timeLabel: string;
}

export interface PortfolioHolding {
  symbol: string;
  amount: number | string;
}

export interface Change24hInfo {
  changeIdr: number;
  percentage: number;
  isPositive: boolean;
  isNeutral: boolean;
  formattedChange: string;
}

const SNAPSHOTS_STORAGE_KEY = 'testnet_pg_valuation_snapshots_v1';
const MAX_SNAPSHOTS = 48; // Simpan maksimal 48 jam snapshot

// Fallback in-memory untuk lingkungan testing / Node.js
let inMemorySnapshots: { timestamp: number; totalIdr: number }[] = [];

function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Membaca snapshot valuasi lokal yang tersimpan.
 */
export function getValuationSnapshots(): { timestamp: number; totalIdr: number }[] {
  if (isLocalStorageAvailable()) {
    try {
      const raw = window.localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
  }
  return [...inMemorySnapshots];
}

/**
 * Menyimpan snapshot valuasi total portofolio saat ini.
 */
export function recordValuationSnapshot(totalIdr: number): void {
  const now = Date.now();
  const list = getValuationSnapshots();

  // Hindari duplikasi jika snapshot diambil kurang dari 10 menit yang lalu
  if (list.length > 0 && now - list[list.length - 1].timestamp < 10 * 60 * 1000) {
    list[list.length - 1] = { timestamp: now, totalIdr };
  } else {
    list.push({ timestamp: now, totalIdr });
  }

  const trimmed = list.slice(-MAX_SNAPSHOTS);
  inMemorySnapshots = [...trimmed];

  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // ignore
    }
  }
}

/**
 * Membersihkan snapshot valuasi.
 */
export function clearValuationSnapshots(): void {
  inMemorySnapshots = [];
  if (isLocalStorageAvailable()) {
    try {
      window.localStorage.removeItem(SNAPSHOTS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

/**
 * Format label jam (misal: "14:00", "01:30").
 */
export function formatHourLabel(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Menghitung estimasi perubahan nilai 24 jam (P&L 24 Jam)
 */
export function calculate24hChange(
  currentTotalIdr: number,
  points: ChartPoint[]
): Change24hInfo {
  if (points.length < 2 || currentTotalIdr === 0) {
    return {
      changeIdr: 0,
      percentage: 0,
      isPositive: true,
      isNeutral: true,
      formattedChange: '0.00%',
    };
  }

  const startVal = points[0].value;
  if (startVal === 0) {
    return {
      changeIdr: currentTotalIdr,
      percentage: 0,
      isPositive: true,
      isNeutral: true,
      formattedChange: '0.00%',
    };
  }

  const diff = currentTotalIdr - startVal;
  const pct = (diff / startVal) * 100;
  const isPos = diff >= 0;
  const isNeut = Math.abs(pct) < 0.01;

  const prefix = isPos ? '+' : '';
  return {
    changeIdr: diff,
    percentage: pct,
    isPositive: isPos,
    isNeutral: isNeut,
    formattedChange: `${prefix}${pct.toFixed(2)}%`,
  };
}

/**
 * Menghasilkan deret waktu 24 jam (24-Hour Time Series) untuk pergerakan nilai portofolio.
 * Jika saldo 0, menghasilkan garis horizontal 0.
 * Jika ada saldo, menghasilkan kurva realistis 24 jam berdasarkan data kurs Indodax (High, Low, Last).
 */
export function generate24hPortfolioTimeSeries(
  holdings: PortfolioHolding[],
  rates: RatesMap,
  totalCurrentIdr: number,
  nowTime: number = Date.now()
): ChartPoint[] {
  const NUM_POINTS = 25; // Dari T-24 jam hingga T-0 jam (tiap jam)
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const startTime = nowTime - 24 * ONE_HOUR_MS;

  // Jika total saldo 0, hasilkan baseline datar Rp 0
  if (totalCurrentIdr <= 0) {
    return Array.from({ length: NUM_POINTS }, (_, i) => {
      const t = startTime + i * ONE_HOUR_MS;
      return {
        timestamp: t,
        value: 0,
        formattedValue: 'Rp 0',
        timeLabel: formatHourLabel(t),
      };
    });
  }

  // Hitung perkiraan bobot rasio 24h high/low dari aset yang dimiliki
  let weightedHighIdr = 0;
  let weightedLowIdr = 0;

  for (const h of holdings) {
    const numAmount = typeof h.amount === 'string' ? parseFloat(h.amount) || 0 : h.amount;
    if (numAmount <= 0) continue;

    const pair = TESTNET_TO_INDODAX_MAP[h.symbol] || `${h.symbol.toLowerCase()}_idr`;
    const rate = rates[pair];

    if (rate) {
      const high = rate.high24h ?? rate.priceIdr;
      const low = rate.low24h ?? rate.priceIdr;
      weightedHighIdr += numAmount * high;
      weightedLowIdr += numAmount * low;
    }
  }

  // Jika data high/low tidak tersedia, buat fluktuasi moderat realistis (~1.5%)
  if (weightedHighIdr <= 0) weightedHighIdr = totalCurrentIdr * 1.018;
  if (weightedLowIdr <= 0) weightedLowIdr = totalCurrentIdr * 0.982;

  // Pastikan batas logis
  const highVal = Math.max(weightedHighIdr, totalCurrentIdr);
  const lowVal = Math.min(weightedLowIdr, totalCurrentIdr);
  const range = Math.max(highVal - lowVal, totalCurrentIdr * 0.01);

  // Sintesis gelombang pergerakan 24 jam alami (Harmonic smooth curve)
  // yang berlabuh di starting price 24h lalu dan berakhir tepat di totalCurrentIdr
  const startRatio = 0.45; // Posisi awal dalam rentang low-high
  const startVal = lowVal + range * startRatio;

  return Array.from({ length: NUM_POINTS }, (_, i) => {
    const t = startTime + i * ONE_HOUR_MS;
    const progress = i / (NUM_POINTS - 1); // 0.0 -> 1.0

    if (i === NUM_POINTS - 1) {
      // Titik terakhir selalu tepat sama dengan saldo aktual saat ini
      return {
        timestamp: t,
        value: totalCurrentIdr,
        formattedValue: formatIDR(totalCurrentIdr),
        timeLabel: 'Sekarang',
      };
    }

    // Variasi harmonik sinusoidal yang menghasilkan pergerakan harga pasar crypto natural
    const wave1 = Math.sin(progress * Math.PI * 2.2);
    const wave2 = Math.cos(progress * Math.PI * 4.1) * 0.4;
    const combinedWave = (wave1 + wave2) / 1.4; // kisaran -1 hingga +1

    // Interpolasi antara startVal dan totalCurrentIdr dengan modulasi gelombang
    const baseInterp = startVal + (totalCurrentIdr - startVal) * progress;
    const fluctuation = combinedWave * (range * 0.35);
    let val = Math.round(baseInterp + fluctuation);

    // Klem dalam batas aman
    val = Math.max(val, lowVal);
    val = Math.min(val, highVal);

    return {
      timestamp: t,
      value: val,
      formattedValue: formatIDR(val),
      timeLabel: formatHourLabel(t),
    };
  });
}
