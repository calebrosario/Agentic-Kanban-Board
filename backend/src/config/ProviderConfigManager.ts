import { ProviderConfig, ToolType } from '../types/provider.types';
import { getEnvConfig } from './env.config';

export class ProviderConfigManager {
  private static instance: ProviderConfigManager;
  private configs: Map<ToolType, any> = new Map();

  private constructor() {
    this.loadAllConfigs();
  }

  static getInstance(): ProviderConfigManager {
    if (!ProviderConfigManager.instance) {
      ProviderConfigManager.instance = new ProviderConfigManager();
    }
    return ProviderConfigManager.instance;
  }

  private loadAllConfigs(): void {
    const env = getEnvConfig();

    this.configs.set(ToolType.CLAUDE, {
      executable: env.claude.executable,
      timeout: env.claude.timeout
    });

    if (env.opencode) {
      this.configs.set(ToolType.OPENCODE, env.opencode);
    }

    if (env.cursor) {
      this.configs.set(ToolType.CURSOR, env.cursor);
    }

    if (env.kilocode) {
      this.configs.set(ToolType.KILOCODE, env.kilocode);
    }

    if (env.codex) {
      this.configs.set(ToolType.CODEX, env.codex);
    }
  }

  getConfig(toolType: ToolType): any {
    return this.configs.get(toolType);
  }

  setConfig(toolType: ToolType, config: any): void {
    this.configs.set(toolType, config);
  }

  getAllConfigs(): ProviderConfig {
    return {
      claude: this.configs.get(ToolType.CLAUDE),
      opencode: this.configs.get(ToolType.OPENCODE),
      cursor: this.configs.get(ToolType.CURSOR),
      kilocode: this.configs.get(ToolType.KILOCODE),
      codex: this.configs.get(ToolType.CODEX)
    };
  }

  reload(): void {
    this.configs.clear();
    this.loadAllConfigs();
  }
}
