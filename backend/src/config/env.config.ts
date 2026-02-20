export interface AuthConfig {
  username: string;
  password: string;
  jwtSecret: string;
}

export interface ClaudeConfig {
  executable: string;
  timeout: number;
}

export interface OpenCodeConfig {
  executable: string;
  configDir: string;
  configPath: string;
  model: string;
  enabled: boolean;
}

/**
 * Cursor-specific configuration (MCP-based)
 */
export interface CursorProviderConfig {
  mcpCommand?: string;
  mcpArgs?: string[];
  timeout?: number;
}

/**
 * KiloCode-specific configuration
 */
export interface KiloCodeProviderConfig {
  executable?: string;
  timeout?: number;
}

/**
 * Codex-specific configuration
 */
export interface CodexProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
}

export interface SecurityConfig {
  allowedDirs: string[];
}

export interface ProcessConfig {
  enableOptimizations: boolean;
  startupDelay: number;
  messageTimeout: number;
}

export interface EnvConfig {
  port: number;
  databasePath: string;
  auth: AuthConfig;
  claude: ClaudeConfig;
  opencode: OpenCodeConfig;
  cursor: CursorProviderConfig;
  kilocode?: KiloCodeProviderConfig;
  codex?: CodexProviderConfig;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  security: SecurityConfig;
  process: ProcessConfig;
  nodeEnv: 'development' | 'production' | 'test';
}

export const getEnvConfig = (): EnvConfig => {
  return {
    // 基礎設定
    port: parseInt(process.env.BACKEND_PORT || '8905', 10),
    databasePath: process.env.DATABASE_PATH || './data/sessions.db',
    
    // 安全設定
    auth: {
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin',
      jwtSecret: process.env.JWT_SECRET || 'dev-secret-key'
    },
    
    // Claude 設定
    claude: {
      executable: process.env.CLAUDE_EXECUTABLE || 'claude',
      timeout: parseInt(process.env.CLAUDE_TIMEOUT || '300000', 10)
    },

    // OpenCode 設定 (with oh-my-opencode support)
    opencode: {
      executable: process.env.OPENCODE_EXECUTABLE || 'opencode',
      configDir: process.env.OPENCODE_CONFIG_DIR || '~/.config/opencode/',
      configPath: process.env.OPENCODE_CONFIG || '~/.config/opencode/opencode.json',
      model: process.env.OPENCODE_MODEL || 'anthropic/claude-sonnet-4-20250514',
      enabled: process.env.OH_MY_OPENCODE_ENABLED !== 'false'
    },

    // Cursor 設定 (MCP-based)
    cursor: {
      mcpCommand: process.env.CURSOR_MCP_COMMAND,
      mcpArgs: process.env.CURSOR_MCP_ARGS ? JSON.parse(process.env.CURSOR_MCP_ARGS) : undefined,
      timeout: parseInt(process.env.CURSOR_TIMEOUT || '300000', 10)
    },

    // KiloCode 設定
    kilocode: {
      executable: process.env.KILOCODE_EXECUTABLE || 'kilocode',
      timeout: parseInt(process.env.KILOCODE_TIMEOUT || '300000', 10)
    },

    // Codex 設定
    codex: {
      apiKey: process.env.CODEX_API_KEY,
      baseUrl: process.env.CODEX_BASE_URL,
      model: process.env.CODEX_MODEL,
      timeout: parseInt(process.env.CODEX_TIMEOUT || '300000', 10)
    },

    // 日誌設定
    logLevel: (process.env.LOG_LEVEL as EnvConfig['logLevel']) || 'info',
    
    // 安全設定
    security: {
      allowedDirs: process.env.ALLOWED_DIRS?.split(',') || ['/tmp', '/workspace']
    },
    
    // 處理程序設定
    process: {
      enableOptimizations: process.env.ENABLE_PROCESS_OPTIMIZATIONS !== 'false',
      startupDelay: parseInt(process.env.PROCESS_STARTUP_DELAY || '500', 10),
      messageTimeout: parseInt(process.env.PROCESS_MESSAGE_TIMEOUT || '120000', 10)
    },
    
    // 環境模式
    nodeEnv: (process.env.NODE_ENV as EnvConfig['nodeEnv']) || 'development'
  };
};