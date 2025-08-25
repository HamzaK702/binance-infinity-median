import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import BinanceService from "./services/binanceService.js";
import createMedianRoutes from "./routes/median.js";
import { setupWebSocket } from "./websocket/wsHandler.js";
import { ENV, isDevelopment } from "./config/env.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: ENV.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

// Request logging in development
if (isDevelopment()) {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Initialize Binance service
const binanceService = new BinanceService();

// Routes
app.use("/median", createMedianRoutes(binanceService));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    environment: ENV.NODE_ENV,
    pairs: binanceService.getActivePairs(),
    timestamp: new Date().toISOString(),
  });
});

// Setup WebSocket
setupWebSocket(wss, binanceService);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    ...(isDevelopment() && { stack: err.stack }),
  });
});

// Start server
const start = async () => {
  try {
    await binanceService.initialize();

    server.listen(ENV.PORT, () => {
      console.log(` Server running on port ${ENV.PORT}`);
      console.log(`WebSocket server ready on ws://localhost:${ENV.PORT}`);
      console.log(` Environment: ${ENV.NODE_ENV}`);
    });
  } catch (error) {
    console.error(" Failed to start server:", error);
    process.exit(1);
  }
};

start();

// Graceful shutdown
const gracefulShutdown = () => {
  console.log("Shutting down gracefully...");

  binanceService.disconnect();

  server.close(() => {
    console.log(" Server closed");
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  gracefulShutdown();
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown();
});
