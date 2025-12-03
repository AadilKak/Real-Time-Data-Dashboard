import ccxt
import redis
import time
import json
import logging

# --- Configuration ---
# Configure logging to see status updates in the console
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- Exchange Setup ---
# We will use Binance as a stable example exchange.
# IMPORTANT: Use a reliable, major exchange. The free ccxt library is for public data.
EXCHANGE_ID = 'binanceus'
SYMBOL = ['BTC/USDT','ETH/USDT','SPX/USDT']  # Coins
POLL_INTERVAL_SECONDS = 0.5     # Fetch data every half second (500ms)

# Initialize the ccxt exchange object
try:
    exchange = getattr(ccxt, EXCHANGE_ID)()
    logging.info(f"Initialized exchange: {exchange.name}")
except AttributeError:
    logging.error(f"Exchange ID '{EXCHANGE_ID}' not found.")
    exit()

# --- Redis Setup ---
# *** DOCKER COMPOSE CHANGE: REDIS_HOST must be the service name 'redis' ***
# The Docker Compose file defines the Redis container with the service name 'redis'.
REDIS_HOST = 'redis'
REDIS_PORT = 6379
REDIS_CHANNEL = 'crypto-updates'

try:
    # Set a timeout for connection attempts inside the container
    r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True, socket_connect_timeout=5)
    r.ping()
    logging.info(f"Connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
except redis.exceptions.ConnectionError as e:
    logging.error(f"Could not connect to Redis at '{REDIS_HOST}'. Ensure the 'redis' Docker service is running.")
    logging.error(f"Error details: {e}")
    exit()


def fetch_and_publish_ticker():
    """
    Fetches the latest ticker data for *all* symbols and publishes each to Redis.
    """
    try:
        # 1. Fetch data for *all* symbols in a single API call
        # Pass the list of symbols
        all_tickers = exchange.fetch_tickers(SYMBOL) 
        
        # 2. Iterate through each returned ticker and process it
        for symbol, ticker in all_tickers.items():
            # 2a. Extract and structure the necessary data
            data = {
                'symbol': symbol,  # Use the symbol from the loop
                'price': ticker['last'],
                'timestamp': ticker['timestamp'],
                'volume': ticker['quoteVolume'],

                # --- Daily Change Metrics ---
                'open_24h': ticker['open'],
                'high_24h': ticker['high'],
                'low_24h': ticker['low'],
                'change': ticker['change'],
                'percentage': ticker['percentage'],

                # --- Liquidity ---
                'bid': ticker['bid'],
                'ask': ticker['ask']
            }

            # 3. Serialize and publish the data
            message = json.dumps(data)
            r.publish(REDIS_CHANNEL, message)
            
            # 4. Log the updated information
            current_price = data.get('price', 0)
            abs_change = data.get('change', 0)
            percent_change = data.get('percentage', 0)

            logging.info(f"Published update: {symbol} Price: {current_price:.2f} Change: {abs_change:+.2f} ({percent_change:+.2f}%)")


    except ccxt.NetworkError as e:
        logging.warning(f"Network error fetching tickers: {e}")
    except ccxt.ExchangeError as e:
        logging.warning(f"Exchange error: {e}")
    except Exception as e:
        logging.error(f"An unexpected error occurred: {e}")


if __name__ == "__main__":
    # Change the log to use the SYMBOL list instead of trying to print the list name
    symbols_str = ", ".join(SYMBOL) 
    logging.info(f"Starting real-time ticker feed for {symbols_str}...") 
    try:
        # Continuous loop to simulate the real-time stream
        while True:
            fetch_and_publish_ticker()
            time.sleep(POLL_INTERVAL_SECONDS) # Wait before fetching again

    except KeyboardInterrupt:
        logging.info("Ticker feed stopped by user.")
    finally:
        logging.info("Application terminated.")