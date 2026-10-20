// Prevent iOS Safari auto-zoom on input focus (auth pages)
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function AuthLayout({ children }) {
  return children;
}
