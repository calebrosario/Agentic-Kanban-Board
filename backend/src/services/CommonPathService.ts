import { CommonPathRepository, CommonPath } from '../repositories/CommonPathRepository';

export class CommonPathService {
  private repository: CommonPathRepository;

  constructor() {
    this.repository = new CommonPathRepository();
  }

  async getAllPaths(): Promise<CommonPath[]> {
    return await this.repository.getAll();
  }

  async getPath(id: string): Promise<CommonPath> {
    const path = await this.repository.getById(id);
    if (!path) {
      throw new Error('Common path not found');
    }
    return path;
  }

  async createPath(data: {
    label: string;
    path: string;
    icon: 'FolderOpen' | 'Code' | 'Home';
    sort_order?: number;
  }): Promise<CommonPath> {
    // Validate input
    if (!data.label || !data.path || !data.icon) {
      throw new Error('Missing required fields');
    }
    
    if (!['FolderOpen', 'Code', 'Home'].includes(data.icon)) {
      throw new Error('Invalid icon type');
    }
    
    return await this.repository.create(data);
  }

  async updatePath(id: string, data: {
    label?: string;
    path?: string;
    icon?: 'FolderOpen' | 'Code' | 'Home';
    sort_order?: number;
  }): Promise<CommonPath> {
    // Validate icon if provided
    if (data.icon && !['FolderOpen', 'Code', 'Home'].includes(data.icon)) {
      throw new Error('Invalid icon type');
    }
    
    return await this.repository.update(id, data);
  }

  async deletePath(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async reorderPaths(paths: { id: string; sort_order: number }[]): Promise<void> {
    // Validate input
    if (!Array.isArray(paths)) {
      throw new Error('Invalid input: paths must be an array');
    }
    
    for (const path of paths) {
      if (!path.id || typeof path.sort_order !== 'number') {
        throw new Error('Invalid path data');
      }
    }
    
    await this.repository.reorder(paths);
  }

  async resetToDefault(): Promise<CommonPath[]> {
    return await this.repository.resetToDefault();
  }
}