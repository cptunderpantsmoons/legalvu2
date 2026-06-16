import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { ContractsListPage } from '../contracts/ContractsListPage';
import { ContractDraftPanel } from '../contracts/ContractDraftPanel';
import { ContractDetailPage } from '../contracts/ContractDetailPage';
import { TemplatesPage } from '../contracts/TemplatesPage';
import { AuditLogPage } from '../contracts/AuditLogPage';
import { AnalyticsDashboard } from '../dashboard/AnalyticsDashboard';
import { SettingsPage } from '../settings/SettingsPage';
import { SharePointPage } from '../contracts/SharePointPage';
import type { Contract } from '../../../shared/types';

type NavView = 'contracts' | 'new' | 'templates' | 'audit' | 'analytics' | 'settings' | 'sharepoint' | 'detail';

interface AppShellProps {
  userEmail: string;
  onLogout: () => void;
}

export function AppShell({ userEmail, onLogout }: AppShellProps) {
  const [view, setView] = useState<NavView>('contracts');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const handleNavigate = (nav: 'contracts' | 'new' | 'templates' | 'audit' | 'analytics' | 'settings' | 'sharepoint') => {
    setView(nav);
    setSelectedContract(null);
  };

  const handleSelectContract = (contract: Contract) => {
    setSelectedContract(contract);
    setView('detail');
  };

  const handleBackToList = () => {
    setView('contracts');
    setSelectedContract(null);
  };

  const sidebarActive = view === 'detail' ? 'contracts' : view;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar
        active={sidebarActive as 'contracts' | 'new' | 'templates' | 'audit' | 'analytics' | 'settings' | 'sharepoint'}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        userEmail={userEmail}
      />
      <main className="flex-1 overflow-auto">
        {view === 'contracts' && <ContractsListPage onSelect={handleSelectContract} />}
        {view === 'new' && <ContractDraftPanel onSaved={handleSelectContract} />}
        {view === 'detail' && selectedContract && (
          <ContractDetailPage contract={selectedContract} onBack={handleBackToList} />
        )}
        {view === 'templates' && <TemplatesPage onSelectContract={(id, title) => {
          setSelectedContract({ id, title, status: 'draft', createdBy: '', createdAt: Date.now(), updatedAt: Date.now() } as Contract);
          setView('detail');
        }} />}
        {view === 'audit' && <AuditLogPage />}
        {view === 'analytics' && <AnalyticsDashboard />}
        {view === 'settings' && <SettingsPage />}
        {view === 'sharepoint' && <SharePointPage />}
      </main>
    </div>
  );
}
