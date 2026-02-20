import { useState, useEffect } from 'react';
import { taskTemplateApi } from '../services/api';
import { TaskTemplate, CreateTaskTemplateRequest, UpdateTaskTemplateRequest, ReorderTaskTemplatesRequest } from '../types/taskTemplate.types';
import toast from 'react-hot-toast';

export const useTaskTemplates = () => {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all templates
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await taskTemplateApi.getAllTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load task templates:', error);
      toast.error('Unable to load task templates');
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Get active templates
  const getActiveTemplates = () => templates.filter(t => t.is_active);

  // Create template
  const createTemplate = async (data: CreateTaskTemplateRequest): Promise<boolean> => {
    try {
      const created = await taskTemplateApi.createTemplate(data);
      setTemplates([...templates, created]);

      // Trigger custom event
      window.dispatchEvent(new Event('templates-updated'));

      toast.success('Task template created');
      return true;
    } catch (error) {
      console.error('Failed to create task template:', error);
      toast.error('Failed to create task template');
      return false;
    }
  };

  // Update template
  const updateTemplate = async (id: string, data: UpdateTaskTemplateRequest): Promise<boolean> => {
    try {
      const updated = await taskTemplateApi.updateTemplate(id, data);
      setTemplates(templates.map(t => t.id === id ? updated : t));

      // Trigger custom event
      window.dispatchEvent(new Event('templates-updated'));

      toast.success('Task template updated');
      return true;
    } catch (error) {
      console.error('Failed to update task template:', error);
      toast.error('Failed to update task template');
      return false;
    }
  };

  // Delete template
  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      await taskTemplateApi.deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));

      // Trigger custom event
      window.dispatchEvent(new Event('templates-updated'));

      toast.success('Task template deleted');
      return true;
    } catch (error) {
      console.error('Failed to delete task template:', error);
      toast.error('Failed to delete task template');
      return false;
    }
  };

  // Reorder templates
  const reorderTemplates = async (newOrder: TaskTemplate[]): Promise<boolean> => {
    try {
      const orders: ReorderTaskTemplatesRequest[] = newOrder.map((t, index) => ({
        id: t.id,
        sort_order: index + 1
      }));

      await taskTemplateApi.reorderTemplates(orders);
      setTemplates(newOrder);

      // Trigger custom event
      window.dispatchEvent(new Event('templates-updated'));

      return true;
    } catch (error) {
      console.error('Failed to reorder task templates:', error);
      toast.error('Failed to reorder templates');
      return false;
    }
  };

  // Reset to default
  const resetToDefault = async (): Promise<boolean> => {
    try {
      const defaultTemplates = await taskTemplateApi.resetToDefault();
      setTemplates(defaultTemplates);

      // Trigger custom event
      window.dispatchEvent(new Event('templates-updated'));

      toast.success('Reset to default templates');
      return true;
    } catch (error) {
      console.error('Failed to reset templates:', error);
      toast.error('Failed to reset templates');
      return false;
    }
  };

  // Initialize loading
  useEffect(() => {
    loadTemplates();
  }, []);

  // Listen to custom events for synchronization across tabs
  useEffect(() => {
    const handleTemplatesUpdated = () => {
      loadTemplates();
    };

    window.addEventListener('templates-updated', handleTemplatesUpdated);

    return () => {
      window.removeEventListener('templates-updated', handleTemplatesUpdated);
    };
  }, []);

  return {
    templates,
    activeTemplates: getActiveTemplates(),
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    reorderTemplates,
    resetToDefault,
    reloadTemplates: loadTemplates,
  };
};