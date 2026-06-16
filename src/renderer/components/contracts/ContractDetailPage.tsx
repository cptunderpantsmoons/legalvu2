import React, { useState, useEffect } from 'react';
import { ContractStatusBadge } from './ContractStatusBadge';
import { RichTextEditor } from './RichTextEditor';
import type { Contract, ContractStatus } from '../../../shared/types';

interface ContractDetailPageProps {
  contract: Contract;
  onBack: () => void;
}

const NEXT_TRANSITIONS: Record<ContractStatus, ContractStatus[]> = {
  draft: ['under_review'],
  under_review: ['approved', 'draft'],
  approved: ['signed', 'under_review'],
  signed: ['active'],
  active: ['expired', 'terminated'],
  expired: [],
  terminated: [],
};

export function ContractDetailPage({ contract, onBack }: ContractDetailPageProps) {
  const [content, setContent] = useState(contract.content || '');
  const [currentStatus, setCurrentStatus] = useState(contract.status);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [exporting, setExporting] = useState<'docx' | 'pdf' | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<'analyze' | 'summarize' | null>(null);

  useEffect(() => {
    const loadFresh = async () => {
      const fresh = await window.electronAPI.contractFetch(contract.id);
      if (fresh) {
        setContent(fresh.content || '');
        setCurrentStatus(fresh.status);
      }
    };
    loadFresh();
  }, [contract.id]);

  const handleSave = async () => {
    setSaving(true);
    const saved = await window.electronAPI.contractSave({ id: contract.id, content });
    setSaving(false);
    if (saved) setMessage({ type: 'success', text: 'Contract saved.' });
    else setMessage({ type: 'error', text: 'Failed to save.' });
  };

  const handleTransition = async (target: ContractStatus) => {
    const result = await window.electronAPI.contractTransition({ id: contract.id, target });
    if (result.contract) {
      setCurrentStatus(result.contract.status);
      setMessage({ type: 'success', text: `Status changed to ${target}.` });
    } else if (result.error) {
      setMessage({ type: 'error', text: result.error });
    }
  };

  const handleExportDocx = async () => {
    setExporting('docx');
    setMessage(null);
    const result = await window.electronAPI.contractExportDocx(contract.id);
    setExporting(null);
    if (result.path) setMessage({ type: 'success', text: `DOCX exported: ${result.path}` });
    else if (result.error) setMessage({ type: 'error', text: result.error });
  };

  const handleExportPdf = async () => {
    setExporting('pdf');
    setMessage(null);
    const result = await window.electronAPI.contractExportPdf(contract.id);
    setExporting(null);
    if (result.path) setMessage({ type: 'success', text: `PDF exported: ${result.path}` });
    else if (result.error) setMessage({ type: 'error', text: result.error });
  };

  const nextTransitions = NEXT_TRANSITIONS[currentStatus] || [];

  const handleAnalyze = async () => {
    setAiLoading('analyze');
    setMessage(null);
    setAnalysisResult(null);
    const result = await window.electronAPI.contractAnalyze({ contractText: content });
    setAiLoading(null);
    if (result.analysis) {
      setAnalysisResult(result.analysis);
      setMessage({ type: 'success', text: `Analysis complete (${result.tokensUsed ?? 0} tokens).` });
    } else {
      setMessage({ type: 'error', text: result.error || 'Analysis failed.' });
    }
  };

  const handleSummarize = async () => {
    setAiLoading('summarize');
    setMessage(null);
    setSummaryResult(null);
    const result = await window.electronAPI.contractSummarize({ contractText: content });
    setAiLoading(null);
    if (result.summary) {
      setSummaryResult(result.summary);
      setMessage({ type: 'success', text: `Summary complete (${result.tokensUsed ?? 0} tokens).` });
    } else {
      setMessage({ type: 'error', text: result.error || 'Summarization failed.' });
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <button onClick={onBack} className="text-sm text-blue-600 hover:underline mb-4">
        ← Back to Contracts
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{contract.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <ContractStatusBadge status={currentStatus} />
            <span className="text-sm text-gray-500">
              {contract.counterparty} · {contract.jurisdiction}
            </span>
          </div>
        </div>
      </div>

      {nextTransitions.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-700 mb-2">Advance lifecycle:</p>
          <div className="flex gap-2">
            {nextTransitions.map((target) => (
              <button
                key={target}
                onClick={() => handleTransition(target)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                → {target.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleExportDocx}
          disabled={exporting !== null}
          className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 text-sm"
        >
          {exporting === 'docx' ? 'Exporting...' : 'Export DOCX'}
        </button>
        <button
          onClick={handleExportPdf}
          disabled={exporting !== null}
          className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 text-sm"
        >
          {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
        </button>
        <button
          onClick={handleAnalyze}
          disabled={aiLoading !== null}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm"
        >
          {aiLoading === 'analyze' ? 'Analyzing...' : '🔍 Analyze'}
        </button>
        <button
          onClick={handleSummarize}
          disabled={aiLoading !== null}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-sm"
        >
          {aiLoading === 'summarize' ? 'Summarizing...' : '📝 Summarize'}
        </button>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded mb-4 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <RichTextEditor content={content} onChange={setContent} />

      {analysisResult && (
        <div className="mt-6 bg-purple-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-purple-800">🔍 Contract Analysis</h3>
            <button onClick={() => setAnalysisResult(null)} className="text-xs text-purple-400 hover:text-purple-600">Dismiss</button>
          </div>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-gray-700">{analysisResult}</div>
        </div>
      )}

      {summaryResult && (
        <div className="mt-6 bg-indigo-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-indigo-800">📝 Contract Summary</h3>
            <button onClick={() => setSummaryResult(null)} className="text-xs text-indigo-400 hover:text-indigo-600">Dismiss</button>
          </div>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-gray-700">{summaryResult}</div>
        </div>
      )}

      {contract.aiModel && (
        <div className="mt-6 text-xs text-gray-400">
          AI Model: {contract.aiModel} · Prompt version: {contract.aiPromptVersion}
          {contract.aiTokensUsed ? ` · Tokens: ${contract.aiTokensUsed}` : ''}
        </div>
      )}
    </div>
  );
}
