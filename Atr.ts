import axios from 'axios';

const BINANCE_FUTURES_API_URL = 'https://fapi.binance.com';
const ATR_PERIOD = 3;
const LOOKBACK_PERIOD = 3;

async function getFuturesKlines(
  symbol: string,
  interval: string,
  limit: number = 100,
) {
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
    }));
  } catch (error) {
    console.error('Error fetching Futures klines:', error);
    return [];
  }
}
// Calculate ATR (Average True Range)
export function calculateATR(data: any[], period: number): number[] {
  const atr: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close),
    );

    if (i < period) {
      atr.push(tr);
    } else {
      const prevATR = atr[i - 1] || tr;
      atr.push((prevATR * (period - 1) + tr) / period);
    }
  }
  return atr;
}

// Find the highest high and lowest low over a given period
function getHighLow(data: any[], period: number) {
  const highs = data.slice(-period).map((candle) => candle.high);
  const lows = data.slice(-period).map((candle) => candle.low);
  return {
    previousHigh: Math.max(...highs),
    previousLow: Math.min(...lows),
  };
}

// Generate BUY or SELL signals based on ATR Breakout Strategy
export async function generateSignalATR(SYMBOL, INTERVAL): Promise<any> {
  const klines = await getFuturesKlines(SYMBOL, INTERVAL, 100);

  if (klines.length < ATR_PERIOD || klines.length < LOOKBACK_PERIOD) {
    console.log('Not enough data to calculate indicators.');
    return;
  }

  const atrValues = calculateATR(klines, ATR_PERIOD);
  const { previousHigh, previousLow } = getHighLow(klines, LOOKBACK_PERIOD);

  const lastClose = klines[klines.length - 1].close;
  const lastATR = atrValues[atrValues.length - 1];
  const prevATRs = atrValues.slice(-ATR_PERIOD);
  const isATRBreakout =
    lastATR > Math.max(...prevATRs.slice(0, prevATRs.length - 1));

  if (lastClose > previousHigh && isATRBreakout) {
    return 1;
  } else if (lastClose < previousLow && isATRBreakout) {
    return -1;
  } else {
    return 0;
  }
}

/**
 * Strategy Breakdown
Calculate ATR (Average True Range)

3-period ATR to measure volatility.
Breakout condition: If today's ATR is higher than the last 3 ATR values, a breakout is expected.
Identify Previous High & Low

Look at the last 3 candles to find the highest high and lowest low.
Trade Signal Conditions

BUY Signal 
Price breaks above previous high.
ATR is the highest in the last 3 values (confirming high volatility).
SELL Signal 
Price breaks below previous low.
ATR is the highest in the last 3 values (confirming strong downward momentum).

How This Works
Fetches 1-minute Kline data from Binance Futures API.
Calculates 3-period ATR to detect volatility breakouts.
Finds previous 3-period High & Low for breakout comparison.
Generates Buy/Sell signals:

BUY if price > previous high & ATR is at highest level in 3 periods.
SELL if price < previous low & ATR is at highest level in 3 periods. 


 */
