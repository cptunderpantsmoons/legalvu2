import React from 'react';

type NavView = 'contracts' | 'new' | 'templates' | 'audit' | 'analytics' | 'settings' | 'sharepoint';

interface SidebarProps {
  active: NavView;
  onNavigate: (view: NavView) => void;
  onLogout: () => void;
  userEmail: string;
}

export function Sidebar({ active, onNavigate, onLogout, userEmail }: SidebarProps) {
  const items: { key: NavView; label: string; icon: string }[] = [
    { key: 'contracts', label: 'Contracts', icon: '📋' },
    { key: 'new', label: 'New Contract', icon: '✨' },
    { key: 'templates', label: 'Templates', icon: '📄' },
    { key: 'audit', label: 'Audit Trail', icon: '🔍' },
    { key: 'analytics', label: 'Dashboard', icon: '📊' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
    { key: 'sharepoint', label: 'SharePoint', icon: '📁' },
  ];

  return (
    <aside className="w-60 bg-slate-800 text-white flex flex-col min-h-screen">
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-lg font-bold">Legal Workspace</h1>
        <p className="text-xs text-slate-400">AI Contract Management</p>
      </div>

      <nav className="flex-1 py-2">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
              active === item.key ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <span>{item.icon}</span>
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <p className="text-xs text-slate-400 mb-2 truncate">{userEmail}</p>
        <button
          onClick={onLogout}
          className="w-full text-sm px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
