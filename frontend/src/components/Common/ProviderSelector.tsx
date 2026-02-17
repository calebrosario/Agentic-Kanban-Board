import React from 'react';
import { ToolType } from '../../types/session.types';
import { Cpu, Terminal, Bot, Zap } from 'lucide-react';

interface ProviderSelectorProps {
  value?: ToolType;
  onChange: (provider: ToolType) => void;
  disabled?: boolean;
}

interface ProviderOption {
  value: ToolType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const providerOptions: ProviderOption[] = [
  {
    value: ToolType.CLAUDE,
    label: 'Claude Code',
    description: 'Anthropic Claude Code CLI - Mature, full-featured with file operations',
    icon: <Cpu className="w-4 h-4" />,
    color: 'text-purple-600',
  },
  {
    value: ToolType.OPENCODE,
    label: 'OpenCode',
    description: 'OpenCode SDK with oh-my-opencode - Event-driven, plugin system',
    icon: <Terminal className="w-4 h-4" />,
    color: 'text-blue-600',
  },
  {
    value: ToolType.CURSOR,
    label: 'Cursor IDE',
    description: 'Cursor MCP Integration - Model Context Protocol support',
    icon: <Zap className="w-4 h-4" />,
    color: 'text-green-600',
  },
  {
    value: ToolType.KILOCODE,
    label: 'KiloCode',
    description: 'KiloCode CLI - JSON streaming, multiple execution modes',
    icon: <Bot className="w-4 h-4" />,
    color: 'text-orange-600',
  },
];

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  value = ToolType.CLAUDE,
  onChange,
  disabled = false,
}) => {
  const selectedProvider = providerOptions.find(opt => opt.value === value) || providerOptions[0];

  return (
    <div className="space-y-2">
      <label htmlFor="provider" className="block text-sm font-medium text-gray-700">
        AI Tool Provider
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {providerOptions.map((option) => {
          const isSelected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !disabled && onChange(option.value)}
              disabled={disabled}
              className={`
                relative flex items-start gap-3 p-4 rounded-lg border-2 transition-all duration-200
                ${isSelected
                  ? `${option.color.replace('text-', 'border-')} ${option.color.replace('text-', 'bg-')}/10 bg-opacity-10`
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className={`flex-shrink-0 ${isSelected ? option.color : 'text-gray-400'}`}>
                {option.icon}
              </div>

              <div className="flex-1 text-left">
                <div className={`font-semibold text-sm ${isSelected ? option.color : 'text-gray-900'}`}>
                  {option.label}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {option.description}
                </div>
              </div>

              {isSelected && (
                <div className={`absolute top-3 right-3 ${option.color}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="text-xs text-gray-500 mt-2">
        <span className="font-medium">Selected:</span> {selectedProvider.label} - {selectedProvider.description}
      </div>
    </div>
  );
};
