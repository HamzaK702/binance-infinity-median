import { validatePair } from "../utils/helpers.js";

export const setupWebSocket = (wss, binanceService) => {
  wss.on("connection", (ws, req) => {
    const clientId = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    console.log(`New WebSocket client connected from ${clientId}`);
    // console.log("New connection established.");

    const subscriptions = new Set();
    let isAlive = true;

    // Setup heartbeat
    const heartbeat = setInterval(() => {
      if (!isAlive) {
        console.log(`Client ${clientId} disconnected (heartbeat timeout)`);
        // console.log("Client did not respond to ping, terminating.");
        return ws.terminate();
      }
      isAlive = false;
      ws.ping();
      // console.log('Ping sent to ' + clientId);
    }, 30000);

    ws.on("pong", () => {
      isAlive = true;
    });

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);
        // console.log("*****************");
        // console.log("Received a message from client.");
        // console.log(data);
        handleClientMessage(ws, data, subscriptions, binanceService);
      } catch (error) {
        console.error("Failed to process WebSocket message:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message format",
          })
        );
      }
    });

    // Listen for median updates
    const handleUpdate = (update) => {
      if (subscriptions.has(update.pair)) {
        ws.send(
          JSON.stringify({
            type: "medianUpdate",
            data: update,
          })
        );
      }
    };

    binanceService.on("medianUpdate", handleUpdate);

    ws.on("close", () => {
      console.log(`ebSocket client ${clientId} disconnected`);
      clearInterval(heartbeat);
      binanceService.removeListener("medianUpdate", handleUpdate);
      // console.log("Removed listener for " + clientId);
    });

    // Send welcome message with available pairs
    ws.send(
      JSON.stringify({
        type: "welcome",
        pairs: binanceService.getActivePairs(),
        message: "Connected to Binance Median Tracker",
      })
    );
  });
};

const handleClientMessage = (ws, data, subscriptions, binanceService) => {
  const { type, pair } = data;

  switch (type) {
    case "subscribe":
      handleSubscribe(ws, pair, subscriptions, binanceService);
      break;

    case "unsubscribe":
      handleUnsubscribe(ws, pair, subscriptions);
      break;

    case "getMedian":
      handleGetMedian(ws, pair, binanceService);
      break;

    case "getAllMedians":
      handleGetAllMedians(ws, binanceService);
      break;

    case "ping":
      ws.send(JSON.stringify({ type: "pong" }));
      break;

    default:
      ws.send(
        JSON.stringify({
          type: "error",
          message: `Unknown message type: ${type}`,
        })
      );
  }
};

const handleSubscribe = (ws, pair, subscriptions, binanceService) => {
  // console.log("Attempting to subscribe to pair: " + pair);
  if (!validatePair(pair)) {
    // console.log("Failed due to invalid pair format.");
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Invalid pair format",
      })
    );
    return;
  }

  const normalizedPair = pair.toLowerCase();
  // console.log("Checking if " + normalizedPair + " is available.");

  if (!binanceService.getActivePairs().includes(normalizedPair)) {
    // console.log("Pair not available.");
    ws.send(
      JSON.stringify({
        type: "error",
        message: `Pair ${pair} not available`,
        availablePairs: binanceService.getActivePairs(),
      })
    );
    return;
  }

  subscriptions.add(normalizedPair);

  // Send initial median
  const median = binanceService.getMedian(normalizedPair);
  if (median) {
    ws.send(
      JSON.stringify({
        type: "median",
        data: median,
      })
    );
  }

  ws.send(
    JSON.stringify({
      type: "subscribed",
      pair: normalizedPair,
      message: `Successfully subscribed to ${normalizedPair}`,
    })
  );

  console.log(`Client subscribed to ${normalizedPair}`);
};

const handleUnsubscribe = (ws, pair, subscriptions) => {
  if (!validatePair(pair)) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Invalid pair format",
      })
    );
    return;
  }

  const normalizedPair = pair.toLowerCase();
  subscriptions.delete(normalizedPair);

  ws.send(
    JSON.stringify({
      type: "unsubscribed",
      pair: normalizedPair,
      message: `Successfully unsubscribed from ${normalizedPair}`,
    })
  );

  console.log(`Client unsubscribed from ${normalizedPair}`);
};

const handleGetMedian = (ws, pair, binanceService) => {
  if (!validatePair(pair)) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Invalid pair format",
      })
    );
    return;
  }

  const median = binanceService.getMedian(pair);

  if (!median) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: `No data available for pair ${pair}`,
        availablePairs: binanceService.getActivePairs(),
      })
    );
    return;
  }

  ws.send(
    JSON.stringify({
      type: "median",
      data: median,
    })
  );
};

const handleGetAllMedians = (ws, binanceService) => {
  const medians = binanceService.getAllMedians();

  ws.send(
    JSON.stringify({
      type: "allMedians",
      data: medians,
    })
  );
};

