import { Router } from "express";
import { validatePair } from "../utils/helpers.js";

const createMedianRoutes = (binanceService) => {
  const router = Router();

  // Get median for a specific trading pair.
  router.get("/:pair", (req, res) => {
    const { pair } = req.params;
    // console.log(`Requested pair: ${pair}`); 

    // chking pairsss
    if (!validatePair(pair)) {
      return res.status(400).json({
        error: "Invalid pair format",
        message: "Pair must be a non-empty string",
      });
    }

    const median = binanceService.getMedian(pair);

    if (!median) {
      return res.status(404).json({
        error: "Pair not found",
        message: `The pair ${pair} is not being tracked`,
        availablePairs: binanceService.getActivePairs(),
      });
    }

    res.json({
      success: true,
      data: median,
    });
  });

  // Get all medians.
  router.get("/", (req, res) => {
    const medians = binanceService.getAllMedians();
    // Saaray pairs ka median 

    res.json({
      success: true,
      count: Object.keys(medians).length,
      data: medians,
    });
  });

  // Get statistics for all pairs.
  router.get("/stats/all", (req, res) => {
    const pairs = binanceService.getActivePairs();
    const stats = pairs.map((pair) => {
      const median = binanceService.getMedian(pair);
      return {
        pair,
        ...median?.stats,
        latestPrice: median?.latestPrice,
      };
    });

    res.json({
      success: true,
      data: stats,
    });
  });

  return router;
};

export default createMedianRoutes;
