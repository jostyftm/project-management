import { create } from "zustand";
import {
  DocumentBlock,
  DocumentColumn,
  DocumentItem,
  DocumentRow,
  DocumentSchema,
  PageSettings,
  TextBlock,
  ImageBlock,
  ChartBlock,
  TableBlock,
} from "@/types/document-type";

export type RowLayoutType =
  | "1col"
  | "2col-equal"
  | "2col-70-30"
  | "3col"
  | "4col";

const defaultPageSettings: PageSettings = {
  size: "a4",
  orientation: "portrait",
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  header: { enabled: false, text: "", alignment: "right" },
  footer: { enabled: true, showPageNumber: true, text: "" },
};

const createColumnsForLayout = (layout: RowLayoutType): DocumentColumn[] => {
  switch (layout) {
    case "2col-equal":
      return [
        { id: `col-${Date.now()}-1`, widthPercent: 50, blocks: [] },
        { id: `col-${Date.now()}-2`, widthPercent: 50, blocks: [] },
      ];
    case "2col-70-30":
      return [
        { id: `col-${Date.now()}-1`, widthPercent: 70, blocks: [] },
        { id: `col-${Date.now()}-2`, widthPercent: 30, blocks: [] },
      ];
    case "3col":
      return [
        { id: `col-${Date.now()}-1`, widthPercent: 33.33, blocks: [] },
        { id: `col-${Date.now()}-2`, widthPercent: 33.33, blocks: [] },
        { id: `col-${Date.now()}-3`, widthPercent: 33.34, blocks: [] },
      ];
    case "4col":
      return [
        { id: `col-${Date.now()}-1`, widthPercent: 25, blocks: [] },
        { id: `col-${Date.now()}-2`, widthPercent: 25, blocks: [] },
        { id: `col-${Date.now()}-3`, widthPercent: 25, blocks: [] },
        { id: `col-${Date.now()}-4`, widthPercent: 25, blocks: [] },
      ];
    case "1col":
    default:
      return [{ id: `col-${Date.now()}-1`, widthPercent: 100, blocks: [] }];
  }
};

