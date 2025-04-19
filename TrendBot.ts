import { getADXSignal } from './Signals/Adx';
import { generateSignalATR } from './Signals/Atr';
import { generateBollingerSignal } from './Signals/bollinger';
import { generateEMASignal } from './Signals/ema';
import { MacdgenerateSignal } from './Signals/Macd';
import { generateRSISignal } from './Signals/Rsi';
import { get7MA } from './Signals/7ma';
import { getMarketPrice } from './Utility/Binance';
import { PlaceAndretryOrder } from './Utility/retry';

const SYMBOL = 'BTCUSDT';
const Quantity = 0.06;
const INTERVAL = '1m';
const API_KEY = '';
const API_SECRET = '';

// Define the weights for each strategy
const WEIGHTS = {
  ADX: 0.2,
  EMA: 0.25,
  BOLLINGER: 0.1,
  ATR: 0.2,
  MACD: 0.15,
  RSI: 0.1,
};

let activePosition: { side: 'BUY' | 'SELL'; entryPrice: number } | null = null;

async function generateFinalSignal() {
  while (true) {
    console.log('\n===================================================');

    // Fetch market data
    const marketPrice = await getMarketPrice(SYMBOL);
    const ma7 = await get7MA(SYMBOL, INTERVAL);

    console.log(`Market Price: ${marketPrice} | 7MA: ${ma7}`);

    // Get trade signals
    const adxSignal = await getADXSignal(SYMBOL, INTERVAL);
    const atrSignal = await generateSignalATR(SYMBOL, INTERVAL);
    const bollingerSignal = await generateBollingerSignal(SYMBOL, INTERVAL);
    const maSignal = await generateEMASignal(SYMBOL, INTERVAL);
    const macdSignal = await MacdgenerateSignal(SYMBOL, INTERVAL);
    const rsiSignal = await generateRSISignal(SYMBOL, INTERVAL);

    // Apply weights
    const weightedSum =
      adxSignal * WEIGHTS.ADX +
      atrSignal * WEIGHTS.ATR +
      bollingerSignal * WEIGHTS.BOLLINGER +
      maSignal * WEIGHTS.EMA +
      macdSignal * WEIGHTS.MACD +
      rsiSignal * WEIGHTS.RSI;

    // Determine Final Signal
    let finalSignal: 'BUY' | 'SELL' | 'NO SIGNAL';
    if (weightedSum >= 0.3) {
      finalSignal = 'BUY';
    } else if (weightedSum <= -0.3) {
      finalSignal = 'SELL';
    } else {
      finalSignal = 'NO SIGNAL';
    }
    if (!activePosition) {
      console.log(
        `Final Signal: ${finalSignal} | Weighted Sum: ${weightedSum.toFixed(2)}`,
      );
      if (finalSignal === 'BUY' && marketPrice > ma7) {
        console.log('Placing BUY order with retry logic...');
        await PlaceAndretryOrder(SYMBOL, 'BUY', Quantity, API_KEY, API_SECRET);
        activePosition = { side: 'BUY', entryPrice: marketPrice };
      } else if (finalSignal === 'SELL' && marketPrice < ma7) {
        console.log('Placing SELL order with retry logic...');
        await PlaceAndretryOrder(SYMBOL, 'SELL', Quantity, API_KEY, API_SECRET);
        activePosition = { side: 'SELL', entryPrice: marketPrice };
      }
    } else {
      console.log('Waiting for 7MA to cross Market Price...');
      if (
        (activePosition.side === 'BUY' && marketPrice < ma7) ||
        (activePosition.side === 'SELL' && marketPrice > ma7)
      ) {
        console.log(
          `Closing ${activePosition.side} order as 7MA crossed Market Price.`,
        );
        await PlaceAndretryOrder(
          SYMBOL,
          activePosition.side === 'BUY' ? 'SELL' : 'BUY',
          Quantity,
          API_KEY,
          API_SECRET,
        );
        activePosition = null;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
  }
}

generateFinalSignal();
