/**
 * Rule enforcement logger
 */

export const logger = {
  log: (message, data = {}) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DesignDen] ${message}`, data);
    }
  },

  warn: (message, data = {}) => {
    console.warn(`[DesignDen Warning] ${message}`, data);
  },

  error: (message, error = {}) => {
    console.error(`[DesignDen Error] ${message}`, error);
  },

  enforceRule: (ruleName, ruleDescription) => {
    console.log(`[RULE ENFORCEMENT] ${ruleName}: ${ruleDescription}`);
  },
};

export default logger;
