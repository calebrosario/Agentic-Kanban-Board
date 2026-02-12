import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout/Layout';
import { SplitView } from './components/Layout/SplitView';
import { CreateSessionModal } from './components/Session/CreateSessionModal';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { useWebSocket } from './hooks/useWebSocket';
import { useNotifications } from './hooks/useNotifications';
import { SessionsProvider } from './contexts/SessionsContext';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { LoginPage } from './components/Auth/LoginPage';
import { WorkflowStages } from './pages/WorkflowStages';
import { WorkItemListPage } from './pages/WorkItemListPage';
import { WorkItemDetailPage } from './pages/WorkItemDetailPage';
import { AgentPromptsPage } from './pages/AgentPromptsPage';
import { AgentPromptDetailPage } from './pages/AgentPromptDetailPage';
import { GlassDemo } from './pages/GlassDemo';
import { I18nProvider } from './contexts/I18nContext';
import { useI18nContext } from './contexts/I18nContext';

function App() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { isConnected, connectionError } = useWebSocket();
  const { t } = useI18nContext();
  
  // Enable global notification system
  useNotifications();
  
  return (
    <ErrorBoundary>
      <Router>
        <I18nProvider>
          <AuthProvider>
            <div className="min-h-screen bg-gray-50 relative">
              <Routes>
                {/* Login page */}
                <Route path="/login" element={<LoginPage />} />
                
                {/* Protected routes */}
                <Route path="/*" element={
                  <ProtectedRoute>
                    <SessionsProvider>
                      {/* WebSocket connection status - fixed at top */}
                      {!isConnected && (
                        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b border-yellow-400 p-4">
                          <div className="flex items-center justify-center">
                            <div className="flex-shrink-0">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-yellow-700">
                                {connectionError ? t('session.websocket.connectionError', { error: connectionError.message }) : t('session.websocket.connecting')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <Layout onCreateSession={() => setIsCreateModalOpen(true)}>
                        <ErrorBoundary>
                          <Routes>
                            <Route path="/" element={<SplitView onCreateSession={() => setIsCreateModalOpen(true)} />} />
                            <Route path="/sessions/:sessionId" element={<SplitView onCreateSession={() => setIsCreateModalOpen(true)} />} />
                            <Route path="/workflow-stages" element={<WorkflowStages />} />
                            <Route path="/work-items" element={<WorkItemListPage />} />
                            <Route path="/work-items/:id" element={<WorkItemDetailPage />} />
                            <Route path="/agent-prompts" element={<AgentPromptsPage />} />
                            <Route path="/agent-prompts/:name" element={<AgentPromptDetailPage />} />
                            <Route path="/glass-demo" element={<GlassDemo />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        </ErrorBoundary>
                      </Layout>
                    </SessionsProvider>
                  </ProtectedRoute>
                } />
              </Routes>
              
              {/* Toast notifications */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                }}
              />
            </div>
          </AuthProvider>
        </I18nProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;