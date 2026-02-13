import ProviderFactory from './ProviderFactory';
import { ClaudeProvider } from './ClaudeProvider';
import { ToolType } from '../types/provider.types';

export function registerProviders(): void {
  ProviderFactory.register(
    ToolType.CLAUDE,
    () => new ClaudeProvider(true)
  );
}
