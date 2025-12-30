import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // Standard pino configuration for AWS CloudWatch
  // If you want more human-readable logs in local development, 
  // you might want to use pino-pretty, but typically for 
  // serverless/cloud environments, the standard JSON output is best.
  base: {
    service: "poc-validator-user-api",
  },
});

export default logger;
