"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useTransferStore = create(
  persist(
    (set, get) => ({
      selectedtransfer: {},

      // ✅ Set transfer 
      setSelectedTransfer: (data) => set({ selectedtransfer: data }),
      // ✅ Clear data if needed
      clearTransferData: () => set({ selectedtransfer: {} }),
    }),
    {
      name: "transfer-storage", // storage key name
      getStorage: () => localStorage, // persist in localStorage
    }
  )
); 
