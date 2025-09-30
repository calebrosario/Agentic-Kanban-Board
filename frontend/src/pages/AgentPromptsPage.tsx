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
    <div className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="glass-card rounded-xl p-4 flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow-blue">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Agent 提示詞庫</h1>
            {agents.length > 0 && (
              <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-sm font-medium">
                總計 {agents.length}
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-2 px-4 py-2 text-sm glass-ultra rounded-xl transition-all hover:shadow-soft border border-white/40"
            >
              <Settings className="h-4 w-4" />
              <span>設定</span>
            </button>
          </div>
        </div>

        {/* 設定區域 */}
        {showConfig && (
          <div className="glass-card rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-700">
                {config.configured ? (
                  <>當前路徑: <code className="bg-gray-100 px-2 py-1 rounded">{config.path}</code></>
                ) : (
                  '尚未設定 Claude agents 路徑'
                )}
              </span>
            </div>

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

        {/* Agent 列表 */}
        {config.configured ? (
          agents.length > 0 ? (
            <div className="space-y-3">
              {agents.map((agent) => (
                <div
                  key={agent.name}
                  onClick={() => handleAgentClick(agent.name)}
                  className="glass-card hover:shadow-soft-md transition-all duration-200 cursor-pointer border-l-4 border-l-purple-300"
                >
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      {/* Agent 資訊 */}
                      <div className="flex items-center gap-3 min-w-0" style={{ width: '300px' }}>
                        <FileText className="w-4 h-4 text-purple-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {agent.name}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            📁 {agent.fileName}
                          </p>
                        </div>
                      </div>

                      {/* 描述區域 */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-400 italic">點擊查看詳細內容</span>
                      </div>

                      {/* 狀態指示 */}
                      <div className="flex items-center" style={{ width: '100px' }}>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          <span>🤖</span>
                          可用
                        </span>
                      </div>
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
    </div>
  );
};

export default AgentPromptsPage;