import axios from 'axios';

export async function get7MA(
  symbol: string,
  INTERVAL: string,
): Promise<number> {
  try {
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${INTERVAL}&limit=7`;
    const response = await axios.get(url);
    const data = response.data as any[][];
    const closingPrices = data.map((candle) => parseFloat(candle[4]));

    // Calculate 7MA
    const ma7 =
      closingPrices.reduce((sum, price) => sum + price, 0) /
      closingPrices.length;

    return parseFloat(ma7.toFixed(2));
  } catch (error) {
    console.error('Error fetching 7MA:', error);
    return 0;
  }
}
