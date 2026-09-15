/**
 * Indodax Exchange Rate Provider & Testnet Asset Mapping
 *
 * Mengambil kurs live crypto -> IDR dari Indodax API publik,
 * dan memetakan aset testnet (sBTC, Sepolia ETH, Amoy POL, Devnet SOL, Testnet XRP, HTT)
 * ke pasangan perdagangan Indodax riil untuk simulasi valuasi portofolio.
 */

export interface AssetRate {
  readonly symbol: string;
  readonly pair: string;
  readonly priceIdr: number;
  readonly high24h?: number;
  readonly low24h?: number;
  readonly lastUpdated: number;
}

export type RatesMap = Record<string, AssetRate>;

/**
 * Pemetaan simbol aset (baik native testnet maupun token) ke pair Indodax.
 * Catatan: Token kustom HTT di-peg ke kurs USDT/IDR sebagai simulasi utility token.
 */
export const TESTNET_TO_INDODAX_MAP: Record<string, string> = {
  sBTC: 'btc_idr',
  BTC: 'btc_idr',
  ETH: 'eth_idr',
  POL: 'pol_idr',
  SOL: 'sol_idr',
  XRP: 'xrp_idr',
  KAIA: 'kaia_idr',
  USDT: 'usdt_idr',
  HTT: 'usdt_idr', // Pegged to USDT
};

// Fallback rates jika offline atau API timeout saat cold start
const DEFAULT_FALLBACK_RATES: Record<string, number> = {
  btc_idr: 1_380_000_000,
  eth_idr: 45_000_000,
  sol_idr: 1_800_000,
  xrp_idr: 24_000,
  pol_idr: 1_700,
  kaia_idr: 520,
  usdt_idr: 17_500,
};

const CACHE_TTL_MS = 45_000; // 45 detik cache
let inMemoryCache: { rates: RatesMap; timestamp: number } | null = null;
let pendingFetchPromise: Promise<RatesMap> | null = null;

/**
 * Menentukan URL endpoint Indodax yang tepat sesuai lingkungan (Extension, Vite Dev, Node CLI).
 */
function resolveIndodaxEndpoint(): string {
  // 1. Jika di lingkungan browser
  if (typeof window !== 'undefined') {
    // Jika berjalan di Chrome Extension, host_permissions mengizinkan direct fetch
    const isExtension = typeof (window as any).chrome !== 'undefined' && !!(window as any).chrome?.runtime?.id;
    if (isExtension) {
      return 'https://indodax.com/api/tickers';
    }

    // Jika berjalan di web browser (Vite dev proxy / Docker Nginx reverse proxy), gunakan proxy untuk menghindari CORS
    return '/api/indodax/tickers';
  }

  // 2. Lingkungan Node.js / CLI
  return 'https://indodax.com/api/tickers';
}

/**
 * Mengambil kurs live dari Indodax dengan deduping, caching, dan fallback aman.
 */
export async function fetchIndodaxRates(forceRefresh: boolean = false): Promise<RatesMap> {
  const now = Date.now();

  // 1. Cek cache memori
  if (!forceRefresh && inMemoryCache && now - inMemoryCache.timestamp < CACHE_TTL_MS) {
    return inMemoryCache.rates;
  }

  // 2. Cek cache localStorage (jika di browser)
  if (!forceRefresh && typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('indodax_rates_cache');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (now - parsed.timestamp < CACHE_TTL_MS) {
          inMemoryCache = parsed;
          return parsed.rates;
        }
      }
    } catch {
      // Abaikan error parse localStorage
    }
  }

  // 3. Request deduplication: jika ada fetch yang sedang berlangsung, gunakan promise tersebut
  if (pendingFetchPromise) {
    return pendingFetchPromise;
  }

  pendingFetchPromise = (async () => {
    try {
      const endpoint = resolveIndodaxEndpoint();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Indodax API returned status ${res.status}`);
      }

      const json = await res.json();
      const rawTickers = json.tickers || {};

      const mappedRates: RatesMap = {};

      for (const [symbol, pairKey] of Object.entries(TESTNET_TO_INDODAX_MAP)) {
        const ticker = rawTickers[pairKey];
        if (ticker) {
          const price = parseFloat(ticker.last) || 0;
          mappedRates[symbol] = {
            symbol,
            pair: pairKey.toUpperCase().replace('_', '/'),
            priceIdr: price,
            high24h: parseFloat(ticker.high) || undefined,
            low24h: parseFloat(ticker.low) || undefined,
            lastUpdated: now,
          };
        } else if (DEFAULT_FALLBACK_RATES[pairKey]) {
          mappedRates[symbol] = {
            symbol,
            pair: pairKey.toUpperCase().replace('_', '/'),
            priceIdr: DEFAULT_FALLBACK_RATES[pairKey],
            lastUpdated: now,
          };
        }
      }

      // Simpan ke in-memory cache
      inMemoryCache = {
        rates: mappedRates,
        timestamp: now,
      };

      // Simpan ke localStorage jika ada
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('indodax_rates_cache', JSON.stringify(inMemoryCache));
        } catch {
          // ignore storage quota error
        }
      }

      return mappedRates;
    } catch (err) {
      console.warn('Gagal mengambil data rate dari Indodax, menggunakan fallback cache:', err);

      // Gunakan in-memory cache lama jika ada
      if (inMemoryCache) {
        return inMemoryCache.rates;
      }

      // Bangun dari default fallback rates
      const fallbackRates: RatesMap = {};
      for (const [symbol, pairKey] of Object.entries(TESTNET_TO_INDODAX_MAP)) {
        if (DEFAULT_FALLBACK_RATES[pairKey]) {
          fallbackRates[symbol] = {
            symbol,
            pair: pairKey.toUpperCase().replace('_', '/'),
            priceIdr: DEFAULT_FALLBACK_RATES[pairKey],
            lastUpdated: now,
          };
        }
      }
      return fallbackRates;
    } finally {
      pendingFetchPromise = null;
    }
  })();

  return pendingFetchPromise;
}

/**
 * Format angka numerik ke format Rupiah standar Indonesia.
 * Contoh: 45825000 -> "Rp 45.825.000"
 * Contoh: 24534.8 -> "Rp 24.535"
 */
export function formatIDR(amount: number, compact: boolean = false): string {
  if (isNaN(amount) || amount === 0) {
    return 'Rp 0';
  }

  if (compact) {
    if (amount >= 1_000_000_000) {
      return `Rp ${(amount / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
    }
    if (amount >= 1_000_000) {
      return `Rp ${(amount / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} Jt`;
    }
  }

  // Jika nilainya sangat kecil (< Rp 10) tampilkan 2 desimal
  if (Math.abs(amount) > 0 && Math.abs(amount) < 10) {
    return `Rp ${amount.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

/**
 * Menghitung nilai IDR dari sejumlah saldo crypto string (e.g. "0.05" sBTC).
 */
export function calculateIDRValue(
  formattedAmount: string | null | undefined,
  symbol: string,
  rates: RatesMap
): number {
  if (!formattedAmount) return 0;
  const num = parseFloat(formattedAmount.replace(/,/g, ''));
  if (isNaN(num) || num <= 0) return 0;

  const rate = rates[symbol]?.priceIdr;
  if (!rate) return 0;

  return num * rate;
}
