import React, { useState, useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { cn } from '../../utils';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MessageInput = React.memo(({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "輸入訊息..."
}: MessageInputProps) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = useCallback(async () => {
    const messageContent = inputMessage.trim();
    if (!messageContent || disabled || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(messageContent);
      setInputMessage(''); // 清空輸入框
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [inputMessage, disabled, isSending, onSendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  }, []);

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-lg">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled || isSending}
              className={cn(
                'w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-2xl resize-none',
                'border border-gray-200 dark:border-gray-700',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'disabled:bg-gray-100 disabled:text-gray-400 dark:disabled:bg-gray-800',
                'placeholder-gray-400 dark:placeholder-gray-500',
                'text-gray-900 dark:text-gray-100',
                'transition-all duration-200',
                'shadow-sm hover:shadow-md focus:shadow-md'
              )}
              rows={1}
              style={{
                minHeight: '48px',
                maxHeight: '120px',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || disabled || isSending}
            className={cn(
              'p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl',
              'hover:from-blue-600 hover:to-blue-700 hover:shadow-lg',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              'disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed disabled:shadow-none',
              'transition-all duration-200 transform hover:scale-105 active:scale-95',
              'flex items-center justify-center min-w-[48px] h-[48px]',
              'shadow-md'
            )}
            title="發送訊息 (Enter)"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

MessageInput.displayName = 'MessageInput';

export default MessageInput;