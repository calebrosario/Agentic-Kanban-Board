import { useState, useEffect } from 'react';

export interface CommonPath {
  id: string;
  label: string;
  path: string;
  icon: 'FolderOpen' | 'Code' | 'Home';
}

interface Settings {
  commonPaths: CommonPath[];
  lastUpdated?: string;
}

const STORAGE_KEY = 'claude-code-board-settings';

const defaultPaths: CommonPath[] = [
  { id: '1', icon: 'Code', label: 'Projects', path: 'C:\\Users\\Projects' },
  { id: '2', icon: 'Code', label: 'Example', path: 'C:\\Users\\Example' },
  { id: '3', icon: 'Home', label: 'Desktop', path: 'C:\\Users\\User\\Desktop' },
  { id: '4', icon: 'Home', label: 'Documents', path: 'C:\\Users\\User\\Documents' },
  { id: '5', icon: 'FolderOpen', label: '當前目錄', path: '.' },
];

export const useSettings = () => {
  const [commonPaths, setCommonPaths] = useState<CommonPath[]>(defaultPaths);
  const [isLoading, setIsLoading] = useState(true);

  // 載入設定
  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const settings: Settings = JSON.parse(savedSettings);
        if (settings.commonPaths && Array.isArray(settings.commonPaths)) {
          setCommonPaths(settings.commonPaths);
        }
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
      // 使用預設設定
      setCommonPaths(defaultPaths);
    } finally {
      setIsLoading(false);
    }
  };

  // 儲存設定
  const saveSettings = (newPaths: CommonPath[]) => {
    try {
      const settings: Settings = {
        commonPaths: newPaths,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setCommonPaths(newPaths);
      
      // 觸發自定義事件以通知同一標籤頁內的其他元件
      window.dispatchEvent(new Event('settings-updated'));
      
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  };

  // 重置為預設設定
  const resetToDefault = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setCommonPaths(defaultPaths);
      
      // 觸發自定義事件以通知同一標籤頁內的其他元件
      window.dispatchEvent(new Event('settings-updated'));
      
      return true;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      return false;
    }
  };

  // 新增常用路徑
  const addCommonPath = (path: Omit<CommonPath, 'id'>) => {
    const newPath: CommonPath = {
      ...path,
      id: Date.now().toString(),
    };
    const newPaths = [...commonPaths, newPath];
    return saveSettings(newPaths);
  };

  // 更新常用路徑
  const updateCommonPath = (id: string, updates: Partial<CommonPath>) => {
    const newPaths = commonPaths.map(path => 
      path.id === id ? { ...path, ...updates } : path
    );
    return saveSettings(newPaths);
  };

  // 刪除常用路徑
  const deleteCommonPath = (id: string) => {
    const newPaths = commonPaths.filter(path => path.id !== id);
    return saveSettings(newPaths);
  };

  // 取得設定資訊
  const getSettingsInfo = () => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const settings: Settings = JSON.parse(savedSettings);
        return {
          hasCustomSettings: true,
          lastUpdated: settings.lastUpdated,
          pathCount: settings.commonPaths?.length || 0,
        };
      }
      return {
        hasCustomSettings: false,
        lastUpdated: null,
        pathCount: defaultPaths.length,
      };
    } catch (error) {
      return {
        hasCustomSettings: false,
        lastUpdated: null,
        pathCount: defaultPaths.length,
      };
    }
  };

  // 初始化載入
  useEffect(() => {
    loadSettings();
  }, []);

  // 監聽 storage 事件以同步跨元件的更新
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const settings: Settings = JSON.parse(e.newValue);
          if (settings.commonPaths && Array.isArray(settings.commonPaths)) {
            setCommonPaths(settings.commonPaths);
          }
        } catch (error) {
          console.error('Failed to sync settings from storage event:', error);
        }
      }
    };

    // 監聽 storage 事件
    window.addEventListener('storage', handleStorageChange);
    
    // 也監聽自定義事件，用於同一標籤頁內的同步
    const handleCustomStorageChange = () => {
      loadSettings();
    };
    window.addEventListener('settings-updated', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settings-updated', handleCustomStorageChange);
    };
  }, []);

  return {
    commonPaths,
    isLoading,
    saveSettings,
    resetToDefault,
    addCommonPath,
    updateCommonPath,
    deleteCommonPath,
    getSettingsInfo,
    reloadSettings: loadSettings,
  };
};