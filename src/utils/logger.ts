import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables
dotenv.config();

// Setup file logging - use absolute path to ensure logs work in MCP context
const LOG_DIR = "/Users/hinnerk.bruegmann/code/mcp-atlassian-server/logs";
const LOG_FILE = path.join(LOG_DIR, "mcp-server.log");

// Create logs directory if it doesn't exist
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (error) {
  // Log directory creation failed, logs will be disabled
  console.error("Failed to create logs directory:", error);
}

// Function to write to log file
function writeToFile(message: string): void {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `${timestamp} ${message}\n`);
  } catch (error) {
    // Silently fail if we can't write to file
  }
}

// Define log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// Detect if running as MCP server (stdio transport means colors cause issues)
const isMcpServer = process.env.MCP_SERVER === "true" || !process.stderr.isTTY;

// Define colors for output (disabled for MCP to avoid stderr interpretation as errors)
const COLORS = isMcpServer
  ? {
      RESET: "",
      RED: "",
      YELLOW: "",
      BLUE: "",
      GRAY: "",
    }
  : {
      RESET: "\x1b[0m",
      RED: "\x1b[31m",
      YELLOW: "\x1b[33m",
      BLUE: "\x1b[34m",
      GRAY: "\x1b[90m",
    };

// Get log level from environment variable
const getLogLevelFromEnv = (): LogLevel => {
  const logLevel = process.env.LOG_LEVEL?.toLowerCase();
  switch (logLevel) {
    case "debug":
      return LogLevel.DEBUG;
    case "info":
      return LogLevel.INFO;
    case "warn":
      return LogLevel.WARN;
    case "error":
      return LogLevel.ERROR;
    default:
      return LogLevel.INFO; // Default is INFO
  }
};

/**
 * Logger utility
 */
export class Logger {
  private static logLevel = getLogLevelFromEnv();
  private moduleName: string;

  /**
   * Initialize logger
   * @param moduleName Module name using the logger
   */
  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  /**
   * Log error
   * @param message Log message
   * @param data Additional data (optional)
   */
  error(message: string, data?: any): void {
    if (Logger.logLevel >= LogLevel.ERROR) {
      const logMsg = `[ERROR][${this.moduleName}] ${message}`;
      process.stderr.write(
        `${COLORS.RED}${logMsg}${COLORS.RESET}\n`
      );
      writeToFile(logMsg);
      if (data) {
        const dataStr = JSON.stringify(data, null, 2);
        process.stderr.write(`${dataStr}\n`);
        writeToFile(dataStr);
      }
    }
  }

  /**
   * Log warning
   * @param message Log message
   * @param data Additional data (optional)
   */
  warn(message: string, data?: any): void {
    if (Logger.logLevel >= LogLevel.WARN) {
      const logMsg = `[WARN][${this.moduleName}] ${message}`;
      process.stderr.write(
        `${COLORS.YELLOW}${logMsg}${COLORS.RESET}\n`
      );
      writeToFile(logMsg);
      if (data) {
        const dataStr = JSON.stringify(data, null, 2);
        process.stderr.write(`${dataStr}\n`);
        writeToFile(dataStr);
      }
    }
  }

  /**
   * Log info
   * @param message Log message
   * @param data Additional data (optional)
   */
  info(message: string, data?: any): void {
    if (Logger.logLevel >= LogLevel.INFO) {
      const logMsg = `[INFO][${this.moduleName}] ${message}`;
      process.stderr.write(
        `${COLORS.BLUE}${logMsg}${COLORS.RESET}\n`
      );
      writeToFile(logMsg);
      if (data) {
        const dataStr = JSON.stringify(data, null, 2);
        process.stderr.write(`${dataStr}\n`);
        writeToFile(dataStr);
      }
    }
  }

  /**
   * Log debug
   * @param message Log message
   * @param data Additional data (optional)
   */
  debug(message: string, data?: any): void {
    if (Logger.logLevel >= LogLevel.DEBUG) {
      const logMsg = `[DEBUG][${this.moduleName}] ${message}`;
      process.stderr.write(
        `${COLORS.GRAY}${logMsg}${COLORS.RESET}\n`
      );
      writeToFile(logMsg);
      if (data) {
        const dataStr = JSON.stringify(data, null, 2);
        process.stderr.write(`${dataStr}\n`);
        writeToFile(dataStr);
      }
    }
  }

  /**
   * Create a logger instance
   * @param moduleName Module name using the logger
   * @returns Logger instance
   */
  static getLogger(moduleName: string): Logger {
    return new Logger(moduleName);
  }

  /**
   * Set log level
   * @param level New log level
   */
  static setLogLevel(level: LogLevel): void {
    Logger.logLevel = level;
  }
}
