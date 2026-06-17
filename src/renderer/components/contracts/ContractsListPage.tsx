import React, { useState, useEffect } from 'react';
import { ContractStatusBadge } from './ContractStatusBadge';
import type { Contract } from '../../../shared/types';

interface ContractsListPageProps {
  onSelect: (contract: Contract) => void;
}

export function ContractsListPage({ onSelect }: ContractsListPageProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [importTitle, setImportTitle] = useState('');
  const [importContent, setImportContent] = useState('');
  const [importCounterparty, setImportCounterparty] = useState('');
  const [importJurisdiction, setImportJurisdiction] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    const list = await window.electronAPI.contractList();
    setContracts(list);
    setLoading(false);
  };

  const handleImport = async () => {
    if (!importTitle.trim() || !importContent.trim()) {
      setImportError('Title and content are required.');
      return;
    }
    setImporting(true);
    setImportError(null);
    const result = await window.electronAPI.contractImport({
      title: importTitle,
      content: importContent,
      counterparty: importCounterparty || undefined,
      jurisdiction: importJurisdiction || undefined,
    });
    setImporting(false);
    if (result.ok) {
      setShowImport(false);
      setImportTitle('');
      setImportContent('');
      setImportCounterparty('');
      setImportJurisdiction('');
      loadContracts();
    } else {
      setImportError(result.error || 'Import failed.');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Contracts</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImport(!showImport)}
            className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {showImport ? 'Cancel' : '📎 Import Contract'}
          </button>
          <button onClick={loadContracts} className="text-sm text-blue-600 hover:underline">
            Refresh
          </button>
        </div>
      </div>

      {showImport && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Import Existing Contract</h2>
          <p className="text-sm text-gray-500 mb-4">Paste the contract text below. It will be tracked through the lifecycle starting at "Draft".</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                <input
                  type="text"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  placeholder="e.g. Master Services Agreement - Acme Corp"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Counterparty</label>
                <input
                  type="text"
                  value={importCounterparty}
                  onChange={(e) => setImportCounterparty(e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Jurisdiction</label>
              <input
                type="text"
                value={importJurisdiction}
                onChange={(e) => setImportJurisdiction(e.target.value)}
                placeholder="e.g. New South Wales, Australia"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contract Text *</label>
              <textarea
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                placeholder="Paste the full contract text here..."
                rows={10}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            {importError && <p className="text-sm text-red-600">{importError}</p>}
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              {importing ? 'Importing...' : 'Import & Track'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : contracts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-400 mb-4">No contracts yet</p>
          <p className="text-sm text-gray-500">Use "New Contract" for AI drafting or "Import Contract" to add existing agreements.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Counterparty</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Source</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map((contract) => {
                const isImported = contract.aiPromptVersion === 'imported';
                const isTemplate = contract.aiPromptVersion === 'template-based';
                return (
                  <tr
                    key={contract.id}
                    onClick={() => onSelect(contract)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm text-gray-800">{contract.title}</td>
                    <td className="px-4 py-3"><ContractStatusBadge status={contract.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{contract.counterparty || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isImported ? 'bg-indigo-100 text-indigo-700' :
                        isTemplate ? 'bg-gray-100 text-gray-600' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {isImported ? '📎 Imported' : isTemplate ? '📄 Template' : '✨ AI'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(contract.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
