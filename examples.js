const Binance = require('./binance');
const config = {
    APIKEY: process.env.APIKEY || '',
    APISECRET: process.env.APISECRET || ''
};

const binance = new Binance(config.APIKEY, config.APISECRET);

// Quadratic trend for time series
const quadraticTrend = async (symbol) => {
    const LIMIT_TRADES = 500;
    const lastTrades = await binance.getRecentTrades(symbol, LIMIT_TRADES);
    const computeData = lastTrades.reduce((t, n, i) => {
        t.x += i + 1;
        t.x2 += Math.pow(i + 1, 2);
        t.y += +n.price;
        t.xy += (i + 1) * n.price;
        return t;
    }, {
        x: 0,
        x2: 0,
        y: 0,
        xy: 0
    });
    const computeTrend = (LIMIT_TRADES * computeData.xy - computeData.x * computeData.y) /
        (LIMIT_TRADES * computeData.x2 - Math.pow(computeData.x, 2))
    return Number(computeTrend, 3);
};

const run = async () => {
    try {
    // Connectivity test
    console.log('Connectivity test: ' + JSON.stringify(await binance.customRequest('v1/ping', {})));

    // Makes a lineal regression of last 500 trades and returns the trend for the next 500,
    // this kind of formula suggest us how will change the bid price to forecast an order or place one
    console.log('Current trend: ' + await quadraticTrend('BTCUSDT'));

    } catch(e) {
        throw e;
    }
};

run();