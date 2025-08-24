import dotenv from "dotenv";
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  MAX_PAIRS: parseInt(process.env.MAX_PAIRS || "10"),
  WS_HEARTBEAT_INTERVAL: parseInt(process.env.WS_HEARTBEAT_INTERVAL || "30000"),
};

export const isDevelopment = () => ENV.NODE_ENV === "development";
export const isProduction = () => ENV.NODE_ENV === "production";
export const isTest = () => ENV.NODE_ENV === "test";
