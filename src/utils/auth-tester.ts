/**
 * Authentication Testing Utility
 * 
 * This utility provides functions to test authentication for both Cloud and Server/DC deployments.
 * It validates credentials by calling the `/rest/api/2/myself` endpoint.
 */

import { AtlassianConfig } from './atlassian-api-base.js';
import { Logger } from './logger.js';
import { getDeploymentType } from './deployment-detector.js';
import { AuthStrategyFactory } from './auth-strategy.js';
import { Config } from './mcp-helpers.js';

const logger = Logger.getLogger('AuthTester');

export interface AuthTestResult {
  success: boolean;
  deploymentType: 'cloud' | 'server';
  authType: string;
  user?: {
    accountId?: string;
    username?: string;
    displayName?: string;
    emailAddress?: string;
    active?: boolean;
  };
  error?: string;
  statusCode?: number;
}

/**
 * Test authentication by calling the /rest/api/2/myself endpoint
 */
export async function testAuthentication(config: AtlassianConfig): Promise<AuthTestResult> {
  const deploymentType = getDeploymentType(config.baseUrl);
  logger.info(`Testing authentication for ${deploymentType} deployment: ${config.baseUrl}`);

  try {
    // Create enhanced config for auth strategy
    const enhancedConfig: Config.EnhancedAtlassianConfig = {
      baseUrl: config.baseUrl,
      deploymentType,
      email: config.email,
      apiToken: config.apiToken
    };

    // Create auth strategy
    const authResult = AuthStrategyFactory.createAndValidate(enhancedConfig);
    
    if (!authResult.strategy) {
      return {
        success: false,
        deploymentType,
        authType: 'unknown',
        error: authResult.error || 'Failed to create auth strategy'
      };
    }

    const authStrategy = authResult.strategy;

    // Build the myself endpoint URL
    const baseUrl = config.baseUrl.endsWith('/') ? config.baseUrl.slice(0, -1) : config.baseUrl;
    const myselfUrl = `${baseUrl}/rest/api/2/myself`;

    // Make the request
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'MCP-Atlassian-Server/2.1.1',
      ...authStrategy.getAuthHeaders()
    };

    logger.info(`Making request to: ${myselfUrl}`);
    const response = await fetch(myselfUrl, {
      method: 'GET',
      headers,
      credentials: 'omit'
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Authentication failed with status ${response.status}:`, errorText);
      
      return {
        success: false,
        deploymentType,
        authType: authStrategy.getAuthType(),
        error: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status
      };
    }

    const userData = await response.json();
    logger.info('Authentication successful!', { user: userData.displayName || userData.name });

    return {
      success: true,
      deploymentType,
      authType: authStrategy.getAuthType(),
      user: {
        accountId: userData.accountId,
        username: userData.name || userData.username,
        displayName: userData.displayName,
        emailAddress: userData.emailAddress,
        active: userData.active !== false
      }
    };

  } catch (error) {
    logger.error('Authentication test failed with error:', error);
    
    return {
      success: false,
      deploymentType,
      authType: 'unknown',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test multiple authentication configurations
 */
export async function testMultipleConfigs(configs: AtlassianConfig[]): Promise<AuthTestResult[]> {
  logger.info(`Testing ${configs.length} authentication configurations`);
  
  const results: AuthTestResult[] = [];
  
  for (const [index, config] of configs.entries()) {
    logger.info(`Testing configuration ${index + 1}/${configs.length}`);
    const result = await testAuthentication(config);
    results.push(result);
    
    // Add small delay between requests to be respectful
    if (index < configs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

/**
 * Validate configuration without making network requests
 */
export function validateConfig(config: AtlassianConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const deploymentType = getDeploymentType(config.baseUrl);

  // Validate base URL
  try {
    new URL(config.baseUrl);
  } catch (error) {
    errors.push('Invalid base URL format');
  }

  // Validate authentication based on deployment type
  if (deploymentType === 'cloud') {
    if (!config.email || !config.apiToken) {
      errors.push('Cloud deployment requires email and API token');
    }
    if (config.email && !config.email.includes('@')) {
      errors.push('Invalid email format for Cloud deployment');
    }
  } else {
    // Server/DC
    if (!config.email || !config.apiToken) {
      errors.push('Server/DC deployment requires email and API token (or username+password)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create test configurations for common scenarios
 */
export function createTestConfigs(): {
  cloud: Partial<AtlassianConfig>;
  serverPAT: Partial<AtlassianConfig>;
  serverBasic: Partial<AtlassianConfig>;
} {
  return {
    cloud: {
      baseUrl: 'https://company.atlassian.net',
      email: 'user@company.com',
      apiToken: 'cloud_api_token'
    },
    serverPAT: {
      baseUrl: 'https://jira.company.com',
      email: 'admin',
      apiToken: 'server_pat_token'
    },
    serverBasic: {
      baseUrl: 'https://jira.company.com',
      email: 'admin',
      apiToken: 'admin_password'
    }
  };
}

/**
 * Generate detailed authentication report
 */
export function generateAuthReport(results: AuthTestResult[]): string {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  let report = `\n🔐 Authentication Test Report\n`;
  report += `${'='.repeat(50)}\n\n`;
  
  report += `📊 Summary:\n`;
  report += `  ✅ Successful: ${successful.length}\n`;
  report += `  ❌ Failed: ${failed.length}\n`;
  report += `  📈 Success Rate: ${Math.round((successful.length / results.length) * 100)}%\n\n`;
  
  if (successful.length > 0) {
    report += `✅ Successful Authentications:\n`;
    successful.forEach((result, index) => {
      report += `  ${index + 1}. ${result.deploymentType.toUpperCase()} (${result.authType})\n`;
      if (result.user) {
        report += `     User: ${result.user.displayName || result.user.username}\n`;
        report += `     Email: ${result.user.emailAddress || 'N/A'}\n`;
      }
    });
    report += '\n';
  }
  
  if (failed.length > 0) {
    report += `❌ Failed Authentications:\n`;
    failed.forEach((result, index) => {
      report += `  ${index + 1}. ${result.deploymentType.toUpperCase()} (${result.authType})\n`;
      report += `     Error: ${result.error}\n`;
      if (result.statusCode) {
        report += `     Status: ${result.statusCode}\n`;
      }
    });
  }
  
  return report;
} 