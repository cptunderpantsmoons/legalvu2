import React, { useState } from 'react';
import { ContractStatusChart } from './ContractStatusChart';
import { AiUsageChart } from './AiUsageChart';
import { SyncHealthPanel } from './SyncHealthPanel';
import { AuditTimeline } from './AuditTimeline';
import { TemplateUsageChart } from './TemplateUsageChart';

export function AnalyticsDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Analytics Dashboard</h1>
          <p className="text-gray-500 text-sm">Local analytics — no data leaves your machine</p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Contract Status</h2>
          <div key={`status-${refreshKey}`}>
            <ContractStatusChart />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">AI Usage by Model</h2>
          <div key={`ai-${refreshKey}`}>
            <AiUsageChart />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">SharePoint Sync Health</h2>
          <div key={`sync-${refreshKey}`}>
            <SyncHealthPanel />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Template Usage</h2>
          <div key={`template-${refreshKey}`}>
            <TemplateUsageChart />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5 col-span-2">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Audit Activity (Last 30 Days)</h2>
          <div key={`audit-${refreshKey}`}>
            <AuditTimeline />
          </div>
        </div>
      </div>
    </div>
  );
}
