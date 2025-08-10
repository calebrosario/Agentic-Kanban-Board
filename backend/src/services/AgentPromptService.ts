import { Database } from '../database/database';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AgentListItem {
  name: string;
  fileName: string;
}

export interface AgentDetail extends AgentListItem {
  content: string;
  description?: string;
  tools?: string[];
}

export class AgentPromptService {
  private db: Database;
  private claudePath?: string;

  constructor() {
    this.db = Database.getInstance();
  }

  /**
   * 初始化服務，從資料庫讀取 Claude agents 路徑設定
   */
  async initialize(): Promise<void> {
    try {
      const result = await this.db.get<{ value: string }>(
        `SELECT value FROM system_config WHERE key = 'claude_agents_path'`
      );
      this.claudePath = result?.value || undefined;
      
      if (this.claudePath) {
        console.log(`AgentPromptService initialized with path: ${this.claudePath}`);
      } else {
        console.log('AgentPromptService: No Claude agents path configured');
      }
    } catch (error) {
      console.error('Failed to initialize AgentPromptService:', error);
    }
  }

  /**
   * 取得或設定 Claude agents 路徑
   */
  async getClaudePath(): Promise<string | null> {
    const result = await this.db.get<{ value: string }>(
      `SELECT value FROM system_config WHERE key = 'claude_agents_path'`
    );
    return result?.value || null;
  }

  async setClaudePath(newPath: string): Promise<void> {
    // 驗證路徑安全性
    if (newPath.includes('..')) {
      throw new Error('Invalid path: Path traversal not allowed');
    }

    // 檢查路徑是否存在
    try {
      await fs.access(newPath);
    } catch {
      throw new Error('Path does not exist or is not accessible');
    }

    // 更新資料庫
    await this.db.run(
      `INSERT INTO system_config (key, value) VALUES ('claude_agents_path', ?)
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
      [newPath, newPath]
    );

    this.claudePath = newPath;
    console.log(`Claude agents path updated to: ${newPath}`);
  }

  /**
   * 列出所有 agent 檔案
   */
  async listAgents(): Promise<AgentListItem[]> {
    if (!this.claudePath) {
      return [];
    }

    try {
      const files = await fs.readdir(this.claudePath);
      
      // 過濾出 .md 檔案
      const mdFiles = files.filter(file => file.endsWith('.md'));
      
      // 轉換為 AgentListItem 格式
      return mdFiles.map(fileName => ({
        name: fileName.replace('.md', ''),
        fileName
      }));
    } catch (error) {
      console.error('Failed to list agents:', error);
      return [];
    }
  }

  /**
   * 取得單一 agent 的詳細內容
   */
  async getAgentContent(agentName: string): Promise<AgentDetail | null> {
    if (!this.claudePath) {
      throw new Error('Claude agents path not configured');
    }

    // 驗證 agent 名稱安全性
    if (agentName.includes('..') || agentName.includes('/') || agentName.includes('\\')) {
      throw new Error('Invalid agent name');
    }

    try {
      const filePath = path.join(this.claudePath, `${agentName}.md`);
      const content = await fs.readFile(filePath, 'utf-8');
      
      // 解析 YAML frontmatter（如果有的話）
      const parsedContent = this.parseMarkdownWithFrontmatter(content);
      
      return {
        name: agentName,
        fileName: `${agentName}.md`,
        content: content,
        description: parsedContent.description,
        tools: parsedContent.tools
      };
    } catch (error) {
      console.error(`Failed to read agent ${agentName}:`, error);
      return null;
    }
  }

  /**
   * 解析 Markdown 檔案的 YAML frontmatter
   */
  private parseMarkdownWithFrontmatter(content: string): {
    description?: string;
    tools?: string[];
    body: string;
  } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      return { body: content };
    }

    const frontmatter = match[1];
    const body = match[2];
    
    // 簡單解析 YAML（只處理 name, description, tools）
    const description = frontmatter.match(/description:\s*(.+)/)?.[1];
    const toolsMatch = frontmatter.match(/tools:\s*\[([^\]]+)\]/);
    const tools = toolsMatch ? toolsMatch[1].split(',').map(t => t.trim()) : undefined;
    
    return {
      description,
      tools,
      body
    };
  }

  /**
   * 檢查服務是否已設定
   */
  isConfigured(): boolean {
    return !!this.claudePath;
  }
}

// 建立單例
export const agentPromptService = new AgentPromptService();