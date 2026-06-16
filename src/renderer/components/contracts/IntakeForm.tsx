import React, { useState } from 'react';
import type { ContractPromptInput, AIProvider } from '../../../shared/types';

interface IntakeFormProps {
  onSubmit: (input: ContractPromptInput, provider: AIProvider, model: string) => void;
  loading: boolean;
}

const CONTRACT_TYPES = [
  'NDA (Non-Disclosure Agreement)',
  'MSA (Master Services Agreement)',
  'SOW (Statement of Work)',
  'Employment Agreement',
  'SaaS Agreement',
  'Privacy Policy',
  'Data Processing Agreement',
  'Licensing Agreement',
  'Independent Contractor Agreement',
  'Other',
];

const DEFAULT_INPUT: ContractPromptInput = {
  contractType: CONTRACT_TYPES[0],
  counterparty: '',
  jurisdiction: '',
  governingLaw: '',
  keyTerms: [''],
  indemnity: true,
  confidentiality: true,
};

export function IntakeForm({ onSubmit, loading }: IntakeFormProps) {
  const [input, setInput] = useState<ContractPromptInput>(DEFAULT_INPUT);
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [model, setModel] = useState('gpt-4');

  const update = (patch: Partial<ContractPromptInput>) => setInput({ ...input, ...patch });

  const updateTerm = (index: number, value: string) => {
    const terms = [...input.keyTerms];
    terms[index] = value;
    update({ keyTerms: terms });
  };

  const addTerm = () => update({ keyTerms: [...input.keyTerms, ''] });
  const removeTerm = (index: number) => update({ keyTerms: input.keyTerms.filter((_, i) => i !== index) });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTerms = input.keyTerms.filter((t) => t.trim());
    onSubmit({ ...input, keyTerms: cleanTerms }, provider, model);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
          <select
            value={input.contractType}
            onChange={(e) => update({ contractType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CONTRACT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Counterparty</label>
          <input
            type="text"
            value={input.counterparty}
            onChange={(e) => update({ counterparty: e.target.value })}
            required
            placeholder="e.g. Acme Corporation"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction</label>
          <input
            type="text"
            value={input.jurisdiction}
            onChange={(e) => update({ jurisdiction: e.target.value })}
            required
            placeholder="e.g. New South Wales, Australia"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Governing Law</label>
          <input
            type="text"
            value={input.governingLaw}
            onChange={(e) => update({ governingLaw: e.target.value })}
            required
            placeholder="e.g. Australia"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Key Terms</label>
        {input.keyTerms.map((term, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="text"
              value={term}
              onChange={(e) => updateTerm(i, e.target.value)}
              placeholder={`Term ${i + 1}`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {input.keyTerms.length > 1 && (
              <button type="button" onClick={() => removeTerm(i)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded">
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addTerm} className="text-sm text-blue-600 hover:underline">
          + Add term
        </button>
      </div>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={input.indemnity}
            onChange={(e) => update({ indemnity: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Include indemnity clause</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={input.confidentiality}
            onChange={(e) => update({ confidentiality: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Include confidentiality clause</span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AI Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProvider)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate Contract'}
      </button>
    </form>
  );
}
