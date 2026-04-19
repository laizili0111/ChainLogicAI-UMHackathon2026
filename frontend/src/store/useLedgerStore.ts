import { create } from 'zustand';

export type TabKey = 'Yesterday' | 'Today' | 'Tomorrow';

export interface LedgerCell {
  id: string;
  timestamp: number;
  completedAt: number | null;
  noteText: string;
  generatedPlan: any | null;
  isCollapsed: boolean;
  activeContexts: string[];
  customContextText: string;
  executedOptionId: string | null;
}

export interface DayState {
  cells: LedgerCell[];
  activeContexts: string[];
  customContextText: string;
}

interface LedgerState {
  universalTruth: string;
  hasInitializedErp: boolean;
  activeTab: TabKey;
  days: Record<TabKey, DayState>;
  setUniversalTruth: (truth: string) => void;
  setHasInitializedErp: (val: boolean) => void;
  setActiveTab: (tab: TabKey) => void;
  addContext: (tab: TabKey, contextId: string) => void;
  removeContext: (tab: TabKey, contextId: string) => void;
  setCustomContextText: (tab: TabKey, text: string) => void;

  // Cell Mutators
  addCell: (tab: TabKey, cell: LedgerCell) => void;
  updateCellPlan: (tab: TabKey, cellId: string, plan: any) => void;
  toggleCellCollapse: (tab: TabKey, cellId: string) => void;
  executeCellAction: (tab: TabKey, cellId: string, optionId: string) => void;
}

const defaultDayState: DayState = { cells: [], activeContexts: [], customContextText: "" };

export const useLedgerStore = create<LedgerState>((set) => ({
  universalTruth: "",
  hasInitializedErp: false,
  activeTab: 'Today',
  days: {
    'Yesterday': { ...defaultDayState, cells: [] },
    'Today': { ...defaultDayState, cells: [] },
    'Tomorrow': { ...defaultDayState, cells: [] }
  },
  setUniversalTruth: (truth) => set({ universalTruth: truth }),
  setHasInitializedErp: (val) => set({ hasInitializedErp: val }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  addCell: (tab, cell) => set((state) => ({
    days: { ...state.days, [tab]: { 
        ...state.days[tab], 
        cells: [...state.days[tab].cells, cell],
        // Reset context and custom text for the next cell
        activeContexts: [],
        customContextText: ""
    } }
  })),

  updateCellPlan: (tab, cellId, plan) => set((state) => ({
    days: {
      ...state.days,
      [tab]: {
        ...state.days[tab],
        cells: state.days[tab].cells.map(c => 
          c.id === cellId ? { ...c, generatedPlan: plan, completedAt: Date.now(), isCollapsed: false } : c
        )
      }
    }
  })),

  toggleCellCollapse: (tab, cellId) => set((state) => ({
    days: {
      ...state.days,
      [tab]: {
        ...state.days[tab],
        cells: state.days[tab].cells.map(c => 
          c.id === cellId ? { ...c, isCollapsed: !c.isCollapsed } : c
        )
      }
    }
  })),

  executeCellAction: (tab, cellId, optionId) => set((state) => ({
    days: {
      ...state.days,
      [tab]: {
        ...state.days[tab],
        cells: state.days[tab].cells.map(c => 
          c.id === cellId ? { ...c, executedOptionId: optionId } : c
        )
      }
    }
  })),

  addContext: (tab, contextId) => set((state) => {
    if (state.days[tab].activeContexts.includes(contextId)) return state;
    return {
      days: { ...state.days, [tab]: { ...state.days[tab], activeContexts: [...state.days[tab].activeContexts, contextId] } }
    };
  }),

  removeContext: (tab, contextId) => set((state) => ({
    days: { ...state.days, [tab]: { ...state.days[tab], activeContexts: state.days[tab].activeContexts.filter(id => id !== contextId) } }
  })),

  setCustomContextText: (tab, text) => set((state) => ({
    days: { ...state.days, [tab]: { ...state.days[tab], customContextText: text } }
  }))
}));
