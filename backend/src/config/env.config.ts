export interface AuthConfig {
  username: string;
  password: string;
  jwtSecret: string;
}

export interface ClaudeConfig {
  executable: string;
  timeout: number;
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
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  security: SecurityConfig;
  process: ProcessConfig;
  nodeEnv: 'development' | 'production' | 'test';
}

export const getEnvConfig = (): EnvConfig => {
  return {
    // 基礎設定
    port: parseInt(process.env.BACKEND_PORT || '9876', 10),
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