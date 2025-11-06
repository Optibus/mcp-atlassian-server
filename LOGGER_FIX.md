# Logger Fix: JSON Parsing Errors

## Issue

After implementing the new read tools, JSON parsing errors appeared in the MCP client logs:

```
[error] Client error for command Unexpected token '⮐', "⮐[34m[INFO"... is not valid JSON
```

## Root Cause

The logger was using `console.info()`, `console.error()`, etc., which in some Node.js environments write to **stdout** instead of **stderr**.

Since MCP uses **stdio transport** where:

- **stdout** = MCP JSON-RPC protocol communication
- **stderr** = logging and debugging

When logs went to stdout, they mixed with the JSON-RPC messages, causing parsing errors.

## Solution

Changed the logger to **explicitly use `process.stderr.write()`** instead of console methods:

**Before:**

```typescript
info(message: string, data?: any): void {
  if (Logger.logLevel >= LogLevel.INFO) {
    console.info(`${COLORS.BLUE}[INFO][${this.moduleName}]${COLORS.RESET} ${message}`);
    if (data) console.info(data);
  }
}
```

**After:**

```typescript
info(message: string, data?: any): void {
  if (Logger.logLevel >= LogLevel.INFO) {
    process.stderr.write(`${COLORS.BLUE}[INFO][${this.moduleName}]${COLORS.RESET} ${message}\n`);
    if (data) process.stderr.write(`${JSON.stringify(data, null, 2)}\n`);
  }
}
```

## Changes Made

**File Modified:** `src/utils/logger.ts`

1. **Use stderr explicitly**:

   - All log methods (`error`, `warn`, `info`, `debug`) now use `process.stderr.write()`
   - Added explicit newline characters (`\n`)
   - Data objects are JSON-stringified before writing

2. **Disable ANSI colors in MCP mode**:
   - Detect if running via stdio (not TTY) → MCP server mode
   - Disable color codes to prevent stderr being interpreted as errors
   - Colors still work when running server directly in terminal

```typescript
const isMcpServer = process.env.MCP_SERVER === "true" || !process.stderr.isTTY;
const COLORS = isMcpServer
  ? {
      /* empty strings */
    }
  : {
      /* ANSI codes */
    };
```

## Impact

✅ **Fixes**: JSON parsing errors in MCP clients  
✅ **Maintains**: All logging functionality  
✅ **Preserves**: ANSI color codes for better readability  
✅ **Ensures**: Proper separation of MCP protocol (stdout) and logs (stderr)

## Testing

After rebuild and MCP server restart:

1. Logs still appear in the console
2. No more JSON parsing errors
3. Tools work correctly
4. MCP protocol communication is clean

## MCP Stdio Transport Best Practices

When building MCP servers with stdio transport:

1. **Always log to stderr**: Use `process.stderr.write()` or `console.error()`
2. **Never log to stdout**: This channel is reserved for MCP JSON-RPC
3. **Test with clients**: Different MCP clients may handle streams differently
4. **Consider log levels**: In production, set `LOG_LEVEL=error` to reduce noise

---

**Date**: November 6, 2025  
**Fixed By**: Hinnerk (with Cursor AI)  
**Version**: 2.2.0
