import React, { useState, useEffect } from 'react';

interface TemplateListItem {
  id: string;
  name: string;
  description?: string;
  contractType?: string;
  isDefault: boolean;
}

interface TemplateDetail {
  id: string;
  name: string;
  variables: string[];
  content: string;
}

export function TemplatesPage({ onSelectContract }: { onSelectContract?: (contractId: string, title: string) => void }) {
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [selected, setSelected] = useState<TemplateDetail | null>(null);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const list = await window.electronAPI.templateList();
    setTemplates(list);
  };

  const handleSelect = async (id: string) => {
    const detail = await window.electronAPI.templateGet(id);
    if (detail) {
      setSelected(detail);
      const initial: Record<string, string> = {};
      detail.variables.forEach((v) => { initial[v] = ''; });
      setVarValues(initial);
    }
  };

  const handleGenerate = async () => {
    if (!selected) return;
    setLoading(true);
    const emptyVars = Object.entries(varValues).filter(([, v]) => !v.trim()).map(([k]) => k);
    if (emptyVars.length > 0) {
      setMessage({ type: 'error', text: `Please fill: ${emptyVars.join(', ')}` });
      setLoading(false);
      return;
    }

    const result = await window.electronAPI.templateGenerate({
      templateId: selected.id,
      variables: varValues,
      title: `${selected.name} - ${varValues[Object.keys(varValues)[0]] || 'Untitled'}`,
    });
    setLoading(false);

    if (result.ok) {
      setMessage({ type: 'success', text: `Contract created: ${result.data.contract.title}` });
      onSelectContract?.(result.data.contract.id, result.data.contract.title);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to generate.' });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await window.electronAPI.templateDelete(id);
    if (result.ok) {
      loadTemplates();
      setSelected(null);
    } else {
      setMessage({ type: 'error', text: result.error || 'Cannot delete.' });
    }
  };

  if (selected) {
    return (
      <div className="p-8 max-w-3xl">
        <button onClick={() => setSelected(null)} className="text-sm text-blue-600 hover:underline mb-4">
          ← Back to Templates
        </button>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">{selected.name}</h1>
        <p className="text-gray-500 mb-6">Fill in the variables to generate a contract from this template.</p>

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Variables ({selected.variables.length})</h2>
          <div className="grid grid-cols-2 gap-3">
            {selected.variables.map((v) => (
              <div key={v}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {v.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                </label>
                <input
                  type="text"
                  value={varValues[v] || ''}
                  onChange={(e) => setVarValues({ ...varValues, [v]: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div className={`px-4 py-3 rounded mb-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.text}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Contract from Template'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Templates</h1>
      <p className="text-gray-500 mb-6">Generate contracts from pre-built templates — no AI needed</p>

      <div className="grid grid-cols-2 gap-4">
        {templates.map((tmpl) => (
          <div key={tmpl.id} className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700">{tmpl.name}</h3>
              {tmpl.isDefault && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Default</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3">{tmpl.description || 'No description'}</p>
            {tmpl.contractType && (
              <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded mb-3">{tmpl.contractType}</span>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => handleSelect(tmpl.id)}
                className="text-sm text-blue-600 hover:underline"
              >
                Use Template
              </button>
              {!tmpl.isDefault && (
                <button
                  onClick={() => handleDelete(tmpl.id)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {message && (
        <div className={`px-4 py-3 rounded mt-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