const createDefaultBlock = (
  type: DocumentBlock["type"],
  customData?: Partial<DocumentBlock>
): DocumentBlock => {
  const id = `block-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  switch (type) {
    case "text":
      return {
        id,
        type: "text",
        tag: "p",
        content: "Escribe tu texto aquí...",
        styles: {
          bold: false,
          italic: false,
          underline: false,
          align: "left",
          color: "#1e293b",
        },
        ...(customData as Partial<TextBlock>),
      };
    case "image":
      return {
        id,
        type: "image",
        url: "https://placehold.co/600x300/e2e8f0/475569?text=Imagen+del+Documento",
        widthPercent: 100,
        align: "center",
        caption: "",
        ...(customData as Partial<ImageBlock>),
      };
    case "chart":
      return {
        id,
        type: "chart",
        chartType: "bar",
        title: "Gráfica de Rendimiento",
        dataSource: "manual",
        data: [
          { label: "Ene", value: 400 },
          { label: "Feb", value: 650 },
          { label: "Mar", value: 890 },
          { label: "Abr", value: 720 },
        ],
        ...(customData as Partial<ChartBlock>),
      };
    case "table":
      return {
        id,
        type: "table",
        dataSource: "manual",
        headers: ["Columna 1", "Columna 2", "Columna 3"],
        rows: [
          ["Dato 1A", "Dato 1B", "100"],
          ["Dato 2A", "Dato 2B", "250"],
          ["Dato 3A", "Dato 3B", "400"],
        ],
        striped: true,
        bordered: true,
        ...(customData as Partial<TableBlock>),
      };
    case "divider":
      return { id, type: "divider" };
    case "page_break":
      return { id, type: "page_break" };
    default:
      return {
        id,
        type: "text",
        tag: "p",
        content: "",
      };
  }
};

export interface HistorySnapshot {
  rows: DocumentRow[];
  pageSettings: PageSettings;
  name: string;
}

interface DocStudioState {
  id: number | null;
  name: string;
  description: string;
  categoryId: number | null;
  pageSettings: PageSettings;
  rows: DocumentRow[];
  selectedBlockId: string | null;
  selectedRowId: string | null;
  isPreviewMode: boolean;
  isDirty: boolean;
  isSaving: boolean;

  // Zoom
  zoom: number;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  // History (Undo / Redo)
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  canUndo: boolean;
  canRedo: boolean;
  takeSnapshot: () => void;
  undo: () => void;
  redo: () => void;

  // Actions
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setCategoryId: (categoryId: number | null) => void;
  setPageSettings: (settings: Partial<PageSettings>) => void;
  setRows: (rows: DocumentRow[]) => void;
  addRow: (layout?: RowLayoutType, atIndex?: number) => string;
  deleteRow: (rowId: string) => void;
  moveRow: (rowId: string, direction: "up" | "down") => void;
  setRowColumns: (rowId: string, layout: RowLayoutType) => void;
  addBlock: (
    rowId: string,
    columnId: string,
    type: DocumentBlock["type"],
    customData?: Partial<DocumentBlock>
  ) => string;
  updateBlock: (blockId: string, patch: Partial<DocumentBlock>) => void;
  deleteBlock: (blockId: string) => void;
  moveBlock: (blockId: string, direction: "up" | "down") => void;
  setSelectedBlockId: (id: string | null) => void;
  setSelectedRowId: (id: string | null) => void;
  setIsPreviewMode: (preview: boolean) => void;
  setIsDirty: (dirty: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  loadDocument: (doc: DocumentItem | DocumentSchema) => void;
  reset: () => void;
  getSchema: () => DocumentSchema;
}

export const useDocStudioStore = create<DocStudioState>((set, get) => ({
  id: null,
  name: "Documento sin título",
  description: "",
  categoryId: null,
  pageSettings: defaultPageSettings,
  rows: [
    {
      id: "row-default-1",
      columns: [
        {
          id: "col-default-1",
          widthPercent: 100,
          blocks: [
            {
              id: "b-default-title",
              type: "text",
              tag: "h1",
              content: "Título del Documento",
              styles: {
                bold: true,
                align: "center",
                color: "#0f172a",
              },
            },
            {
              id: "b-default-desc",
              type: "text",
              tag: "p",
              content:
                "Escribe aquí la introducción o descripción general de este documento corporativo.",
              styles: {
                align: "center",
                color: "#64748b",
              },
            },
          ],
        },
      ],
    },
  ],
  selectedBlockId: null,
  selectedRowId: null,
  isPreviewMode: false,
  isDirty: false,
  isSaving: false,

  // Zoom
  zoom: 100,
  setZoom: (zoom) => set({ zoom: Math.min(200, Math.max(50, Math.round(zoom))) }),
  zoomIn: () => set((state) => ({ zoom: Math.min(200, state.zoom + 10) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(50, state.zoom - 10) })),
  resetZoom: () => set({ zoom: 100 }),

  // History (Undo / Redo)
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
  takeSnapshot: () => {
    const s = get();
    const snapshot: HistorySnapshot = {
      rows: JSON.parse(JSON.stringify(s.rows)),
      pageSettings: { ...s.pageSettings },
      name: s.name,
    };
    const past = [...s.past, snapshot].slice(-30);
    set({ past, future: [], canUndo: true, canRedo: false });
  },
  undo: () => {
    const s = get();
    if (s.past.length === 0) return;
    const newPast = [...s.past];
    const previous = newPast.pop()!;
    const currentSnapshot: HistorySnapshot = {
      rows: JSON.parse(JSON.stringify(s.rows)),
      pageSettings: { ...s.pageSettings },
      name: s.name,
    };
    const newFuture = [currentSnapshot, ...s.future].slice(0, 30);
    set({
      rows: previous.rows,
      pageSettings: previous.pageSettings,
      name: previous.name,
      past: newPast,
      future: newFuture,
      canUndo: newPast.length > 0,
      canRedo: true,
      isDirty: true,
    });
  },
  redo: () => {
    const s = get();
    if (s.future.length === 0) return;
    const newFuture = [...s.future];
    const next = newFuture.shift()!;
    const currentSnapshot: HistorySnapshot = {
      rows: JSON.parse(JSON.stringify(s.rows)),
      pageSettings: { ...s.pageSettings },
      name: s.name,
    };
    const newPast = [...s.past, currentSnapshot].slice(-30);
    set({
      rows: next.rows,
      pageSettings: next.pageSettings,
      name: next.name,
      past: newPast,
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
      isDirty: true,
    });
  },

  setName: (name) => set({ name, isDirty: true }),
  setDescription: (description) => set({ description, isDirty: true }),
  setCategoryId: (categoryId) => set({ categoryId, isDirty: true }),
  setPageSettings: (settings) => {
    get().takeSnapshot();
    set((state) => ({
      pageSettings: { ...state.pageSettings, ...settings },
      isDirty: true,
    }));
  },
  setRows: (rows) => {
    get().takeSnapshot();
    set({ rows, isDirty: true });
  },

  addRow: (layout = "1col", atIndex) => {
    get().takeSnapshot();
    const newRowId = `row-${Date.now()}`;
    const newRow: DocumentRow = {
      id: newRowId,
      columns: createColumnsForLayout(layout),
    };

    set((state) => {
      const rows = [...state.rows];
      if (typeof atIndex === "number" && atIndex >= 0) {
        rows.splice(atIndex, 0, newRow);
      } else {
        rows.push(newRow);
      }
      return { rows, selectedRowId: newRowId, isDirty: true };
    });

    return newRowId;
  },

  deleteRow: (rowId) => {
    get().takeSnapshot();
    set((state) => ({
      rows: state.rows.filter((r) => r.id !== rowId),
      selectedRowId: state.selectedRowId === rowId ? null : state.selectedRowId,
      isDirty: true,
    }));
  },

  moveRow: (rowId, direction) => {
    get().takeSnapshot();
    set((state) => {
      const index = state.rows.findIndex((r) => r.id === rowId);
      if (index < 0) return state;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= state.rows.length) return state;

      const rows = [...state.rows];
      const [moved] = rows.splice(index, 1);
      rows.splice(targetIndex, 0, moved);
      return { rows, isDirty: true };
    });
  },

  setRowColumns: (rowId, layout) => {
    get().takeSnapshot();
    set((state) => {
      const rows = state.rows.map((row) => {
        if (row.id !== rowId) return row;
        // Keep existing blocks if possible, distributed into new columns
        const allBlocks = row.columns.flatMap((c) => c.blocks);
        const newCols = createColumnsForLayout(layout);
        if (newCols.length > 0 && allBlocks.length > 0) {
          newCols[0].blocks = allBlocks;
        }
        return { ...row, columns: newCols };
      });
      return { rows, isDirty: true };
    });
  },

  addBlock: (rowId, columnId, type, customData) => {
    get().takeSnapshot();
    const block = createDefaultBlock(type, customData);
    set((state) => {
      const rows = state.rows.map((row) => {
        if (row.id !== rowId) return row;
        const columns = row.columns.map((col) => {
          if (col.id !== columnId) return col;
          return {
            ...col,
            blocks: [...col.blocks, block],
          };
        });
        return { ...row, columns };
      });
      return { rows, selectedBlockId: block.id, isDirty: true };
    });
    return block.id;
  },

  updateBlock: (blockId, patch) => {
    get().takeSnapshot();
    set((state) => {
      let updated = false;
      const rows = state.rows.map((row) => ({
        ...row,
        columns: row.columns.map((col) => ({
          ...col,
          blocks: col.blocks.map((b) => {
            if (b.id === blockId) {
              updated = true;
              return { ...b, ...patch } as DocumentBlock;
            }
            return b;
          }),
        })),
      }));
      return updated ? { rows, isDirty: true } : state;
    });
  },

  deleteBlock: (blockId) => {
    get().takeSnapshot();
    set((state) => ({
      rows: state.rows.map((row) => ({
        ...row,
        columns: row.columns.map((col) => ({
          ...col,
          blocks: col.blocks.filter((b) => b.id !== blockId),
        })),
      })),
      selectedBlockId:
        state.selectedBlockId === blockId ? null : state.selectedBlockId,
      isDirty: true,
    }));
  },

  moveBlock: (blockId, direction) => {
    get().takeSnapshot();
    set((state) => {
      const rows = state.rows.map((row) => ({
        ...row,
        columns: row.columns.map((col) => {
          const idx = col.blocks.findIndex((b) => b.id === blockId);
          if (idx < 0) return col;
          const target = direction === "up" ? idx - 1 : idx + 1;
          if (target < 0 || target >= col.blocks.length) return col;

          const blocks = [...col.blocks];
          const [moved] = blocks.splice(idx, 1);
          blocks.splice(target, 0, moved);
          return { ...col, blocks };
        }),
      }));
      return { rows, isDirty: true };
    });
  },

  setSelectedBlockId: (id) => set({ selectedBlockId: id }),
  setSelectedRowId: (id) => set({ selectedRowId: id }),
  setIsPreviewMode: (preview) => set({ isPreviewMode: preview }),
  setIsDirty: (dirty) => set({ isDirty: dirty }),
  setIsSaving: (saving) => set({ isSaving: saving }),

  loadDocument: (doc) => {
    // Normalizar si viene como DocumentItem (JSON:API attributes) o DocumentSchema
    const attr = (doc as DocumentItem).attributes || (doc as DocumentSchema);
    const content = attr.content ?? { rows: [] };
    const rows = Array.isArray(content)
      ? content
      : content.rows ?? [];

    set({
      id: doc.id ? Number(doc.id) : null,
      name: attr.name || "Documento sin título",
      description: attr.description || "",
      categoryId: attr.category_id || null,
      pageSettings: attr.page_settings || defaultPageSettings,
      rows: rows.length > 0 ? rows : [],
      selectedBlockId: null,
      selectedRowId: null,
      isDirty: false,
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      zoom: 100,
    });
  },

  reset: () =>
    set({
      id: null,
      name: "Documento sin título",
      description: "",
      categoryId: null,
      pageSettings: defaultPageSettings,
      rows: [
        {
          id: `row-${Date.now()}`,
          columns: [{ id: `col-${Date.now()}`, widthPercent: 100, blocks: [] }],
        },
      ],
      selectedBlockId: null,
      selectedRowId: null,
      isPreviewMode: false,
      isDirty: false,
      isSaving: false,
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      zoom: 100,
    }),

  getSchema: () => {
    const s = get();
    return {
      ...(s.id ? { id: s.id } : {}),
      name: s.name,
      description: s.description,
      category_id: s.categoryId,
      page_settings: s.pageSettings,
      content: {
        rows: s.rows,
      },
    };
  },
}));
