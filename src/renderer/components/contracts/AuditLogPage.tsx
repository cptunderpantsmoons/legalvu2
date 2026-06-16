import React, { useState, useEffect } from 'react';

interface AuditEntry {
  id: number;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  createdAt: number;
}

const ACTION_COLORS: Record<string, string> = {
  'contract:create': 'text-blue-600',
  'contract:save': 'text-gray-600',
  'contract:transition': 'text-indigo-600',
  'auth:login': 'text-green-600',
  'auth:register': 'text-green-600',
  'auth:logout': 'text-gray-500',
  'sp:login': 'text-purple-600',
  'sp:download': 'text-cyan-600',
  'sp:upload': 'text-teal-600',
  'sync:conflict': 'text-red-600',
  'sync:completed': 'text-green-600',
};

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAudit();
  }, []);

  const loadAudit = async () => {
    setLoading(true);
    const filter = filterType ? { entityType: filterType } : undefined;
    const list = await window.electronAPI.auditQuery(filter);
    setEntries(list as AuditEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAudit();
  }, [filterType]);

  const entityTypes = ['', 'contract', 'document', 'user', 'sharepoint_connection', 'template'];

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Audit Trail</h1>
      <p className="text-gray-500 mb-6">Immutable log of all actions — AI usage, document changes, sync events</p>

      <div className="flex gap-3 mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {entityTypes.map((t) => (
            <option key={t} value={t}>{t || 'All Types'}</option>
          ))}
        </select>
        <button onClick={loadAudit} className="text-sm text-blue-600 hover:underline">
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-400">No audit entries yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Action</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Entity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Details</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-600">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm">
                    <span className={`font-medium ${ACTION_COLORS[entry.action] || 'text-gray-700'}`}>
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">
                    {entry.entityType}
                    {entry.entityId && <span className="text-gray-400 ml-1">({entry.entityId.slice(0, 8)})</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 max-w-xs truncate">
                    {entry.details || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
