import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useI18nContext } from '../../contexts/I18nContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props & { t: (key: string) => string }, State> {
  constructor(props: Props & { t: (key: string) => string }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { t } = this.props;

    if (this.state.hasError) {
      // 如果提供了自定義 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默認錯誤頁面
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="mb-4">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t('common:error.boundary.title')}
              </h2>
              <p className="text-gray-600 mb-4">
                {t('common:error.boundary.description')}
              </p>
            </div>

            {/* 錯誤詳情（開發環境Show） */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
                <h3 className="text-sm font-medium text-red-800 mb-1">{t('common:error.boundary.details')}</h3>
                <pre className="text-xs text-red-700 overflow-auto">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-800 cursor-pointer">
                      {t('common:error.boundary.stackTrace')}
                    </summary>
                    <pre className="text-xs text-red-700 mt-1 overflow-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col space-y-2">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('common:actions.retry')}</span>
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center space-x-2 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>{t('common:error.boundary.goHome')}</span>
              </button>
            </div>

            {/* 聯繫支援資訊 */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {t('common:error.boundary.support')}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to provide translation function
export const ErrorBoundary: React.FC<Props> = ({ children, fallback }) => {
  const { t } = useI18nContext();
  return <ErrorBoundaryClass t={t} fallback={fallback}>{children}</ErrorBoundaryClass>;
};

// Hook 版本的錯誤邊界，使用函數式組件模擬
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const { t } = useI18nContext();
  
  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-[400px] bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {t('common:error.boundary.loadingFailed')}
        </h3>
        <p className="text-gray-600 mb-4">
          {error.message || t('common:error.unknown')}
        </p>
        
        <div className="flex flex-col space-y-2">
          <button
            onClick={resetError}
            className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('common:actions.retry')}</span>
          </button>
          
          <button
            onClick={handleGoHome}
            className="flex items-center justify-center space-x-2 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>{t('common:error.boundary.goHome')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
