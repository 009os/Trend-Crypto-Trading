import axios from 'axios';
import * as crypto from 'crypto';

const BINANCE_FUTURES_URL = 'https://fapi.binance.com';
// const BINANCE_FUTURES_URL = 'https://testnet.binancefuture.com';

// Function to generate Binance signature
function createSignature(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return crypto
    .createHmac('sha256', apiSecret)
    .update(queryString)
    .digest('hex');
}

// Function to place order on Binance Futures
export async function placeOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  API_KEY: string,
  API_SECRET: string,
) {
  const endpoint = '/fapi/v1/order';
  const timestamp = Date.now();

  const params = {
    symbol,
    side,
    type: 'LIMIT',
    timeInForce: 'GTC',
    quantity,
    priceMatch: 'QUEUE',
    timestamp,
    recvWindow: 5000,
  };
  params['signature'] = createSignature(params, API_SECRET);

  const url = `${BINANCE_FUTURES_URL}${endpoint}`;
  const headers = { 'X-MBX-APIKEY': API_KEY };

  try {
    const response = await axios.post(url, null, { headers, params });
    console.log(JSON.stringify(response.data));

    return {
      clientOrderId: (response.data as { clientOrderId: string }).clientOrderId,
      orderId: (response.data as { orderId: string }).orderId,
      status: (response.data as { status: string }).status,
      price: (response.data as { price: number }).price,
      executedQty: (response.data as { executedQty: number }).executedQty,
    };
  } catch (error: any) {
    console.error(
      'Error placing order on Binance:',
      error.response?.data || error.message,
    );
    return null;
  }
}

export async function getMarketPrice(symbol: string): Promise<number> {
  try {
    const url = `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`;
    const response = await axios.get(url);
    return parseFloat((response.data as { price: string }).price);
  } catch (error) {
    console.error('Error fetching market price:', error);
    return 0;
  }
}

export async function cancelOrder(
  clientOrderId: string,
  symbol: string,
  API_KEY: string,
  API_SECRET: string,
) {
  const endpoint = '/fapi/v1/order';
  const timestamp = Date.now();

  const params = {
    symbol,
    origClientOrderId: clientOrderId,
    timestamp,
    recvWindow: 5000,
  };
  params['signature'] = createSignature(params, API_SECRET);

  const url = `${BINANCE_FUTURES_URL}${endpoint}`;
  const headers = { 'X-MBX-APIKEY': API_KEY };

  try {
    const response = await axios.delete(url, { headers, params });
    console.log(JSON.stringify(response.data));
    console.log(`Order Canceled: ${clientOrderId}`);
    return response.data;
  } catch (error: any) {
    console.error(
      'Error canceling order:',
      error.response?.data || error.message,
    );
    return null;
  }
}

// Function to check order status
export async function getOrderStatus(
  clientOrderId: string,
  symbol: string,
  API_KEY: string,
  API_SECRET: string,
) {
  const endpoint = '/fapi/v1/order';
  const timestamp = Date.now();

  const params = {
    symbol,
    origClientOrderId: clientOrderId,
    timestamp,
    recvWindow: 5000,
  };
  params['signature'] = createSignature(params, API_SECRET);

  const url = `${BINANCE_FUTURES_URL}${endpoint}`;
  const headers = { 'X-MBX-APIKEY': API_KEY };

  try {
    const response = await axios.get(url, { headers, params });
    console.log(JSON.stringify(response.data));
    return (response.data as { status: string })?.status || null;
  } catch (error: any) {
    console.error(
      'Error fetching order status:',
      error.response?.data || error.message,
    );
    return null;
  }
}
