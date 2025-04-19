import axios from 'axios';

const BINANCE_FUTURES_API_URL = 'https://fapi.binance.com';
const ADX_PERIOD = 3;

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

// Calculate True Range (TR), +DI, -DI, and ADX
export function calculateADX(data: any[], period: number) {
  const trArray: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const smoothedTR: number[] = [];
  const smoothedPlusDM: number[] = [];
  const smoothedMinusDM: number[] = [];
  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const dxArray: number[] = [];
  const adx: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    const prevHigh = data[i - 1].high;
    const prevLow = data[i - 1].low;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose),
    );
    trArray.push(tr);

    const plusDMValue =
      high - prevHigh > prevLow - low ? Math.max(high - prevHigh, 0) : 0;
    const minusDMValue =
      prevLow - low > high - prevHigh ? Math.max(prevLow - low, 0) : 0;

    plusDM.push(plusDMValue);
    minusDM.push(minusDMValue);

    if (i >= period) {
      const trSum = trArray
        .slice(i - period, i)
        .reduce((acc, val) => acc + val, 0);
      const plusDMSum = plusDM
        .slice(i - period, i)
        .reduce((acc, val) => acc + val, 0);
      const minusDMSum = minusDM
        .slice(i - period, i)
        .reduce((acc, val) => acc + val, 0);

      smoothedTR.push(trSum);
      smoothedPlusDM.push(plusDMSum);
      smoothedMinusDM.push(minusDMSum);

      const plusDIValue = (plusDMSum / trSum) * 100;
      const minusDIValue = (minusDMSum / trSum) * 100;

      plusDI.push(plusDIValue);
      minusDI.push(minusDIValue);

      const dx =
        (Math.abs(plusDIValue - minusDIValue) / (plusDIValue + minusDIValue)) *
        100;
      dxArray.push(dx);

      if (dxArray.length >= period) {
        const adxValue =
          dxArray.slice(-period).reduce((acc, val) => acc + val, 0) / period;
        adx.push(adxValue);
      }
    }
  }

  return {
    plusDI,
    minusDI,
    adx,
  };
}

// Generate BUY or SELL signals based on ADX & DI indicators
export async function getADXSignal(
  SYMBOL: string,
  INTERVAL: string,
): Promise<any> {
  const klines = await getFuturesKlines(SYMBOL, INTERVAL, 100);

  if (klines.length < ADX_PERIOD) {
    console.log('Not enough data to calculate ADX.');
    return null;
  }

  const { plusDI, minusDI, adx } = calculateADX(klines, ADX_PERIOD);
  const lastADX = adx[adx.length - 1];
  const lastPlusDI = plusDI[plusDI.length - 1];
  const lastMinusDI = minusDI[minusDI.length - 1];
  const prevPlusDI = plusDI[plusDI.length - 2];
  const prevMinusDI = minusDI[minusDI.length - 2];
  if (lastPlusDI > lastMinusDI && prevPlusDI < prevMinusDI && lastADX > 25) {
    return 1;
  } else if (
    lastMinusDI > lastPlusDI &&
    prevMinusDI < prevPlusDI &&
    lastADX > 25
  ) {
    return -1;
  } else {
    return 0;
  }
}

/**
Strategy Overview
Calculate ADX, +DI, and -DI

ADX measures trend strength.
+DI measures bullish momentum.
-DI measures bearish momentum.
Trade Signal Conditions

BUY Signal 
+DI crosses above -DI (bullish dominance).
ADX > 25 (strong trend).
SELL Signal 
-DI crosses above +DI (bearish dominance).
ADX > 25 (strong trend).
No Signal 

Usage : - 
Generates Buy/Sell signals:

BUY if +DI crosses above -DI and ADX > 25.
SELL if -DI crosses above +DI and ADX > 25. =
 */
