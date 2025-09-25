import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Settings, FileText, AlertCircle } from 'lucide-react';

interface AgentListItem {
  name: string;
  fileName: string;
}

interface ConfigStatus {
  configured: boolean;
  path: string | null;
}

const AgentPromptsPage: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [config, setConfig] = useState<ConfigStatus>({ configured: false, path: null });
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [configError, setConfigError] = useState('');

  // 載入設定和 agent 列表
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/agent-prompts/config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setNewPath(data.path || '');
        
        if (data.configured) {
          loadAgents();
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/agent-prompts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const handleSavePath = async () => {
    setConfigError('');
    
    if (!newPath.trim()) {
      setConfigError('請輸入路徑');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/agent-prompts/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ path: newPath })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setConfig({ configured: true, path: newPath });
        setShowConfig(false);
        loadAgents();
      } else {
        setConfigError(data.error || '設定失敗');
      }
    } catch (error) {
      console.error('Failed to save path:', error);
      setConfigError('設定失敗');
    }
  };

  const handleAgentClick = (agentName: string) => {
    navigate(`/agent-prompts/${agentName}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* 頁面標題 - 使用玻璃效果 */}
      <div className="glass-extreme rounded-2xl p-6 mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">Agent 提示詞庫</h1>
        <p className="text-gray-600 mt-1">瀏覽和管理 Claude Code Agent 提示詞</p>
      </div>

      {/* 設定區域 - 玻璃卡片 */}
      <div className="glass-card rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-700">
              {config.configured ? (
                <>當前路徑: <code className="bg-gray-100 px-2 py-1 rounded">{config.path}</code></>
              ) : (
                '尚未設定 Claude agents 路徑'
              )}
            </span>
          </div>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 px-4 py-2 text-sm glass-ultra rounded-xl transition-all hover:shadow-soft border border-white/40"
          >
            <Settings className="h-4 w-4" />
            <span>設定</span>
          </button>
        </div>

        {/* 設定表單 */}
        {showConfig && (
          <div className="mt-4 pt-4 border-t border-white/30">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Claude Agents 路徑
                </label>
                <input
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder="例如: C:\Users\User\.claude\agents"
                  className="w-full px-3 py-2 glass-ultra border border-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                />
                {configError && (
                  <p className="mt-1 text-sm text-red-600">{configError}</p>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSavePath}
                  className="px-4 py-2 btn-primary"
                >
                  儲存
                </button>
                <button
                  onClick={() => {
                    setShowConfig(false);
                    setNewPath(config.path || '');
                    setConfigError('');
                  }}
                  className="px-4 py-2 btn-secondary"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Agent 列表 */}
      {config.configured ? (
        agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.name}
                onClick={() => handleAgentClick(agent.name)}
                className="glass-card rounded-xl p-4 cursor-pointer hover:shadow-soft-md hover:scale-[1.02] transition-all"
              >
                <div className="flex items-start space-x-3">
                  <FileText className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {agent.fileName}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-xl p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">目錄中沒有找到 agent 檔案</p>
            <p className="text-sm text-gray-500 mt-1">請確認路徑設定正確</p>
          </div>
        )
      ) : (
        <div className="glass-ultra rounded-xl p-8 text-center">
          <FolderOpen className="h-12 w-12 text-blue-500 mx-auto mb-3" />
          <p className="text-gray-700 mb-2">請先設定 Claude agents 路徑</p>
          <p className="text-sm text-gray-600">
            通常位於 <code className="bg-white/50 px-2 py-1 rounded">~/.claude/agents</code>
          </p>
        </div>
      )}
    </div>
  );
};

export default AgentPromptsPage;