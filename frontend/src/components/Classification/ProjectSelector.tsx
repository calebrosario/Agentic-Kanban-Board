import React, { useState, useEffect } from 'react';
import { projectApi } from '../../services/api';
import { Project } from '../../types/classification.types';
import { MultiSelect } from '../Common/MultiSelect';
import { useI18nContext } from '../../contexts/I18nContext';
import toast from 'react-hot-toast';

interface ProjectSelectorProps {
  sessionId: string;
  selectedProjects: string[];
  onProjectsChange: (projectIds: string[]) => void;
  className?: string;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  sessionId,
  selectedProjects,
  onProjectsChange,
  className,
}) => {
  const { t } = useI18nContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load all projects
  const loadProjects = async () => {
    try {
      setLoading(true);
      const fetchedProjects = await projectApi.getAllProjects();
      setProjects(fetchedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Handle project change
  const handleProjectsChange = async (newProjectIds: string[]) => {
    try {
      setSaving(true);
      await projectApi.updateSessionProjects(sessionId, newProjectIds);
      onProjectsChange(newProjectIds);
      toast.success(t('common:classification.projects.updateSuccess'));
    } catch (error) {
      console.error('Failed to update projects:', error);
      toast.error(t('common:classification.projects.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  // 建立新專案
  const handleCreateProject = async (name: string) => {
    try {
      const newProject = await projectApi.createProject({
        name,
        color: '#' + Math.floor(Math.random()*16777215).toString(16), // 隨機顏色
        icon: '📁',
      });
      
      // 重新載入專案列表
      await loadProjects();
      
      // 自動選擇新建立的專案
      const newProjectIds = [...selectedProjects, newProject.project_id];
      await handleProjectsChange(newProjectIds);
      
      toast.success(t('common:classification.projects.createSuccess'));
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error(t('common:classification.projects.createFailed'));
      throw error;
    }
  };

  // 轉換專案為選項格式
  const options = projects.map(project => ({
    value: project.project_id,
    label: project.name,
    color: project.color,
    icon: project.icon,
  }));

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {t('common:classification.projects.label')}
      </label>
      <MultiSelect
        options={options}
        value={selectedProjects}
        onChange={handleProjectsChange}
        placeholder={`${t('common:actions.select')} ${t('common:classification.projects.label')}...`}
        disabled={saving}
        loading={loading}
        onCreateNew={handleCreateProject}
        createNewPlaceholder={`${t('common:actions.create')} ${t('common:classification.projects.label')}`}
      />
    </div>
  );
};
