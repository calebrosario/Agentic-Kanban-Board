import { IToolProvider } from './IToolProvider';
import { ToolType } from '../types/provider.types';

/**
 * ProviderFactory
 *
 * Registry-based factory for creating tool provider instances.
 * Supports dynamic registration of new providers without code changes.
 */
class ProviderFactory {
  private static registry = new Map<ToolType, () => IToolProvider>();

  private static instances = new Map<ToolType, IToolProvider>();

  /**
   * Register a provider class factory function
   * Should be called at application startup to register all available providers
   *
   * @param toolType - The tool type identifier
   * @param providerFactory - Factory function that creates the provider instance
   */
  static register(toolType: ToolType, providerFactory: () => IToolProvider): void {
    if (this.registry.has(toolType)) {
      console.warn(`Provider ${toolType} already registered, overwriting`);
    }
    this.registry.set(toolType, providerFactory);
  }

  /**
   * Create a provider instance for the given tool type
   * Reuses existing instances if available
   *
   * @param toolType - The tool type to create
   * @returns IToolProvider instance
   * @throws Error if tool type is not registered
   */
  static create(toolType: ToolType): IToolProvider {
    const factory = this.registry.get(toolType);
    if (!factory) {
      throw new Error(`Provider for tool type '${toolType}' is not registered`);
    }

    // Reuse existing instance if available
    if (this.instances.has(toolType)) {
      return this.instances.get(toolType)!;
    }

    const instance = factory();
    this.instances.set(toolType, instance);
    return instance;
  }

  /**
   * Get list of all registered tool types
   *
   * @returns Array of ToolType strings
   */
  static getRegisteredTools(): ToolType[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Check if a tool type is registered
   *
   * @param toolType - The tool type to check
   * @returns true if registered, false otherwise
   */
  static isRegistered(toolType: ToolType): boolean {
    return this.registry.has(toolType);
  }

  /**
   * Clear all provider instances (useful for testing or hot reloading)
   */
  static clearInstances(): void {
    for (const instance of this.instances.values()) {
      instance.removeAllListeners();
    }
    this.instances.clear();
  }

  /**
   * Get a specific provider instance without creating if it doesn't exist
   *
   * @param toolType - The tool type to get
   * @returns Provider instance or undefined
   */
  static getInstance(toolType: ToolType): IToolProvider | undefined {
    return this.instances.get(toolType);
  }
}

export default ProviderFactory;
