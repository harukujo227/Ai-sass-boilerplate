"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import config from "@/lib/config";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const theme = (config as any).theme || "slate-indigo";
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, []);

  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
