import { createJsonResponse } from './mcp-core.js';
import { ApiError } from './error-handler.js';
import { Logger } from './logger.js';
import { createStandardMetadata } from '../schemas/common.js';
import { getDeploymentType, validateAtlassianUrl } from './deployment-detector.js';
const logger = Logger.getLogger('MCPHelpers');
/**
 * Environment and configuration utilities
 */
export var Config;
(function (Config) {
    /**
     * Get Atlassian configuration from environment variables with deployment detection
     * @deprecated Use getJiraConfigFromEnv() and getConfluenceConfigFromEnv() instead
     */
    function getAtlassianConfigFromEnv() {
        // Fallback to legacy single-config approach
        const ATLASSIAN_SITE_NAME = process.env.ATLASSIAN_SITE_NAME || '';
        const ATLASSIAN_USER_EMAIL = process.env.ATLASSIAN_USER_EMAIL || '';
        const ATLASSIAN_API_TOKEN = process.env.ATLASSIAN_API_TOKEN || '';
        const ATLASSIAN_PAT_TOKEN = process.env.ATLASSIAN_PAT_TOKEN || '';
        const ATLASSIAN_DEPLOYMENT_TYPE = process.env.ATLASSIAN_DEPLOYMENT_TYPE;
        if (!ATLASSIAN_SITE_NAME) {
            logger.error('Missing ATLASSIAN_SITE_NAME in environment variables');
            throw new Error('Missing ATLASSIAN_SITE_NAME in environment variables');
        }
        // Normalize and validate the URL
        const baseUrl = ATLASSIAN_SITE_NAME.includes('.atlassian.net')
            ? `https://${ATLASSIAN_SITE_NAME}`
            : ATLASSIAN_SITE_NAME;
        const validation = validateAtlassianUrl(baseUrl);
        if (!validation.isValid) {
            logger.error('Invalid Atlassian URL:', validation.error);
            throw new Error(`Invalid Atlassian URL: ${validation.error}`);
        }
        // Determine deployment type
        const deploymentType = ATLASSIAN_DEPLOYMENT_TYPE || getDeploymentType(baseUrl);
        // Validate credentials based on deployment type
        if (deploymentType === 'cloud') {
            if (!ATLASSIAN_USER_EMAIL || !ATLASSIAN_API_TOKEN) {
                logger.error('Missing credentials for Cloud deployment (ATLASSIAN_USER_EMAIL, ATLASSIAN_API_TOKEN)');
                throw new Error('Missing credentials for Cloud deployment');
            }
            return {
                baseUrl,
                email: ATLASSIAN_USER_EMAIL,
                apiToken: ATLASSIAN_API_TOKEN,
                deploymentType: 'cloud'
            };
        }
        else {
            // Server/Data Center deployment
            if (ATLASSIAN_PAT_TOKEN) {
                // Personal Access Token (preferred for Server/DC)
                return {
                    baseUrl,
                    email: '', // Not required for PAT
                    apiToken: ATLASSIAN_PAT_TOKEN,
                    deploymentType: 'server'
                };
            }
            else if (ATLASSIAN_USER_EMAIL && ATLASSIAN_API_TOKEN) {
                // Basic Auth fallback for Server/DC
                return {
                    baseUrl,
                    email: ATLASSIAN_USER_EMAIL,
                    apiToken: ATLASSIAN_API_TOKEN,
                    deploymentType: 'server'
                };
            }
            else {
                logger.error('Missing credentials for Server/DC deployment (ATLASSIAN_PAT_TOKEN or ATLASSIAN_USER_EMAIL+ATLASSIAN_API_TOKEN)');
                throw new Error('Missing credentials for Server/DC deployment');
            }
        }
    }
    Config.getAtlassianConfigFromEnv = getAtlassianConfigFromEnv;
    /**
     * Get Jira configuration from environment variables
     */
    function getJiraConfigFromEnv() {
        const JIRA_URL = process.env.JIRA_URL || process.env.ATLASSIAN_SITE_NAME || '';
        const JIRA_USER_EMAIL = process.env.JIRA_USER_EMAIL || process.env.ATLASSIAN_USER_EMAIL || '';
        const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || process.env.ATLASSIAN_API_TOKEN || '';
        const JIRA_PAT_TOKEN = process.env.JIRA_PAT_TOKEN || process.env.ATLASSIAN_PAT_TOKEN || '';
        const JIRA_DEPLOYMENT_TYPE = process.env.JIRA_DEPLOYMENT_TYPE;
        if (!JIRA_URL) {
            logger.warn('No Jira URL found in environment variables (JIRA_URL or ATLASSIAN_SITE_NAME)');
            return null;
        }
        // Normalize and validate the URL
        const baseUrl = JIRA_URL.includes('.atlassian.net')
            ? `https://${JIRA_URL}`
            : JIRA_URL;
        const validation = validateAtlassianUrl(baseUrl);
        if (!validation.isValid) {
            logger.error('Invalid Jira URL:', validation.error);
            throw new Error(`Invalid Jira URL: ${validation.error}`);
        }
        // Determine deployment type
        const deploymentType = JIRA_DEPLOYMENT_TYPE || getDeploymentType(baseUrl);
        // Validate credentials based on deployment type
        if (deploymentType === 'cloud') {
            if (!JIRA_USER_EMAIL || !JIRA_API_TOKEN) {
                logger.error('Missing credentials for Jira Cloud deployment (JIRA_USER_EMAIL, JIRA_API_TOKEN)');
                throw new Error('Missing credentials for Jira Cloud deployment');
            }
            return {
                baseUrl,
                email: JIRA_USER_EMAIL,
                apiToken: JIRA_API_TOKEN,
                deploymentType: 'cloud'
            };
        }
        else {
            // Server/Data Center deployment
            if (JIRA_PAT_TOKEN) {
                // Personal Access Token (preferred for Server/DC)
                return {
                    baseUrl,
                    email: '', // Not required for PAT
                    apiToken: JIRA_PAT_TOKEN,
                    deploymentType: 'server'
                };
            }
            else if (JIRA_USER_EMAIL && JIRA_API_TOKEN) {
                // Basic Auth fallback for Server/DC
                return {
                    baseUrl,
                    email: JIRA_USER_EMAIL,
                    apiToken: JIRA_API_TOKEN,
                    deploymentType: 'server'
                };
            }
            else {
                logger.error('Missing credentials for Jira Server/DC deployment (JIRA_PAT_TOKEN or JIRA_USER_EMAIL+JIRA_API_TOKEN)');
                throw new Error('Missing credentials for Jira Server/DC deployment');
            }
        }
    }
    Config.getJiraConfigFromEnv = getJiraConfigFromEnv;
    /**
     * Get Confluence configuration from environment variables
     */
    function getConfluenceConfigFromEnv() {
        const CONFLUENCE_URL = process.env.CONFLUENCE_URL || process.env.ATLASSIAN_SITE_NAME || '';
        const CONFLUENCE_USER_EMAIL = process.env.CONFLUENCE_USER_EMAIL || process.env.ATLASSIAN_USER_EMAIL || '';
        const CONFLUENCE_API_TOKEN = process.env.CONFLUENCE_API_TOKEN || process.env.ATLASSIAN_API_TOKEN || '';
        const CONFLUENCE_PAT_TOKEN = process.env.CONFLUENCE_PAT_TOKEN || process.env.ATLASSIAN_PAT_TOKEN || '';
        const CONFLUENCE_DEPLOYMENT_TYPE = process.env.CONFLUENCE_DEPLOYMENT_TYPE;
        if (!CONFLUENCE_URL) {
            logger.warn('No Confluence URL found in environment variables (CONFLUENCE_URL or ATLASSIAN_SITE_NAME)');
            return null;
        }
        // Normalize and validate the URL
        let baseUrl = CONFLUENCE_URL;
        if (CONFLUENCE_URL.includes('.atlassian.net')) {
            baseUrl = `https://${CONFLUENCE_URL}`;
        }
        const validation = validateAtlassianUrl(baseUrl);
        if (!validation.isValid) {
            logger.error('Invalid Confluence URL:', validation.error);
            throw new Error(`Invalid Confluence URL: ${validation.error}`);
        }
        // Determine deployment type
        const deploymentType = CONFLUENCE_DEPLOYMENT_TYPE || getDeploymentType(baseUrl);
        // Validate credentials based on deployment type
        if (deploymentType === 'cloud') {
            if (!CONFLUENCE_USER_EMAIL || !CONFLUENCE_API_TOKEN) {
                logger.error('Missing credentials for Confluence Cloud deployment (CONFLUENCE_USER_EMAIL, CONFLUENCE_API_TOKEN)');
                throw new Error('Missing credentials for Confluence Cloud deployment');
            }
            return {
                baseUrl,
                email: CONFLUENCE_USER_EMAIL,
                apiToken: CONFLUENCE_API_TOKEN,
                deploymentType: 'cloud'
            };
        }
        else {
            // Server/Data Center deployment
            if (CONFLUENCE_PAT_TOKEN) {
                // Personal Access Token (preferred for Server/DC)
                return {
                    baseUrl,
                    email: '', // Not required for PAT
                    apiToken: CONFLUENCE_PAT_TOKEN,
                    deploymentType: 'server'
                };
            }
            else if (CONFLUENCE_USER_EMAIL && CONFLUENCE_API_TOKEN) {
                // Basic Auth fallback for Server/DC
                return {
                    baseUrl,
                    email: CONFLUENCE_USER_EMAIL,
                    apiToken: CONFLUENCE_API_TOKEN,
                    deploymentType: 'server'
                };
            }
            else {
                logger.error('Missing credentials for Confluence Server/DC deployment (CONFLUENCE_PAT_TOKEN or CONFLUENCE_USER_EMAIL+CONFLUENCE_API_TOKEN)');
                throw new Error('Missing credentials for Confluence Server/DC deployment');
            }
        }
    }
    Config.getConfluenceConfigFromEnv = getConfluenceConfigFromEnv;
    /**
     * Get separate configurations for Jira and Confluence
     */
    function getSeparateConfigsFromEnv() {
        const jiraConfig = getJiraConfigFromEnv();
        const confluenceConfig = getConfluenceConfigFromEnv();
        return {
            jira: jiraConfig || undefined,
            confluence: confluenceConfig || undefined
        };
    }
    Config.getSeparateConfigsFromEnv = getSeparateConfigsFromEnv;
    /**
     * Helper to get Atlassian config from context or environment
     */
    function getConfigFromContextOrEnv(context) {
        if (context?.atlassianConfig) {
            return context.atlassianConfig;
        }
        return getAtlassianConfigFromEnv();
    }
    Config.getConfigFromContextOrEnv = getConfigFromContextOrEnv;
    /**
     * Helper to get Jira config from context or environment
     */
    function getJiraConfigFromContextOrEnv(context) {
        if (context?.jiraConfig) {
            return context.jiraConfig;
        }
        return getJiraConfigFromEnv();
    }
    Config.getJiraConfigFromContextOrEnv = getJiraConfigFromContextOrEnv;
    /**
     * Helper to get Confluence config from context or environment
     */
    function getConfluenceConfigFromContextOrEnv(context) {
        if (context?.confluenceConfig) {
            return context.confluenceConfig;
        }
        return getConfluenceConfigFromEnv();
    }
    Config.getConfluenceConfigFromContextOrEnv = getConfluenceConfigFromContextOrEnv;
    /**
     * Validate configuration for a specific deployment type
     */
    function validateConfig(config) {
        try {
            // Validate URL format
            const urlValidation = validateAtlassianUrl(config.baseUrl);
            if (!urlValidation.isValid) {
                return { isValid: false, error: urlValidation.error };
            }
            // Validate deployment type consistency
            const detectedType = getDeploymentType(config.baseUrl);
            if (config.deploymentType !== detectedType) {
                logger.warn(`Deployment type mismatch: configured as ${config.deploymentType}, detected as ${detectedType}`);
            }
            // Validate credentials based on deployment type
            if (config.deploymentType === 'cloud') {
                if (!config.email || !config.apiToken) {
                    return { isValid: false, error: 'Cloud deployment requires email and API token' };
                }
            }
            else {
                if (!config.apiToken) {
                    return { isValid: false, error: 'Server/DC deployment requires API token or PAT' };
                }
            }
            return { isValid: true };
        }
        catch (error) {
            return { isValid: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
    Config.validateConfig = validateConfig;
})(Config || (Config = {}));
/**
 * Resource helper functions
 */
export var Resources;
(function (Resources) {
    /**
     * Create a standardized resource response with metadata and schema
     */
    function createStandardResource(uri, data, dataKey, schema, totalCount, limit, offset, uiUrl) {
        // Create standard metadata
        const metadata = createStandardMetadata(totalCount, limit, offset, uri, uiUrl);
        // Create response data object
        const responseData = {
            metadata: metadata
        };
        // Add the data with the specified key
        responseData[dataKey] = data;
        // Return formatted resource
        return createJsonResponse(uri, responseData);
    }
    Resources.createStandardResource = createStandardResource;
    /**
     * Extract paging parameters from resource URI or request
     */
    function extractPagingParams(params, defaultLimit = 20, defaultOffset = 0) {
        let limit = defaultLimit;
        let offset = defaultOffset;
        if (params) {
            // Extract limit
            if (params.limit) {
                const limitParam = Array.isArray(params.limit) ? params.limit[0] : params.limit;
                const parsedLimit = parseInt(limitParam, 10);
                if (!isNaN(parsedLimit) && parsedLimit > 0) {
                    limit = parsedLimit;
                }
            }
            // Extract offset
            if (params.offset) {
                const offsetParam = Array.isArray(params.offset) ? params.offset[0] : params.offset;
                const parsedOffset = parseInt(offsetParam, 10);
                if (!isNaN(parsedOffset) && parsedOffset >= 0) {
                    offset = parsedOffset;
                }
            }
        }
        return { limit, offset };
    }
    Resources.extractPagingParams = extractPagingParams;
})(Resources || (Resources = {}));
/**
 * Tool helper functions
 */
export var Tools;
(function (Tools) {
    /**
     * Create a standardized response for MCP tools
     */
    function createToolResponse(success, message, data) {
        const response = {
            success,
            ...(message && { message }),
            ...(data && { data })
        };
        return {
            contents: [
                {
                    mimeType: 'application/json',
                    text: JSON.stringify(response)
                }
            ]
        };
    }
    Tools.createToolResponse = createToolResponse;
    /**
     * Higher-order function to wrap a tool implementation with standardized error handling
     */
    function wrapWithErrorHandling(toolName, handler) {
        return async (params) => {
            try {
                // Execute the handler
                const result = await handler(params);
                // Return successful response with data
                return createToolResponse(true, `${toolName} executed successfully`, result);
            }
            catch (error) {
                // Log the error
                logger.error(`Error executing tool ${toolName}:`, error);
                // Create appropriate error message
                let errorMessage;
                if (error instanceof ApiError) {
                    errorMessage = error.message;
                }
                else {
                    errorMessage = error instanceof Error ? error.message : String(error);
                }
                // Return standardized error response
                return createToolResponse(false, errorMessage);
            }
        };
    }
    Tools.wrapWithErrorHandling = wrapWithErrorHandling;
})(Tools || (Tools = {}));
