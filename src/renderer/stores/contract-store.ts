import { create } from 'zustand';

interface ContractState {
  draft: string | null;
  isLoading: boolean;
  error: string | null;
  setDraft: (draft: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useContractStore = create<ContractState>((set) => ({
  draft: null,
  isLoading: false,
  error: null,
  setDraft: (draft) => set({ draft }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
