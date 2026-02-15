import React, { useState, useEffect } from 'react';
import { tagApi } from '../../services/api';
import { Tag } from '../../types/classification.types';
import { MultiSelect } from '../Common/MultiSelect';
import { useI18nContext } from '../../contexts/I18nContext';
import toast from 'react-hot-toast';

interface TagSelectorProps {
  sessionId: string;
  selectedTags: string[];
  onTagsChange: (tagIds: string[]) => void;
  tagType?: 'general' | 'topic' | 'department';
  className?: string;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  sessionId,
  selectedTags,
  onTagsChange,
  tagType = 'general',
  className,
}) => {
  const { t } = useI18nContext();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load tags
  useEffect(() => {
    loadTags();
  }, [tagType]);

  // Handle tag change
  const handleTagsChange = async (newTagIds: string[]) => {
    try {
      setSaving(true);
      await tagApi.updateSessionTags(sessionId, newTagIds);
      onTagsChange(newTagIds);
      toast.success(t('common:classification.tags.updateSuccess'));
    } catch (error) {
      console.error('Failed to update tags:', error);
      toast.error(t('common:classification.tags.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  // 建立新標籤
  const handleCreateTag = async (name: string) => {
    try {
      const newTag = await tagApi.createTag({
        name,
        type: tagType,
        color: '#' + Math.floor(Math.random()*16777215).toString(16), // 隨機顏色
      });
      
      // 重新載入標籤列表
      await loadTags();
      
      // 自動選擇新建立的標籤
      const newTagIds = [...selectedTags, newTag.tag_id];
      await handleTagsChange(newTagIds);
      
      toast.success(t('common:classification.tags.createSuccess'));
    } catch (error) {
      console.error('Failed to create tag:', error);
      toast.error(t('common:classification.tags.createFailed'));
      throw error;
    }
  };

  // 轉換標籤為選項格式
  const options = tags.map(tag => ({
    value: tag.tag_id,
    label: tag.name,
    color: tag.color,
  }));

  // 根據標籤類型顯示不同的標題
  const getLabel = () => {
    switch (tagType) {
      case 'topic':
        return t('common:classification.tags.topic');
      case 'department':
        return t('common:classification.tags.department');
      default:
        return t('common:classification.tags.label');
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {getLabel()}
      </label>
      <MultiSelect
        options={options}
        value={selectedTags}
        onChange={handleTagsChange}
        placeholder={`${t('common:actions.select')} ${getLabel()}...`}
        disabled={saving}
        loading={loading}
        onCreateNew={handleCreateTag}
        createNewPlaceholder={`${t('common:actions.create')} ${getLabel()}`}
      />
    </div>
  );
};
