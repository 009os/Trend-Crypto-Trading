import axios from 'axios';

const BINANCE_API_URL = 'https://fapi.binance.com';
const EMA_PERIOD = 3;

interface Kline {
  time: string;
  close: number;
}
async function getKlines(
  symbol: string,
  interval: string,
  limit: number = 100,
): Promise<Kline[]> {
  try {
    const response = await axios.get(`${BINANCE_API_URL}/fapi/v1/klines`, {
      params: { symbol, interval, limit },
    });

    return (response.data as any[][]).map((kline: any) => ({
      time: new Date(kline[0]).toISOString(),
      close: parseFloat(kline[4]),
    })) as Kline[];
  } catch (error) {
    console.error(
      'Error fetching klines:',
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
// Calculate Exponential Moving Average (EMA)
export function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) {
    console.error('Not enough data for EMA calculation.');
    return [];
  }

  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // First EMA value is just the SMA of the first `period` elements
  const sma = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  ema.push(sma);

  // Calculate EMA using the formula
  for (let i = period; i < data.length; i++) {
    const emaValue =
      (data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(emaValue);
  }

  return ema;
}

// Generate Buy/Sell signals based on EMA
export async function generateEMASignal(SYMBOL, INTERVAL): Promise<any> {
  const klines = await getKlines(SYMBOL, INTERVAL, 100);

  if (klines.length < EMA_PERIOD) {
    console.log(
      'Not enough Kline data for Exponential Moving Average calculation.',
    );
    return;
  }

  const closePrices = klines.map((k) => k.close);
  const exponentialMovingAverages = calculateEMA(closePrices, EMA_PERIOD);

  if (exponentialMovingAverages.length === 0) {
    console.log('EMA calculation failed.');
    return;
  }

  const lastClose = closePrices[closePrices.length - 1];
  const lastEMA =
    exponentialMovingAverages[exponentialMovingAverages.length - 1];

  if (lastClose > lastEMA) {
    return 1;
  } else if (lastClose < lastEMA) {
    return -1;
  } else {
    return 0;
  }
}
