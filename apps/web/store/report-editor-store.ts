import { create } from "zustand";
import { ReportBlock, WorkspaceReport } from "@/types/workspace-report-types";

interface ReportEditorState {
  report: WorkspaceReport | null;
  blocks: ReportBlock[];
  selectedBlockId: string | null;
  isDirty: boolean;
  isSaving: boolean;
  zoom: number; // 50, 75, 100, 125
  history: ReportBlock[][];
  historyIndex: number;

  // Actions
  setReport: (report: WorkspaceReport) => void;
  setBlocks: (blocks: ReportBlock[]) => void;
  selectBlock: (id: string | null) => void;
  updateBlockLocal: (blockId: string, partial: Partial<ReportBlock>) => void;
  addBlockLocal: (block: ReportBlock) => void;
  removeBlockLocal: (blockId: string) => void;
  reorderBlocksLocal: (newBlocks: ReportBlock[]) => void;
  setZoom: (zoom: number) => void;
  setIsSaving: (isSaving: boolean) => void;
  markSaved: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const MAX_HISTORY = 50;

export const useReportEditorStore = create<ReportEditorState>((set, get) => ({
  report: null,
  blocks: [],
  selectedBlockId: null,
  isDirty: false,
  isSaving: false,
  zoom: 100,
  history: [],
  historyIndex: -1,

  setReport: (report) => {
    set({ report, blocks: report.blocks || [] });
  },

  setBlocks: (blocks) => {
    set({
      blocks,
      history: [blocks],
      historyIndex: 0,
      isDirty: false,
    });
  },

  selectBlock: (id) => {
    set({ selectedBlockId: id });
  },

  updateBlockLocal: (blockId, partial) => {
    const { blocks, history, historyIndex } = get();
    const updated = blocks.map((b) => (b.id === blockId ? { ...b, ...partial } : b));
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(updated);
    if (newHistory.length > MAX_HISTORY) newHistory.shift();

    set({
      blocks: updated,
      isDirty: true,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  addBlockLocal: (block) => {
    const { blocks, history, historyIndex } = get();
    const updated = [...blocks, block];
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(updated);
    if (newHistory.length > MAX_HISTORY) newHistory.shift();

    set({
      blocks: updated,
      selectedBlockId: block.id,
      isDirty: true,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  removeBlockLocal: (blockId) => {
    const { blocks, selectedBlockId, history, historyIndex } = get();
    const updated = blocks.filter((b) => b.id !== blockId);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(updated);
    if (newHistory.length > MAX_HISTORY) newHistory.shift();

    set({
      blocks: updated,
      selectedBlockId: selectedBlockId === blockId ? null : selectedBlockId,
      isDirty: true,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  reorderBlocksLocal: (newBlocks) => {
    const { history, historyIndex } = get();
    const indexed = newBlocks.map((b, idx) => ({ ...b, position: idx }));
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(indexed);
    if (newHistory.length > MAX_HISTORY) newHistory.shift();

    set({
      blocks: indexed,
      isDirty: true,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  setZoom: (zoom) => {
    set({ zoom });
  },

  setIsSaving: (isSaving) => {
    set({ isSaving });
  },

  markSaved: () => {
    set({ isDirty: false, isSaving: false });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      set({
        blocks: prev,
        historyIndex: historyIndex - 1,
        isDirty: true,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      set({
        blocks: next,
        historyIndex: historyIndex + 1,
        isDirty: true,
      });
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
}));
