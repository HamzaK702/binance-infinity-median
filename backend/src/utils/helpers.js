/**
 * Utility functions for the Binance service
 */

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const formatPrice = (price, decimals = 2) => {
  if (!price) return "0";
  return price < 1 ? price.toFixed(6) : price.toFixed(decimals);
};

export const calculateExponentialBackoff = (attempt, maxDelay = 30000) => {
  return Math.min(1000 * Math.pow(2, attempt), maxDelay);
};

export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const validatePair = (pair) => {
  return typeof pair === "string" && pair.length > 0;
};
