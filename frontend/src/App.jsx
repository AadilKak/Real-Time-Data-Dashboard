import './App.css'
import { useState, useEffect, useCallback, memo } from 'react';
import { RefreshCcw, TrendingUp, TrendingDown, Clock, Zap } from 'lucide-react'; // Assuming lucide-react is installed

// --- Configuration ---
// The WebSocket server address (Node.js server)
const WS_SERVER_URL = "ws://localhost:8080"; 
// Define initial assets to display
const INITIAL_ASSETS = ['BTC/USDT', 'ETH/USDT', 'SPX/USDT'];

// --- Utility Functions ---

/**
 * Formats a number to currency string.
 * @param {number} value - The numeric value.
 * @returns {string} Formatted currency string.
 */
const formatCurrency = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

/**
 * Formats a number to a percentage string with sign.
 * @param {number} value - The numeric value.
 * @returns {string} Formatted percentage string.
 */
const formatPercentage = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return (value > 0 ? '+' : '') + value.toFixed(2) + '%';
};

/**
 * Represents a single crypto ticker card on the dashboard.
 */
const CryptoCard = memo(({ data }) => {
    // Determine the price change and corresponding color
    const isUp = data.percentage > 0;
    const isDown = data.percentage < 0;
    const changeColor = isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-gray-400';
    const bgColor = isUp ? 'bg-green-800/10' : isDown ? 'bg-red-800/10' : 'bg-gray-800/10';
    
    // State for the flash animation
    const [isFlashing, setIsFlashing] = useState(false);
    
    // Reset flash effect after a short duration
    useEffect(() => {
        if (data.flash) {
            setIsFlashing(true);
            const timer = setTimeout(() => setIsFlashing(false), 200);
            return () => clearTimeout(timer);
        }
    }, [data.price]); // Trigger flash when price updates

    const flashClass = isFlashing 
        ? (isUp ? 'flash-green' : isDown ? 'flash-red' : '')
        : '';
        
    const TrendIcon = isUp ? TrendingUp : TrendingDown;

    return (
        <div className={`p-6 rounded-xl shadow-lg border border-gray-700 transition-all duration-100 ${bgColor} ${flashClass}`}>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white tracking-wider">{data.symbol.split('/')[0]}</h2>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${changeColor} border ${isUp ? 'border-green-600' : 'border-red-600'}`}>
                    {data.symbol}
                </span>
            </div>
            
            <div className="text-4xl font-extrabold mb-4 flex items-baseline">
                <span className="text-white">
                    {formatCurrency(data.price)}
                </span>
            </div>

            <div className="flex items-center space-x-2 text-lg font-medium">
                <TrendIcon className={`w-5 h-5 ${changeColor}`} />
                <span className={changeColor}>
                    {formatCurrency(data.change)}
                </span>
                <span className={changeColor}>
                    ({formatPercentage(data.percentage)})
                </span>
            </div>

<div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-400 space-y-1">
                  <p className="flex justify-between items-center">High: <span className="text-white">{formatCurrency(data.high_24h)}</span></p>
                <p className="flex justify-between items-center">Low: <span className="text-white">{formatCurrency(data.low_24h)}</span></p>
                <p className="flex justify-between items-center">Volume: <span className="text-white">{data.volume ? new Intl.NumberFormat('en-US', {notation: 'compact'}).format(data.volume) : 'N/A'}</span></p>
                <p className="flex justify-between items-center">A/B: <span className="text-white">{data.ask}/{data.bid}</span></p>
            </div>
        </div>
    );
});

function App() {
    const [cryptoData, setCryptoData] = useState({});
    const [socketStatus, setSocketStatus] = useState('Connecting...');

    // Initializes the data structure with placeholder values
    useEffect(() => {
        const initialData = INITIAL_ASSETS.reduce((acc, symbol) => {
            acc[symbol] = { 
                symbol, 
                price: 0, 
                change: 0, 
                percentage: 0,
                volume: 0, 
                open_24h: 0, 
                high_24h: 0, 
                low_24h: 0,
                bid: 0,
                ask: 0,
                flash: false
            };
            return acc;
        }, {});
        setCryptoData(initialData);
    }, []);

    // Function to handle incoming WebSocket messages
    const handleMessage = useCallback((event) => {
        try {
            const update = JSON.parse(event.data);
            const { symbol } = update;

            if (INITIAL_ASSETS.includes(symbol)) {
                setCryptoData(prevData => {
                    // Check if price actually changed to trigger the flash
                    const shouldFlash = prevData[symbol] && prevData[symbol].price !== update.price;

                    return {
                        ...prevData,
                        [symbol]: {
                            ...prevData[symbol],
                            ...update,
                            flash: shouldFlash, // Set flash flag to trigger animation in CryptoCard
                        }
                    };
                });
            }
        } catch (error) {
            console.error("Error processing WebSocket message:", error);
        }
    }, []);

    // WebSocket connection effect
    useEffect(() => {
        const ws = new WebSocket(WS_SERVER_URL);

        ws.onopen = () => {
            setSocketStatus('Connected');
            console.log('WebSocket connected successfully.');
        };

        ws.onmessage = handleMessage;

        ws.onclose = () => {
            setSocketStatus('Disconnected');
            console.warn('WebSocket disconnected. Please ensure Node.js server is running.');
        };

        ws.onerror = (error) => {
            setSocketStatus('Error');
            console.error('WebSocket error occurred:', error);
        };

        // Cleanup function
        return () => {
            ws.close();
        };
    }, [handleMessage]);
     // Sort assets alphabetically for consistent display
    const sortedAssets = Object.values(cryptoData).sort((a, b) => a.symbol.localeCompare(b.symbol));

  return (
                  <div className="min-h-screen text-white font-sans p-4 sm:p-8">
            <header className="mb-8">
                {/* Note: I'm cleaning up your existing header JSX */}
                <h1 className="text-4xl font-bold border-b border-gray-700 pb-3 flex items-center">
                    <Zap className="w-8 h-8 mr-2 text-yellow-400" />
                    Real-Time Crypto Dashboard
                </h1>
                <p className="text-gray-400 mt-2">Data streamed from Python/Redis via Node.js WebSockets</p>
                <div className="mt-2 flex items-center text-sm">
                    Status: <span className={`ml-1 font-semibold ${
                        socketStatus === 'Connected' ? 'text-green-500' : 
                        socketStatus === 'Connecting...' ? 'text-yellow-500' : 'text-red-500'
                    }`}>{socketStatus}</span>
                </div>
            </header>

            <main>
                {sortedAssets.length > 0 ? (
                    // This is the grid container for the CryptoCard components
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {sortedAssets.map(data => (
                            <CryptoCard key={data.symbol} data={data} />
                        ))}
                    </div>
                ) : (
                    // Placeholder shown while waiting for initial data
                    <div className="text-center text-gray-500 py-12">
                        <Clock className="w-12 h-12 mx-auto mb-4" />
                        <p>Waiting for initial data...</p>
                    </div>
                )}
            </main>
            
            <footer className="mt-12 pt-6 border-t border-gray-700 text-center text-gray-500">
                <p>Architecture proof of concept for Real-Time Data Processing and Scalable Systems.</p>
            </footer>
        </div>


  )
}

export default App
