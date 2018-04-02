const fetch = require('node-fetch');
const WebSocket = require('ws');
const crypto = require('crypto');

const baseEndpoint = 'https://api.binance.com/api/';
const wsEndpoint = 'wss://stream.binance.com:9443/ws/';

class Binance {
  constructor(APIKEY, APISECRET) {
    if (!APIKEY || !APISECRET) throw 'No API specified';
    this.APIKEY = APIKEY;
    this.APISECRET = APISECRET;
  }

  async getBook(symbol) {
    let endpoint = `v3/ticker/bookTicker`;
    if (symbol) endpoint += `?symbol=${symbol}`;
    const data = await this.fetch(endpoint);
    return data;
  }

  async getBalances() {
    const endpoint = 'v3/account';
    const params = {
      timestamp: +Date.now()
    };
    params.signature = this.generateSignature(params);
    const data = await this.fetch(`${endpoint}?${objectToParams(params)}`);
    return data;
  }

  async getOpenOrders() {
    const endpoint = 'v3/openOrders';
    const params = {
      timestamp: +Date.now()
    };
    params.signature = this.generateSignature(params);
    const data = await this.fetch(`${endpoint}?${objectToParams(params)}`);
    return data;
  }

  async getRecentTrades(symbol, limit = 500) {
    const endpoint = 'v1/trades';
    const params = {
      symbol,
      limit
    };
    const data = await this.fetch(`${endpoint}?${objectToParams(params)}`);
    return data;
  }

  // Check parameters:
  // https://github.com/binance-exchange/binance-official-api-docs/blob/master/rest-api.md#account-endpoints
  async placeOrder(parameters, test = true) {
    const endpoint = test ? 'v3/order/test' : 'v3/order';
    const params = {
      timestamp: +Date.now()
    };
    Object.assign(params, parameters);
    params.signature = this.generateSignature(params);
    const data = await this.fetch(`${endpoint}?${objectToParams(params)}`, 'POST');
    return data;
  }

  async cancelOrder(parameters) {
    const endpoint = 'v3/order';
    const params = {
      timestamp: +Date.now()
    };
    Object.assign(params, parameters);
    params.signature = this.generateSignature(params);
    const data = await this.fetch(`${endpoint}?${objectToParams(params)}`, 'DELETE');
    return data;
  }

  async customRequest(endpoint, parameters, method = 'GET', signed = false) {
    const params = Object.assign({}, parameters);
    if (signed) {
      params.signature = this.generateSignature(params);
    }
    const data = await this.fetch(`${endpoint}?${objectToParams(params)}`, method);
    return data;
  }

  generateSignature(queryObj) {
    const urlParams = objectToParams(queryObj);
    return crypto.createHmac('sha256', this.APISECRET).update(urlParams).digest('hex');
  }

  aggTradeWs(symbol, incomingFn) {
    if (!incomingFn || !(incomingFn instanceof Function))
      throw 'A second parameter with a function is mandatory.';
    // symbol should be in lower-case
    const endpoint = `${symbol.toLowerCase()}@aggTrade`;
    const ws = new WebSocket(wsEndpoint + endpoint);
    ws.onmessage = incomingFn;
    ws.onerror = (error) => console.log('WebSocket closed: ', error);
    ws.onclose = () => console.log('WebSocket closed');
  }

  // fetch wrapper to add APIKEY by default and custom method
  async fetch(url, method = 'GET') {
    const init = {
      method,
      headers: {
        'X-MBX-APIKEY': this.APIKEY
      }
    };

    try {
      const data = await fetch(baseEndpoint + url, init);
      const json = await data.json();
      return json;
    } catch (e) {
      throw e;
    }
  }

}

// Aux functions
const objectToParams = obj =>
  Object.keys(obj).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`).join('&');

module.exports = Binance;