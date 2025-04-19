import axios from 'axios';

const BINANCE_FUTURES_API_URL = 'https://fapi.binance.com';
const RSI_PERIOD = 3; // RSI Calculation Period
const FETCH_LIMIT = 100; // Number of candles to fetch

interface Kline {
  time: string;
  close: number;
}

async function getFuturesKlines(
  symbol: string,
  interval: string,
  limit: number,
): Promise<Kline[]> {
  try {
    const response = await axios.get(
      `${BINANCE_FUTURES_API_URL}/fapi/v1/klines`,
      {
        params: { symbol, interval, limit },
      },
    );

    return (response.data as any[][]).map((kline: any) => ({
      time: new Date(kline[0]).toISOString(),
      close: parseFloat(kline[4]),
    })) as Kline[];
  } catch (error: unknown) {
    console.error(
      ' Error fetching Futures Klines:',
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

// Calculate RSI (Relative Strength Index)
export function calculateRSI(data: number[], period: number): number[] {
  if (data.length < period) {
    console.error(' Not enough data for RSI calculation.');
    return [];
  }

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }

  let avgGain =
    gains.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  let avgLoss =
    losses.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi: number[] = [100 - 100 / (1 + rs)];

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  return rsi;
}

// Generate Buy/Sell signals based on RSI only
export async function generateRSISignal(SYMBOL, INTERVAL): Promise<any> {
  const klines: Kline[] = await getFuturesKlines(SYMBOL, INTERVAL, FETCH_LIMIT);

  if (klines.length < RSI_PERIOD) {
    console.log(' Not enough Kline data for RSI calculation.');
    return;
  }

  const closePrices: number[] = klines.map((kline: Kline) => kline.close);
  const rsiValues = calculateRSI(closePrices, RSI_PERIOD);

  if (rsiValues.length === 0) {
    console.log(' RSI calculation failed. Skipping signal check.');
    return;
  }

  const lastRSI = rsiValues[rsiValues.length - 1];

  if (lastRSI < 30) {
    return 1;
  } else if (lastRSI > 70) {
    return -1;
  } else {
    return 0;
  }
}
