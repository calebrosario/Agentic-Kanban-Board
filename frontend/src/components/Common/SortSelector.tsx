import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SortOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SortSelectorProps {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const SortSelector: React.FC<SortSelectorProps> = ({
  options,
  value,
  onChange,
  className = ''
}) => {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
};