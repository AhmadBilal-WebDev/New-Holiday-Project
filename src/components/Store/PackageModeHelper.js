"use client";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useHolidayPackageStore,
  isFlightTransferOnlyPackage,
} from "./HolidayPackageStore";
import { notifications } from "@mantine/notifications";
import { useCurrency } from "@/util/currency";
/**
 * Hook to handle package mode in existing listing pages
 * Non-invasive - easily add to any existing page
 */
export function usePackageMode() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { rates } = useCurrency();
  const {
    isActive,
    isServiceSelected,
    setHotelData,
    setFlightData,
    setPackageInfo,
    setTransferData,
    updateHotelRoom,
    updateFlight,
    updateTransfer,
    recalculatePackageInfoPricing,
    prepareFlightForPackage,
    prepareTransferForPackage,
    createOrUpdatePackageCart,
    createFlightTransferCart,
    selectedData,
  } = useHolidayPackageStore();

  const getCheckoutUrl = () => {
    const packageId = selectedData?.packageInfo?.package_id;
    return packageId
      ? `/holiday-packages/checkout?package_id=${encodeURIComponent(packageId)}`
      : "/holiday-packages/checkout";
  };

  const isPackageMode = searchParams.get("packageMode") === "true";
  const isEditMode = searchParams.get("edit") === "true";

  useEffect(() => {
    // If package mode but no active package, redirect home
    if (isPackageMode && !isActive) {
      notifications.show({
        title: "No Active Package",
        message: "Please start a new package search",
        color: "orange",
      });
      router.push("/");
    }
  }, [isPackageMode, isActive, router]);

  const syncPackageCart = async () => createOrUpdatePackageCart(rates);

  /**
   * Handle hotel room selection in package mode
   */
  const handleHotelSelection = async (hotelData, selectedRoom, message) => {
    if (isEditMode) {
      updateHotelRoom(selectedRoom);
      recalculatePackageInfoPricing(rates);
      if (message) {
        try {
          await syncPackageCart();
          notifications.show({
            title: "Room Updated",
            message: "Package updated with new room selection",
            color: "green",
          });
          router.push(getCheckoutUrl());
        } catch (err) {
          console.error("Package cart update error:", err);
          notifications.show({
            title: "Cart Error",
            message: err?.message || "Failed to update package cart. Please try again.",
            color: "red",
          });
        }
      }
    } else {
      const nextRoute = setHotelData(hotelData, selectedRoom);
      // Only recalc when user proceeds (not on initial package card select)
      if (message) {
        recalculatePackageInfoPricing(rates);
        try {
          await syncPackageCart();
        } catch (err) {
          console.error("Package cart update error:", err);
          notifications.show({
            title: "Cart Error",
            message: err?.message || "Failed to update package cart. Please try again.",
            color: "red",
          });
          return;
        }
        notifications.show({
          title: "Room Added",
          message: "Proceeding to next service...",
          color: "green",
        });
        router.push(nextRoute);
      }
    }
  };
  /**
     * Handle package meta from listing card
     */
  const handlePackageData = (data, message) => {
    const nextRoute = setPackageInfo(data);
    // notifications.show({
    //   title: "Flight Added",
    //   message: "Proceeding to next service...",
    //   color: "green",
    // });
    // router.push(nextRoute);
  };
  /**
   * Handle flight selection in package mode
   */
  const handleFlightSelection = async (flightData, message) => {
    // User picked a flight from search — convert pricing into package currency
    const flightForPackage = message
      ? prepareFlightForPackage(flightData, rates)
      : flightData;

    if (isEditMode) {
      updateFlight(flightForPackage);
      recalculatePackageInfoPricing(rates);
      if (message) {
        try {
          await syncPackageCart();
          notifications.show({
            title: "Flight Updated",
            message: "Package updated with new flight",
            color: "green",
          });
          router.push(getCheckoutUrl());
        } catch (err) {
          console.error("Package cart update error:", err);
          notifications.show({
            title: "Cart Error",
            message: err?.message || "Failed to update package cart. Please try again.",
            color: "red",
          });
        }
      }
    } else {
      const nextRoute = setFlightData(flightForPackage);
      if (message) {
        recalculatePackageInfoPricing(rates);
        try {
          await syncPackageCart();
        } catch (err) {
          console.error("Package cart update error:", err);
          notifications.show({
            title: "Cart Error",
            message: err?.message || "Failed to update package cart. Please try again.",
            color: "red",
          });
          return;
        }
        notifications.show({
          title: "Flight Added",
          message: "Proceeding to next service...",
          color: "green",
        });
        router.push(nextRoute);
      }
    }
  };

  /**
   * Handle transfer selection in package mode
   */
  const handleTransferSelection = async (transferData, message) => {
    // User picked a transfer from search — convert fare into package currency
    const transferForPackage = message
      ? prepareTransferForPackage(transferData, rates)
      : transferData;

    if (isEditMode) {
      updateTransfer(transferForPackage);
      recalculatePackageInfoPricing(rates);
      if (message) {
        try {
          await syncPackageCart();
          notifications.show({
            title: "Transfer Updated",
            message: "Package updated with new transfer",
            color: "green",
          });
          router.push(getCheckoutUrl());
        } catch (err) {
          console.error("Package cart update error:", err);
          notifications.show({
            title: "Cart Error",
            message: err?.message || "Failed to update package cart. Please try again.",
            color: "red",
          });
        }
      }
      return;
    }

    const nextRoute = setTransferData(transferForPackage);
    if (!message) return;

    recalculatePackageInfoPricing(rates);

    // Flight + transfer only: no hotel package from search — create cart on transfer select
    const latest = useHolidayPackageStore.getState();
    const needsClientCart =
      isFlightTransferOnlyPackage(latest.packageConfig?.selectedServices) &&
      !!latest.selectedData?.flight;

    try {
      if (needsClientCart) {
        await createFlightTransferCart(rates);
      } else {
        await syncPackageCart();
      }
      notifications.show({
        title: "Transfer Added",
        message: "Proceeding to checkout...",
        color: "green",
      });
      router.push(nextRoute);
    } catch (err) {
      console.error("Package cart error:", err);
      notifications.show({
        title: "Cart Error",
        message: err?.message || "Failed to create package cart. Please try again.",
        color: "red",
      });
    }
  };

  /**
   * Add selected listing package to cart, then continue to hotel detail.
   * Currency is taken from the selected package (not UI/global currency).
   */
  const addSelectedPackageToCart = async () => createOrUpdatePackageCart(rates);

  return {
    isPackageMode,
    isEditMode,
    isActive,
    handleHotelSelection,
    handleFlightSelection,
    handleTransferSelection,
    handlePackageData,
    addSelectedPackageToCart,
    isServiceSelected,
  };
}

/**
 * Package Mode Banner Component
 * Shows a banner when user is in package mode
 */
export function PackageModeBanner({ serviceName = "service" }) {
  const { isPackageMode } = usePackageMode();
  const router = useRouter();

  if (!isPackageMode) return null;
  return null
  // return (
  //   <div
  //     style={{
  //       background: "linear-gradient(135deg, #E7247A 0%, #006666 100%)",
  //       color: "white",
  //       padding: "16px 0",
  //       marginBottom: "20px",
  //     }}
  //   >
  //     <div className="container">
  //       <div className="d-flex justify-content-between align-items-center">
  //         <div>
  //           <h5 className="mb-1">
  //             🎉 Building Your Holiday Package
  //           </h5>
  //           <p className="mb-0 small">
  //             Select your {serviceName} to continue building your package
  //           </p>
  //         </div>
  //         <button
  //           className="btn btn-light btn-sm"
  //           onClick={() => router.push("/holiday-packages/checkout")}
  //         >
  //           View Package
  //         </button>
  //       </div>
  //     </div>
  //   </div>
  // );
}
