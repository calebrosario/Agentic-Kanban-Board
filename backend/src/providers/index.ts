import ProviderFactory from './ProviderFactory';
import { ClaudeProvider } from './ClaudeProvider';
import { OpenCodeProvider } from './OpenCodeProvider';
import { ToolType } from '../types/provider.types';

export function registerProviders(): void {
  ProviderFactory.register(
    ToolType.CLAUDE,
    () => new ClaudeProvider(true)
  );

  ProviderFactory.register(
    ToolType.OPENCODE,
    () => new OpenCodeProvider()
  );
}
