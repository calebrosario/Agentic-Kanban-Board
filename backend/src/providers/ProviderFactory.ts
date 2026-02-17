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
   * Clear all provider instances
   * Useful for testing or hot reloading
   */
  static clearInstances(): void {
    for (const instance of this.instances.values()) {
      if (instance.removeAllListeners) {
        instance.removeAllListeners();
      }
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

/**
 * Register all available providers
 * Should be called at application startup
 */
export function registerProviders(): void {
  // ClaudeProvider - static import
  const { ClaudeProvider } = require('./ClaudeProvider');
  ProviderFactory.register(
    ToolType.CLAUDE,
    () => new ClaudeProvider(true)
  );

  // OpenCodeProvider - static import
  const { OpenCodeProvider } = require('./OpenCodeProvider');
  ProviderFactory.register(
    ToolType.OPENCODE,
    () => new OpenCodeProvider()
  );

  // CursorProvider - dynamic import to avoid circular dependencies
  ProviderFactory.register(
    ToolType.CURSOR,
    () => {
      const { CursorProvider } = require('./CursorProvider');
      return new CursorProvider();
    }
  );

  // KiloCodeProvider - dynamic import to avoid circular dependencies
  ProviderFactory.register(
    ToolType.KILOCODE,
    () => {
      const { KiloCodeProvider } = require('./KiloCodeProvider');
      return new KiloCodeProvider();
    }
  );
}

export default ProviderFactory;
