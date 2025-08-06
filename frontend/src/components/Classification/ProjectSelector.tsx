import React, { useState, useEffect } from 'react';
import { projectApi } from '../../services/api';
import { Project } from '../../types/classification.types';
import { MultiSelect } from '../Common/MultiSelect';
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 載入所有專案
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const allProjects = await projectApi.getActiveProjects();
      setProjects(allProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('載入專案失敗');
    } finally {
      setLoading(false);
    }
  };

  // 處理專案變更
  const handleProjectsChange = async (newProjectIds: string[]) => {
    try {
      setSaving(true);
      await projectApi.updateSessionProjects(sessionId, newProjectIds);
      onProjectsChange(newProjectIds);
      toast.success('專案已更新');
    } catch (error) {
      console.error('Failed to update projects:', error);
      toast.error('更新專案失敗');
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
      
      toast.success('專案已建立');
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('建立專案失敗');
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
        專案
      </label>
      <MultiSelect
        options={options}
        value={selectedProjects}
        onChange={handleProjectsChange}
        placeholder="選擇專案..."
        disabled={saving}
        loading={loading}
        onCreateNew={handleCreateProject}
        createNewPlaceholder="建立新專案"
      />
    </div>
  );
};