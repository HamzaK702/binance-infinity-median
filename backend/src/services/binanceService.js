import WebSocket from "ws";
import axios from "axios";
import { EventEmitter } from "events";
import MedianTracker from "./medianTracker.js";
import {
  BINANCE_WS_URL,
  BINANCE_API_URL,
  DEFAULT_PAIRS,
  RECONNECT_MAX_ATTEMPTS,
  PING_INTERVAL,
} from "../config/constants.js";
import { calculateExponentialBackoff, shuffleArray } from "../utils/helpers.js";
import { ENV } from "../config/env.js";

class BinanceService extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.pairs = [];
    this.medianTrackers = new Map();
    this.latestPrices = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = RECONNECT_MAX_ATTEMPTS;
    this.pingInterval = null;
  }

  initialize = async () => {
    try {
      await this.fetchRandomPairs();

      this.pairs.forEach((pair) => {
        this.medianTrackers.set(pair, new MedianTracker());
        this.latestPrices.set(pair, null);
      });

      this.connectWebSocket();

      console.log(
        `✅ BinanceService initialized with ${this.pairs.length} pairs`
      );
    } catch (error) {
      console.error("❌ Failed to initialize Binance service:", error);
      throw error;
    }
  };

  fetchRandomPairs = async () => {
    try {
      const { data } = await axios.get(`${BINANCE_API_URL}/exchangeInfo`);

      const symbols = data.symbols
        .filter(
          ({ status, quoteAsset }) =>
            status === "TRADING" && quoteAsset === "USDT"
        )
        .map(({ symbol }) => symbol.toLowerCase());

      const shuffled = shuffleArray(symbols);
      this.pairs = shuffled.slice(0, ENV.MAX_PAIRS);

      console.log(
        `📊 Selected ${this.pairs.length} trading pairs:`,
        this.pairs
      );
    } catch (error) {
      console.error("⚠️ Failed to fetch pairs, using defaults:", error.message);
      this.pairs = DEFAULT_PAIRS.slice(0, ENV.MAX_PAIRS);
    }
  };

  connectWebSocket = () => {
    const streams = this.pairs.map((pair) => `${pair}@trade`).join("/");
    const wsUrl = `${BINANCE_WS_URL}?streams=${streams}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.on("open", this.handleWsOpen);
    this.ws.on("message", this.handleWsMessage);
    this.ws.on("error", this.handleWsError);
    this.ws.on("close", this.handleWsClose);
    this.ws.on("pong", () => {
      // Keep-alive pong received
    });

    // Setup ping interval
    this.setupPingInterval();
  };

  handleWsOpen = () => {
    console.log("🔗 Connected to Binance WebSocket");
    this.reconnectAttempts = 0;
  };

  handleWsMessage = (data) => {
    try {
      const message = JSON.parse(data);
      if (message?.data?.e === "trade") {
        this.processTrade(message.data);
      }
    } catch (error) {
      console.error("Failed to process message:", error);
    }
  };

  handleWsError = (error) => {
    console.error("❌ WebSocket error:", error.message);
  };

  handleWsClose = () => {
    console.log("🔌 WebSocket connection closed");
    this.clearPingInterval();
    this.reconnect();
  };

  setupPingInterval = () => {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, ENV.WS_HEARTBEAT_INTERVAL || PING_INTERVAL);
  };

  clearPingInterval = () => {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  };

  processTrade = (trade) => {
    const symbol = trade.s.toLowerCase();
    const price = parseFloat(trade.p);
    const timestamp = new Date(trade.T);

    if (this.medianTrackers.has(symbol)) {
      // Add price to median tracker
      const tracker = this.medianTrackers.get(symbol);
      tracker.addPrice(price);
      this.latestPrices.set(symbol, price);

      // Emit update event
      const median = tracker.getMedian();
      this.emit("medianUpdate", {
        pair: symbol,
        price,
        median,
        timestamp: timestamp.toISOString(),
        count: tracker.getStats().count,
      });
    }
  };

  reconnect = () => {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = calculateExponentialBackoff(this.reconnectAttempts);

      console.log(
        `🔄 Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connectWebSocket();
      }, delay);
    } else {
      console.error("❌ Max reconnection attempts reached. Service stopped.");
      this.emit("maxReconnectReached");
    }
  };

  getMedian = (pair) => {
    const normalizedPair = pair.toLowerCase();
    const tracker = this.medianTrackers.get(normalizedPair);

    if (!tracker) return null;

    return {
      pair: normalizedPair,
      median: tracker.getMedian(),
      stats: tracker.getStats(),
      latestPrice: this.latestPrices.get(normalizedPair),
      timestamp: new Date().toISOString(),
    };
  };

  getActivePairs = () => [...this.pairs];

  getAllMedians = () => {
    return this.pairs.reduce((result, pair) => {
      result[pair] = this.getMedian(pair);
      return result;
    }, {});
  };

  disconnect = () => {
    console.log("🛑 Disconnecting BinanceService...");

    this.clearPingInterval();

    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }

    this.removeAllListeners();
  };
}

export default BinanceService;
