import { create } from "zustand";

export type ModalActionType = "create" | "update" | "delete" | null;

interface ModalActionState {
  name: string;
  action: ModalActionType;
  data?: unknown;
  open: boolean;
  openModal: (action: ModalActionType, name: string, data?: unknown) => void;
  closeModal: () => void;
}

export const useModalActionStore = create<ModalActionState>((set) => ({
  action: null,
  data: undefined,
  open: false,
  name: "default",

  error: () => set({ action: null, data: undefined, open: false }),
  openModal: (action, name, data) => {
    set({ action, data, open: true, name });
  },
  closeModal: () =>
    set({ action: null, data: undefined, open: false, name: "default" }),
}));
