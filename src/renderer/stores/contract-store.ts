import { create } from 'zustand';
import type { Contract, ContractStatus, ContractPromptInput } from '../../shared/types';

interface ContractState {
  list: Contract[];
  selected: Contract | null;
  streamingContent: string;
  streamingActive: boolean;
  error: string | null;
  isLoading: boolean;

  setList: (list: Contract[]) => void;
  setSelected: (contract: Contract | null) => void;
  appendStreamChunk: (chunk: string) => void;
  setStreamingContent: (content: string) => void;
  setStreamingActive: (active: boolean) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useContractStore = create<ContractState>((set) => ({
  list: [],
  selected: null,
  streamingContent: '',
  streamingActive: false,
  error: null,
  isLoading: false,

  setList: (list) => set({ list }),
  setSelected: (selected) => set({ selected }),
  appendStreamChunk: (chunk) => set((s) => ({ streamingContent: s.streamingContent + chunk })),
  setStreamingContent: (streamingContent) => set({ streamingContent }),
  setStreamingActive: (streamingActive) => set({ streamingActive }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ streamingContent: '', streamingActive: false, error: null, selected: null }),
}));

export type { Contract, ContractStatus, ContractPromptInput };
