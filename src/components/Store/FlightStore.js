"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const checkoutTimerKey = (flightId) => `flight_checkout_expires_at_${flightId}`;

const clearCheckoutTimer = (flightId) => {
  if (!flightId || typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(checkoutTimerKey(flightId));
  } catch (_) {
    /* ignore */
  }
};

export const useFlightStore = create(
  persist(
    (set, get) => ({
      selectedFlight: {},

      // ✅ Set flight — fresh checkout timer for a new selection
      setSelectedFlight: (data) => {
        clearCheckoutTimer(data?.id);
        set({ selectedFlight: data });
      },
      // ✅ Clear data if needed
      clearFlightData: () => {
        clearCheckoutTimer(get().selectedFlight?.id);
        set({ selectedFlight: {} });
      },
    }),
    {
      name: "flight-storage", // storage key name
      getStorage: () => localStorage, // persist in localStorage
    }
  )
);
