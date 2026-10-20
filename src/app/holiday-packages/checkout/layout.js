// Prevent iOS Safari auto-zoom on input focus (holiday packages checkout)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function HolidayPackagesCheckoutLayout({ children }) {
  return children;
}
