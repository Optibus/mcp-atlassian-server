import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
// Define log levels
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (LogLevel = {}));
// Define colors for output
const COLORS = {
    RESET: '\x1b[0m',
    RED: '\x1b[31m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    GRAY: '\x1b[90m'
};
// Get log level from environment variable
const getLogLevelFromEnv = () => {
    const logLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (logLevel) {
        case 'debug':
            return LogLevel.DEBUG;
        case 'info':
            return LogLevel.INFO;
        case 'warn':
            return LogLevel.WARN;
        case 'error':
            return LogLevel.ERROR;
        default:
            return LogLevel.INFO; // Default is INFO
    }
};
/**
 * Logger utility
 */
export class Logger {
    static logLevel = getLogLevelFromEnv();
    moduleName;
    /**
     * Initialize logger
     * @param moduleName Module name using the logger
     */
    constructor(moduleName) {
        this.moduleName = moduleName;
    }
    /**
     * Log error
     * @param message Log message
     * @param data Additional data (optional)
     */
    error(message, data) {
        if (Logger.logLevel >= LogLevel.ERROR) {
            console.error(`${COLORS.RED}[ERROR][${this.moduleName}]${COLORS.RESET} ${message}`);
            if (data)
                console.error(data);
        }
    }
    /**
     * Log warning
     * @param message Log message
     * @param data Additional data (optional)
     */
    warn(message, data) {
        if (Logger.logLevel >= LogLevel.WARN) {
            console.warn(`${COLORS.YELLOW}[WARN][${this.moduleName}]${COLORS.RESET} ${message}`);
            if (data)
                console.warn(data);
        }
    }
    /**
     * Log info
     * @param message Log message
     * @param data Additional data (optional)
     */
    info(message, data) {
        if (Logger.logLevel >= LogLevel.INFO) {
            console.info(`${COLORS.BLUE}[INFO][${this.moduleName}]${COLORS.RESET} ${message}`);
            if (data)
                console.info(data);
        }
    }
    /**
     * Log debug
     * @param message Log message
     * @param data Additional data (optional)
     */
    debug(message, data) {
        if (Logger.logLevel >= LogLevel.DEBUG) {
            console.debug(`${COLORS.GRAY}[DEBUG][${this.moduleName}]${COLORS.RESET} ${message}`);
            if (data)
                console.debug(data);
        }
    }
    /**
     * Create a logger instance
     * @param moduleName Module name using the logger
     * @returns Logger instance
     */
    static getLogger(moduleName) {
        return new Logger(moduleName);
    }
    /**
     * Set log level
     * @param level New log level
     */
    static setLogLevel(level) {
        Logger.logLevel = level;
    }
}
