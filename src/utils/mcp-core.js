/**
 * Core interfaces and functions for MCP responses
 * This module provides the foundation for all MCP responses
 */
/**
 * Create a standard response with JSON content
 */
export function createJsonResponse(uri, data, mimeType = 'application/json') {
    return {
        contents: [
            {
                uri,
                mimeType,
                text: JSON.stringify(data)
            }
        ],
        data
    };
}
/**
 * Create a standard success response
 */
export function createSuccessResponse(uri, message, data) {
    return createJsonResponse(uri, {
        success: true,
        message,
        ...(data && { data })
    });
}
/**
 * Create a standard error response
 */
export function createErrorResponse(uri, message, details) {
    return {
        contents: [
            {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                    success: false,
                    message,
                    ...(details && { details })
                })
            }
        ],
        isError: true
    };
}
