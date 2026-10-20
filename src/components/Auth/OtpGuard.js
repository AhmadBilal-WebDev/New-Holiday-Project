"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, getSession } from "next-auth/react";

export default function OtpGuard({ children }) {
  const { status, update } = useSession();
  const router = useRouter();
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (status !== "unauthenticated" || redirectingRef.current) return;

    let cancelled = false;

    // Re-check once before redirecting — avoids false logout when session
    // briefly reports unauthenticated during navigation / provider remount.
    (async () => {
      const session = await getSession();
      if (cancelled) return;

      if (session) {
        await update();
        return;
      }

      redirectingRef.current = true;
      router.replace("/login");
    })();

    return () => {
      cancelled = true;
    };
  }, [status, router, update]);

  if (status === "loading") return null;
  if (status !== "authenticated") return null;

  return children;
}
