"use client";

import { create } from "zustand";
import { requestCatalogs } from "@/services/catalogs/catalog-service";
import {
  DatabaseDriver,
  DestinationType,
  FileFormat,
  LaravelDriverCode,
} from "@/types/catalog-type";

interface CatalogState {
  drivers: DatabaseDriver[];
  formats: FileFormat[];
  destinations: DestinationType[];
  isLoading: boolean;
  loaded: boolean;
  fetchCatalogs: () => Promise<void>;
  getDriverByCode: (code: LaravelDriverCode) => DatabaseDriver | undefined;
  getDriverById: (id: number) => DatabaseDriver | undefined;
  getFormatByCode: (code: string) => FileFormat | undefined;
  getFormatById: (id: number) => FileFormat | undefined;
  getDestinationByCode: (code: string) => DestinationType | undefined;
  getDestinationById: (id: number) => DestinationType | undefined;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  drivers: [],
  formats: [],
  destinations: [],
  isLoading: false,
  loaded: false,

  fetchCatalogs: async () => {
    if (get().loaded || get().isLoading) return;
    set({ isLoading: true });
    try {
      const data = await requestCatalogs();
      set({
        drivers: Array.isArray(data?.drivers) ? data.drivers : [],
        formats: Array.isArray(data?.formats) ? data.formats : [],
        destinations: Array.isArray(data?.destinations) ? data.destinations : [],
        loaded: true,
      });
    } catch (err) {
      console.error("Error fetching catalogs:", err);
      set({
        drivers: get().drivers ?? [],
        formats: get().formats ?? [],
        destinations: get().destinations ?? [],
      });
    } finally {
      set({ isLoading: false });
    }
  },

  getDriverByCode: (code) =>
    (get().drivers ?? []).find((d) => d?.attributes?.laravel_driver === code),

  getDriverById: (id) => (get().drivers ?? []).find((d) => d?.id === id),

  getFormatByCode: (code) =>
    (get().formats ?? []).find((f) => f?.attributes?.code === code),

  getFormatById: (id) => (get().formats ?? []).find((f) => f?.id === id),

  getDestinationByCode: (code) =>
    (get().destinations ?? []).find((d) => d?.attributes?.code === code),

  getDestinationById: (id) => (get().destinations ?? []).find((d) => d?.id === id),
}));
