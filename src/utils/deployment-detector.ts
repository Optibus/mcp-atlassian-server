/**
 * Deployment detection utility for Atlassian instances
 * Determines whether a URL belongs to Atlassian Cloud or Server/Data Center
 */

import { Logger } from './logger.js';

const logger = Logger.getLogger('DeploymentDetector');

/**
 * Determine if a URL belongs to Atlassian Cloud or Server/Data Center
 * 
 * @param url The URL to check
 * @returns True if the URL is for an Atlassian Cloud instance, False for Server/Data Center
 */
export function isAtlassianCloudUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    logger.debug('Invalid URL provided for deployment detection:', url);
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    if (!hostname) {
      logger.debug('No hostname found in URL:', url);
      return false;
    }

    logger.debug(`Checking deployment type for hostname: ${hostname}`);

    // Check for localhost or private IP addresses (always Server/DC)
    if (isLocalOrPrivateAddress(hostname)) {
      logger.debug(`Detected local/private address: ${hostname} -> Server/DC`);
      return false;
    }

    // Check for Atlassian Cloud domains
    const isCloud = isAtlassianCloudDomain(hostname);
    logger.debug(`Domain check result for ${hostname}: ${isCloud ? 'Cloud' : 'Server/DC'}`);
    
    return isCloud;
  } catch (error) {
    logger.error('Error parsing URL for deployment detection:', error);
    return false;
  }
}

/**
 * Get deployment type as string
 * 
 * @param url The URL to check
 * @returns 'cloud' for Atlassian Cloud, 'server' for Server/Data Center
 */
export function getDeploymentType(url: string): 'cloud' | 'server' {
  const isCloud = isAtlassianCloudUrl(url);
  const deploymentType = isCloud ? 'cloud' : 'server';
  
  logger.debug(`Deployment type for ${url}: ${deploymentType}`);
  return deploymentType;
}

/**
 * Check if hostname is localhost or private IP address
 * 
 * @param hostname The hostname to check
 * @returns True if it's a local or private address
 */
function isLocalOrPrivateAddress(hostname: string): boolean {
  // Check for localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }

  // Check for IPv4 private ranges
  const ipv4PrivateRanges = [
    /^127\./, // Loopback
    /^192\.168\./, // Private Class C
    /^10\./, // Private Class A
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B (172.16.0.0 to 172.31.255.255)
  ];

  for (const pattern of ipv4PrivateRanges) {
    if (pattern.test(hostname)) {
      return true;
    }
  }

  // Check for IPv6 localhost
  if (hostname === '::1') {
    return true;
  }

  // Check for local domain patterns
  const localDomainPatterns = [
    /\.local$/,
    /\.localhost$/,
    /\.internal$/,
    /\.corp$/,
    /\.company$/,
  ];

  for (const pattern of localDomainPatterns) {
    if (pattern.test(hostname)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if hostname belongs to Atlassian Cloud domains
 * 
 * @param hostname The hostname to check
 * @returns True if it's an Atlassian Cloud domain
 */
function isAtlassianCloudDomain(hostname: string): boolean {
  const cloudDomainPatterns = [
    /\.atlassian\.net$/,
    /\.jira\.com$/,
    /\.jira-dev\.com$/,
    /^api\.atlassian\.com$/,
  ];

  for (const pattern of cloudDomainPatterns) {
    if (pattern.test(hostname)) {
      return true;
    }
  }

  return false;
}

/**
 * Validate if a URL is properly formatted for Atlassian instance
 * 
 * @param url The URL to validate
 * @returns Object with validation result and error message if any
 */
export function validateAtlassianUrl(url: string): { isValid: boolean; error?: string; deploymentType?: 'cloud' | 'server' } {
  if (!url || typeof url !== 'string') {
    return { isValid: false, error: 'URL is required and must be a string' };
  }

  try {
    const parsedUrl = new URL(url);
    
    // Must be HTTP or HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { isValid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }

    // Must have a hostname
    if (!parsedUrl.hostname) {
      return { isValid: false, error: 'URL must have a valid hostname' };
    }

    const deploymentType = getDeploymentType(url);
    
    return {
      isValid: true,
      deploymentType
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid URL format: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get normalized base URL for Atlassian instance
 * Ensures proper protocol and format
 * 
 * @param url The input URL
 * @returns Normalized base URL
 */
export function normalizeAtlassianUrl(url: string): string {
  const validation = validateAtlassianUrl(url);
  if (!validation.isValid) {
    throw new Error(`Invalid Atlassian URL: ${validation.error}`);
  }

  try {
    const parsedUrl = new URL(url);
    
    // Ensure HTTPS for production instances
    if (parsedUrl.protocol === 'http:' && !isLocalOrPrivateAddress(parsedUrl.hostname)) {
      logger.warn(`Converting HTTP to HTTPS for non-local URL: ${url}`);
      parsedUrl.protocol = 'https:';
    }

    // Remove trailing slash
    let normalizedUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    
    // For Cloud instances, ensure proper format
    if (validation.deploymentType === 'cloud') {
      // Remove any path components for Cloud base URLs
      normalizedUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    }

    logger.debug(`Normalized URL from ${url} to ${normalizedUrl}`);
    return normalizedUrl;
  } catch (error) {
    throw new Error(`Failed to normalize URL: ${error instanceof Error ? error.message : String(error)}`);
  }
} 