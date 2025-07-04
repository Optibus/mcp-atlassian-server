/**
 * User ID helper utility for handling differences between Cloud and Server/Data Center
 * 
 * Cloud uses: accountId (unique identifier)
 * Server/DC uses: name, key, or username (depending on version and configuration)
 */

import { Logger } from './logger.js';

const logger = Logger.getLogger('UserIdHelper');

/**
 * Normalized user data structure
 */
export interface NormalizedUser {
  id: string;          // Primary identifier (accountId for Cloud, name/key for Server)
  displayName: string; // Human-readable name
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
  accountType?: string;
  active?: boolean;
  // Original data for reference
  original: any;
  deploymentType: 'cloud' | 'server';
}

/**
 * User data from Cloud API
 */
export interface CloudUser {
  accountId: string;
  accountType: string;
  displayName: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
  active: boolean;
}

/**
 * User data from Server/DC API
 */
export interface ServerUser {
  name?: string;        // Username (most common identifier)
  key?: string;         // User key (alternative identifier)
  displayName: string;
  emailAddress?: string;
  avatarUrls?: Record<string, string>;
  active?: boolean;
}

/**
 * Get the primary user identifier based on deployment type
 */
export function getUserIdentifier(userData: any, deploymentType: 'cloud' | 'server'): string | null {
  if (!userData) {
    logger.warn('No user data provided for identifier extraction');
    return null;
  }

  try {
    if (deploymentType === 'cloud') {
      // Cloud: use accountId
      const accountId = userData.accountId;
      if (!accountId) {
        logger.warn('Cloud user data missing accountId', userData);
        return null;
      }
      return accountId;
    } else {
      // Server/DC: prefer name, fallback to key
      const name = userData.name;
      const key = userData.key;
      
      if (name) {
        return name;
      } else if (key) {
        logger.debug('Using user key as identifier (name not available)');
        return key;
      } else {
        logger.warn('Server/DC user data missing both name and key', userData);
        return null;
      }
    }
  } catch (error) {
    logger.error('Error extracting user identifier:', error);
    return null;
  }
}

/**
 * Normalize user data to a consistent format regardless of deployment type
 */
export function normalizeUserData(userData: any, deploymentType: 'cloud' | 'server'): NormalizedUser | null {
  if (!userData) {
    logger.warn('No user data provided for normalization');
    return null;
  }

  try {
    const id = getUserIdentifier(userData, deploymentType);
    if (!id) {
      logger.error('Could not extract user identifier for normalization');
      return null;
    }

    const normalized: NormalizedUser = {
      id,
      displayName: userData.displayName || userData.name || id,
      emailAddress: userData.emailAddress,
      avatarUrls: userData.avatarUrls,
      active: userData.active !== false, // Default to true if not specified
      original: userData,
      deploymentType
    };

    // Add Cloud-specific fields
    if (deploymentType === 'cloud') {
      normalized.accountType = userData.accountType;
    }

    logger.debug(`Normalized user data for ${deploymentType}:`, { id, displayName: normalized.displayName });
    return normalized;
  } catch (error) {
    logger.error('Error normalizing user data:', error);
    return null;
  }
}

/**
 * Create user lookup query based on deployment type
 */
export function createUserLookupQuery(identifier: string, deploymentType: 'cloud' | 'server'): Record<string, string> {
  if (deploymentType === 'cloud') {
    // Cloud: lookup by accountId
    return { accountId: identifier };
  } else {
    // Server/DC: lookup by username (name field)
    return { username: identifier };
  }
}

/**
 * Validate user identifier format based on deployment type
 */
export function validateUserIdentifier(identifier: string, deploymentType: 'cloud' | 'server'): { isValid: boolean; error?: string } {
  if (!identifier || typeof identifier !== 'string') {
    return { isValid: false, error: 'User identifier must be a non-empty string' };
  }

  if (deploymentType === 'cloud') {
    // Cloud accountId: typically in format like "5b10a2844c20165700ede21g"
    // Should be alphanumeric, 24+ characters
    if (identifier.length < 10) {
      return { isValid: false, error: 'Cloud accountId appears too short' };
    }
    if (!/^[a-zA-Z0-9]+$/.test(identifier)) {
      return { isValid: false, error: 'Cloud accountId should be alphanumeric' };
    }
  } else {
    // Server/DC username: typically alphanumeric with some special chars
    // More lenient validation
    if (identifier.length < 1) {
      return { isValid: false, error: 'Server username cannot be empty' };
    }
    // Allow alphanumeric, dots, hyphens, underscores
    if (!/^[a-zA-Z0-9._-]+$/.test(identifier)) {
      return { isValid: false, error: 'Server username contains invalid characters' };
    }
  }

  return { isValid: true };
}

/**
 * Convert user identifier for assignment operations
 * Some APIs expect different formats for assignment vs lookup
 */
export function formatUserForAssignment(identifier: string, deploymentType: 'cloud' | 'server'): Record<string, string> {
  if (deploymentType === 'cloud') {
    // Cloud: use accountId for assignments
    return { accountId: identifier };
  } else {
    // Server/DC: use name for assignments
    return { name: identifier };
  }
}

/**
 * Extract user identifier from various API response formats
 */
export function extractUserFromApiResponse(responseData: any, deploymentType: 'cloud' | 'server'): string | null {
  if (!responseData) return null;

  // Handle different response structures
  if (responseData.user) {
    return getUserIdentifier(responseData.user, deploymentType);
  }
  
  if (responseData.assignee) {
    return getUserIdentifier(responseData.assignee, deploymentType);
  }
  
  if (responseData.reporter) {
    return getUserIdentifier(responseData.reporter, deploymentType);
  }

  // Direct user object
  return getUserIdentifier(responseData, deploymentType);
}

/**
 * Batch normalize multiple user objects
 */
export function normalizeUserList(userList: any[], deploymentType: 'cloud' | 'server'): NormalizedUser[] {
  if (!Array.isArray(userList)) {
    logger.warn('User list is not an array');
    return [];
  }

  const normalized: NormalizedUser[] = [];
  
  for (const userData of userList) {
    const normalizedUser = normalizeUserData(userData, deploymentType);
    if (normalizedUser) {
      normalized.push(normalizedUser);
    }
  }

  logger.debug(`Normalized ${normalized.length}/${userList.length} users for ${deploymentType}`);
  return normalized;
} 