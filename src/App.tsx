import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { MobileContainer } from './components/layout/MobileContainer';
import { BottomNav } from './components/layout/BottomNav';
import { DashboardView } from './views/Dashboard';
import { TasksView } from './views/Tasks';
import { ExpensesView } from './views/Expenses';
import { AIChatView } from './views/AIChat';
import { ToolsView } from './views/Tools';
import { SettingsView } from './views/Settings';
import { AuthView } from './views/Auth';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-muted-foreground" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <MobileContainer>
        <AuthView />
      </MobileContainer>
    );
  }

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'tasks': return <TasksView />;
      case 'expenses': return <ExpensesView />;
      case 'chat': return <AIChatView />;
      case 'tools': return <ToolsView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <MobileContainer>
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderView()}
      </div>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <Toaster position="top-center" />
    </MobileContainer>
  );
};

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="life-admin-theme">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
