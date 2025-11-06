/**
 * Resource Registry - Central registry for MCP resources
 * Tracks all available resource patterns (static URIs and URI templates)
 */

import { Logger } from "./logger.js";

const logger = Logger.getLogger("ResourceRegistry");

export interface ResourceDefinition {
  uri?: string;
  uriTemplate?: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Global resource registry
 */
class ResourceRegistry {
  private resources: ResourceDefinition[] = [];

  /**
   * Register a new resource definition
   */
  register(resource: ResourceDefinition): void {
    this.resources.push(resource);
    logger.debug(
      `Registered resource: ${resource.name} (${
        resource.uri || resource.uriTemplate
      })`
    );
  }

  /**
   * Get all registered resources
   */
  getAll(): ResourceDefinition[] {
    return [...this.resources];
  }

  /**
   * Clear all registered resources
   */
  clear(): void {
    this.resources = [];
  }

  /**
   * Get count of registered resources
   */
  count(): number {
    return this.resources.length;
  }
}

// Singleton instance
const registry = new ResourceRegistry();

export { registry as resourceRegistry };
