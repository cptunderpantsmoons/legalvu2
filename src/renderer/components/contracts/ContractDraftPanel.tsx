import React, { useState, useCallback } from 'react';
import { IntakeForm } from './IntakeForm';
import { AiStreamViewer } from './AiStreamViewer';
import { RichTextEditor } from './RichTextEditor';
import { useAiStream } from '../../hooks/useAiStream';
import { useContractStore } from '../../stores/contract-store';
import type { Contract, ContractPromptInput, AIProvider } from '../../../shared/types';

interface ContractDraftPanelProps {
  onSaved: (contract: Contract) => void;
}

export function ContractDraftPanel({ onSaved }: ContractDraftPanelProps) {
  const { startStream, cancelStream } = useAiStream();
  const store = useContractStore();
  const [phase, setPhase] = useState<'intake' | 'streaming' | 'editing'>('intake');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleGenerate = useCallback(
    async (input: ContractPromptInput, provider: AIProvider, model: string) => {
      setPhase('streaming');
      const result = await startStream({ provider, model, input });
      if (!result.error && result.contract) {
        setEditContent(result.contract.content || store.streamingContent);
        setPhase('editing');
      } else if (result.error) {
        setPhase('intake');
      }
    },
    [startStream, store.streamingContent],
  );

  const handleCancel = async () => {
    await cancelStream();
    setPhase('intake');
  };

  const handleSave = async () => {
    if (!store.selected) return;
    setSaving(true);
    const saved = await window.electronAPI.contractSave({ id: store.selected.id, content: editContent });
    setSaving(false);
    if (saved) onSaved(saved);
  };

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">New Contract</h1>

      {phase === 'intake' && (
        <div className="bg-white rounded-lg shadow p-6">
          <IntakeForm onSubmit={handleGenerate} loading={false} />
        </div>
      )}

      {phase === 'streaming' && (
        <div className="space-y-4">
          <AiStreamViewer content={store.streamingContent} active={store.streamingActive} />
          {store.streamingActive && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Cancel
            </button>
          )}
          {store.error && (
            <div className="px-4 py-3 bg-red-50 text-red-700 rounded">{store.error}</div>
          )}
        </div>
      )}

      {phase === 'editing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-700">Edit Contract</h2>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Contract'}
            </button>
          </div>
          <RichTextEditor content={editContent} onChange={setEditContent} />
        </div>
      )}
    </div>
  );
}
