import { useState, useEffect } from 'react';
import { commonPathApi, CommonPath } from '../services/api';
import toast from 'react-hot-toast';

export type { CommonPath };

export const useSettings = () => {
  const [commonPaths, setCommonPaths] = useState<CommonPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const paths = await commonPathApi.getAllPaths();
      setCommonPaths(paths);
    } catch (error) {
      console.error('Failed to load common paths:', error);
      toast.error('Unable to load common paths');
      // Use empty array as fallback
      setCommonPaths([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Save settings (batch update)
  const saveSettings = async (newPaths: CommonPath[]): Promise<boolean> => {
    try {
      // Use reorder API if it's a reorder operation
      const reorderData = newPaths.map((path, index) => ({
        id: path.id,
        sort_order: index + 1
      }));

      await commonPathApi.reorderPaths(reorderData);
      setCommonPaths(newPaths);

      // Trigger custom event to notify other components
      window.dispatchEvent(new Event('settings-updated'));

      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
      return false;
    }
  };

  // Reset to default settings
  const resetToDefault = async (): Promise<boolean> => {
    try {
      const paths = await commonPathApi.resetToDefault();
      setCommonPaths(paths);

      // Trigger custom event to notify other components
      window.dispatchEvent(new Event('settings-updated'));

      toast.success('Reset to default settings');
      return true;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      toast.error('Failed to reset settings');
      return false;
    }
  };

  // Add common path
  const addCommonPath = async (path: Omit<CommonPath, 'id'>): Promise<boolean> => {
    try {
      const created = await commonPathApi.createPath({
        label: path.label,
        path: path.path,
        icon: path.icon,
        sort_order: commonPaths.length + 1
      });

      setCommonPaths([...commonPaths, created]);

      // Trigger custom event
      window.dispatchEvent(new Event('settings-updated'));

      toast.success('Common path added');
      return true;
    } catch (error) {
      console.error('Failed to add common path:', error);
      toast.error('Failed to add common path');
      return false;
    }
  };

  // Update common path
  const updateCommonPath = async (id: string, updates: Partial<CommonPath>): Promise<boolean> => {
    try {
      const updated = await commonPathApi.updatePath(id, updates);

      setCommonPaths(commonPaths.map(path =>
        path.id === id ? updated : path
      ));

      // Trigger custom event
      window.dispatchEvent(new Event('settings-updated'));

      toast.success('Common path updated');
      return true;
    } catch (error) {
      console.error('Failed to update common path:', error);
      toast.error('Failed to update common path');
      return false;
    }
  };

  // Delete common path
  const deleteCommonPath = async (id: string): Promise<boolean> => {
    try {
      await commonPathApi.deletePath(id);

      setCommonPaths(commonPaths.filter(path => path.id !== id));

      // Trigger custom event
      window.dispatchEvent(new Event('settings-updated'));

      toast.success('Common path deleted');
      return true;
    } catch (error) {
      console.error('Failed to delete common path:', error);
      toast.error('Failed to delete common path');
      return false;
    }
  };

  // Get settings info
  const getSettingsInfo = () => {
    return {
      hasCustomSettings: commonPaths.length > 0,
      lastUpdated: null, // Can get the latest updated_at from commonPaths
      pathCount: commonPaths.length,
    };
  };

  // Initialize loading
  useEffect(() => {
    loadSettings();
  }, []);

  // Listen to custom events for synchronization within same tag pages
  useEffect(() => {
    const handleCustomStorageChange = () => {
      loadSettings();
    };

    window.addEventListener('settings-updated', handleCustomStorageChange);

    return () => {
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