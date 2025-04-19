import axios from 'axios';

const BINANCE_API_URL = 'https://fapi.binance.com';
const BB_PERIOD = 3;

interface BollingerBand {
  middle: number;
  upper: number;
  lower: number;
}

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
      ' Error fetching klines:',
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

//  Calculate Bollinger Bands (Middle, Upper, Lower)
export function calculateBollingerBands(
  data: number[],
  period: number,
): BollingerBand[] {
  if (data.length < period) {
    console.error(' Not enough data for Bollinger Bands calculation.');
    return [];
  }

  const bands: BollingerBand[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const slicedData = data.slice(i - period + 1, i + 1);
    const mean = slicedData.reduce((acc, val) => acc + val, 0) / period;
    const variance =
      slicedData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      period;
    const stdDev = Math.sqrt(variance);

    bands.push({
      middle: mean,
      upper: mean + 3 * stdDev,
      lower: mean - 3 * stdDev,
    });
  }
  return bands;
}

//  Generate Buy/Sell signals based on Bollinger Bands
export async function generateBollingerSignal(SYMBOL, INTERVAL): Promise<any> {
  const klines = await getKlines(SYMBOL, INTERVAL, 100);

  if (klines.length < BB_PERIOD) {
    console.log(' Not enough Kline data for Bollinger Bands calculation.');
    return;
  }

  const closePrices = klines.map((k) => k.close);
  const bollingerBands = calculateBollingerBands(closePrices, BB_PERIOD);

  if (bollingerBands.length === 0) {
    console.log('Bollinger Bands calculation failed.');
    return;
  }

  const lastClose = closePrices[closePrices.length - 1];
  const lastBB: BollingerBand = bollingerBands[bollingerBands.length - 1];
  if (lastClose <= lastBB.lower) {
    return 1;
  } else if (lastClose >= lastBB.upper) {
    return -1;
  } else {
    return 0;
  }
}
