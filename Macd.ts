import axios from 'axios';

const BINANCE_FUTURES_API_URL = 'https://fapi.binance.com';
const SHORT_EMA_PERIOD = 6; // Fast EMA for MACD
const LONG_EMA_PERIOD = 12; // Slow EMA for MACD
const SIGNAL_PERIOD = 3; // Signal Line EMA
const FETCH_LIMIT = 200; // Number of candles to fetch

// Define the structure of a Kline
interface Kline {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
    })) as Kline[];
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error fetching Futures Klines:', error.message);
    } else {
      console.error('Unknown error fetching Futures Klines:', error);
    }
    return [];
  }
}

// Calculate EMA (Exponential Moving Average)
function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) {
    console.error(`Not enough data to compute EMA(${period})`);
    return [];
  }

  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // Compute the first EMA value using SMA
  const sum = data.slice(0, period).reduce((acc, val) => acc + val, 0);
  const firstEMA = sum / period;
  ema.push(firstEMA);

  // Compute remaining EMA values
  for (let i = period; i < data.length; i++) {
    const emaValue =
      (data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(emaValue);
  }

  return ema;
}

// Calculate MACD, Signal Line, and Histogram
export function calculateMACD(data: number[]) {
  if (data.length < LONG_EMA_PERIOD) {
    console.error('Not enough data for MACD calculation.');
    return { macdLine: [], signalLine: [], histogram: [] };
  }

  const shortEMA = calculateEMA(data, SHORT_EMA_PERIOD);
  const longEMA = calculateEMA(data, LONG_EMA_PERIOD);

  if (shortEMA.length === 0 || longEMA.length === 0)
    return { macdLine: [], signalLine: [], histogram: [] };

  const macdLine: number[] = [];
  for (let i = 0; i < longEMA.length; i++) {
    macdLine.push(
      shortEMA[i + (LONG_EMA_PERIOD - SHORT_EMA_PERIOD)] - longEMA[i],
    );
  }

  const signalLine = calculateEMA(macdLine, SIGNAL_PERIOD);
  const histogram: number[] = [];
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + (SIGNAL_PERIOD - 1)] - signalLine[i]);
  }

  return { macdLine, signalLine, histogram };
}

// Generate BUY or SELL signals based on MACD crossovers
export async function MacdgenerateSignal(SYMBOL, INTERVAL): Promise<any> {
  const klines: Kline[] = await getFuturesKlines(SYMBOL, INTERVAL, FETCH_LIMIT);

  if (klines.length < LONG_EMA_PERIOD) {
    console.log('Not enough Kline data for MACD calculation.');
    return;
  }

  const closePrices: number[] = klines.map((kline: Kline) => kline.close);
  const { macdLine, signalLine, histogram } = calculateMACD(closePrices);

  if (
    macdLine.length === 0 ||
    signalLine.length === 0 ||
    histogram.length === 0
  ) {
    console.log('MACD calculation failed. Skipping signal check.');
    return;
  }

  const lastMACD = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  const prevMACD = macdLine[macdLine.length - 2];
  const prevSignal = signalLine[signalLine.length - 2];

  if (lastMACD > lastSignal && prevMACD < prevSignal) {
    return 1;
  } else if (lastMACD < lastSignal && prevMACD > prevSignal) {
    return -1;
  } else {
    return 0;
  }
}

/**Strategy Overview
Calculate MACD:

MACD Line = 12-period EMA - 26-period EMA
Signal Line = 9-period EMA of MACD Line
Histogram = MACD Line - Signal Line
Trade Signal Conditions

BUY Signal
MACD Line crosses above Signal Line (bullish crossover).
SELL Signal
MACD Line crosses below Signal Line (bearish crossover).

How This Works
Fetches 1-minute Kline data from Binance Futures API.
Calculates MACD, Signal Line, and Histogram using:

12-period EMA (fast)
26-period EMA (slow)
9-period EMA of MACD Line (signal) Generates Buy/Sell signals:
BUY if MACD Line crosses above Signal Line (bullish crossover).
SELL if MACD Line crosses below Signal Line (bearish crossover).

*/
