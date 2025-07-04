/**
 * Authentication strategy system for different Atlassian deployment types
 * Supports both Cloud (Basic Auth) and Server/Data Center (PAT/Basic Auth)
 */

import { Logger } from './logger.js';
import { Config } from './mcp-helpers.js';

const logger = Logger.getLogger('AuthStrategy');

/**
 * Interface for authentication strategies
 */
export interface AuthStrategy {
  /**
   * Get authentication headers for API requests
   */
  getAuthHeaders(): Record<string, string>;
  
  /**
   * Get authentication type for logging/debugging
   */
  getAuthType(): string;
  
  /**
   * Validate the authentication configuration
   */
  validate(): { isValid: boolean; error?: string };
}

/**
 * Cloud authentication using Basic Auth (email:token)
 */
export class CloudAuthStrategy implements AuthStrategy {
  private email: string;
  private apiToken: string;

  constructor(email: string, apiToken: string) {
    this.email = email;
    this.apiToken = apiToken;
  }

  getAuthHeaders(): Record<string, string> {
    const credentials = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  getAuthType(): string {
    return 'Cloud Basic Auth (email:token)';
  }

  validate(): { isValid: boolean; error?: string } {
    if (!this.email || !this.apiToken) {
      return { 
        isValid: false, 
        error: 'Cloud auth requires both email and API token' 
      };
    }
    
    // Basic email validation
    if (!this.email.includes('@')) {
      return { 
        isValid: false, 
        error: 'Invalid email format for Cloud auth' 
      };
    }

    return { isValid: true };
  }
}

/**
 * Server/Data Center authentication with multiple auth methods
 */
export class ServerAuthStrategy implements AuthStrategy {
  private authMethod: 'pat' | 'basic';
  private token: string;
  private username?: string;

  constructor(token: string, username?: string) {
    this.token = token;
    this.username = username;
    
    // Determine auth method based on presence of username
    if (username && username.length > 0) {
      this.authMethod = 'basic';
    } else {
      this.authMethod = 'pat';
    }
    
    logger.debug(`Server auth initialized with method: ${this.authMethod}`);
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (this.authMethod === 'pat') {
      // Personal Access Token - Bearer token
      headers['Authorization'] = `Bearer ${this.token}`;
    } else {
      // Basic Auth - username:password
      const credentials = Buffer.from(`${this.username}:${this.token}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return headers;
  }

  getAuthType(): string {
    return this.authMethod === 'pat' 
      ? 'Server PAT (Bearer token)' 
      : 'Server Basic Auth (username:password)';
  }

  validate(): { isValid: boolean; error?: string } {
    if (!this.token) {
      return { 
        isValid: false, 
        error: 'Server auth requires a token' 
      };
    }

    if (this.authMethod === 'basic' && !this.username) {
      return { 
        isValid: false, 
        error: 'Server Basic Auth requires both username and password' 
      };
    }

    return { isValid: true };
  }
}

/**
 * Factory to create appropriate auth strategy based on deployment type and config
 */
export class AuthStrategyFactory {
  /**
   * Create auth strategy from enhanced config
   */
  static createFromConfig(config: Config.EnhancedAtlassianConfig): AuthStrategy {
    logger.debug(`Creating auth strategy for ${config.deploymentType} deployment`);

    if (config.deploymentType === 'cloud') {
      return new CloudAuthStrategy(config.email, config.apiToken);
    } else {
      // Server/Data Center
      return new ServerAuthStrategy(config.apiToken, config.email);
    }
  }

  /**
   * Create and validate auth strategy from config
   */
  static createAndValidate(config: Config.EnhancedAtlassianConfig): {
    strategy?: AuthStrategy;
    error?: string;
  } {
    try {
      const strategy = this.createFromConfig(config);
      const validation = strategy.validate();
      
      if (!validation.isValid) {
        logger.error(`Auth strategy validation failed: ${validation.error}`);
        return { error: validation.error };
      }

      logger.info(`Auth strategy created successfully: ${strategy.getAuthType()}`);
      return { strategy };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to create auth strategy:', errorMessage);
      return { error: errorMessage };
    }
  }
} 