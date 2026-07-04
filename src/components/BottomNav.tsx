import React from 'react';
import { LayoutDashboard, FilePlus2, ReceiptText, Settings, LogOut } from 'lucide-react';

export type NavView = 'dashboard' | 'create' | 'list' | 'settings';

interface BottomNavProps {
  currentView: NavView | 'detail' | 'edit';
  onNavigate: (view: NavView) => void;
  onLogout: () => void;
}

export default function BottomNav({ currentView, onNavigate, onLogout }: BottomNavProps) {
  // Map special detail/edit states to appropriate navigation tabs
  const getActiveTab = (): string => {
    if (currentView === 'detail' || currentView === 'edit') {
      return 'list';
    }
    return currentView;
  };

  const activeTab = getActiveTab();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'create', label: 'Buat', icon: <FilePlus2 className="w-5 h-5" /> },
    { id: 'list', label: 'Invoices', icon: <ReceiptText className="w-5 h-5" /> },
    { id: 'settings', label: 'Pengaturan', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl z-50 max-w-[480px] mx-auto flex justify-around items-center px-2 py-1.5 pb-2.5">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            id={`nav-btn-${item.id}`}
            onClick={() => onNavigate(item.id as NavView)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all duration-200 cursor-pointer ${
              isActive
                ? 'text-blue-600 font-semibold bg-blue-50/50 scale-105'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`p-1 rounded-lg transition-transform ${isActive ? 'scale-110' : ''}`}>
              {item.icon}
            </div>
            <span className="text-[10px] mt-0.5 tracking-wide">{item.label}</span>
          </button>
        );
      })}

      {/* Logout Button */}
      <button
        id="nav-btn-logout"
        onClick={onLogout}
        className="flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl text-rose-500 hover:text-rose-600 transition-all duration-200 cursor-pointer"
      >
        <div className="p-1 rounded-lg">
          <LogOut className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-wide">Keluar</span>
      </button>
    </div>
  );
}
