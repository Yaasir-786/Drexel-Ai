import mongoose from "mongoose";

const checkHealth = async (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "ok" : "degraded",
    database: dbConnected ? "connected" : "disconnected",
    uptime: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
};

const healthController = { checkHealth };

export default healthController;
