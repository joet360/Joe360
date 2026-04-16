import React from 'react';
import { Home, CheckSquare, Receipt, MessageSquare, Calculator, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav = ({ activeTab, setActiveTab }: BottomNavProps) => {
  const tabs = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'expenses', icon: Receipt, label: 'Expenses' },
    { id: 'tools', icon: Calculator, label: 'Tools' },
    { id: 'chat', icon: MessageSquare, label: 'AI Chat' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 flex justify-between items-center z-50 max-w-md mx-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};
