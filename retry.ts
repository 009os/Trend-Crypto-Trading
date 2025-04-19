import { getOrderStatus, cancelOrder, placeOrder } from './Binance';

export async function PlaceAndretryOrder(
  symbol: string,
  side: 'BUY' | 'SELL',
  quantity: number,
  API_KEY: string,
  API_SECRET: string,
) {
  let orderPlaced = false;
  let clientOrderId: string | null = null;

  while (!orderPlaced) {
    console.log('Trying to Placing order');
    const orderDetails = await placeOrder(
      symbol,
      side,
      quantity,
      API_KEY,
      API_SECRET,
    );
    clientOrderId = orderDetails?.clientOrderId || null;
    if (!clientOrderId) {
      console.error(`Failed to place order. Retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      continue;
    }

    console.log(`Monitoring Order: ${clientOrderId}`);

    // Check order status every minute
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 60 * 1000)); // Wait 1 min

      const orderStatus = await getOrderStatus(
        clientOrderId,
        symbol,
        API_KEY,
        API_SECRET,
      );
      console.log(`Order Status: ${orderStatus}`);

      if (orderStatus === 'FILLED') {
        console.log(`Order FILLED: ${side} ${quantity} ${symbol}`);
        orderPlaced = true;
        break;
      } else if (orderStatus === 'NEW') {
        console.log(`Order still in NEW state, canceling and retrying...`);
        await cancelOrder(clientOrderId, symbol, API_KEY, API_SECRET);
        break;
      } else if (orderStatus === 'PARTIALLY_FILLED') {
        console.log(`Order PARTIALLY_FILLED: ${side} ${quantity} ${symbol}`);
        orderPlaced = true;
        break;
      }
    }
  }
}
