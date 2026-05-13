"use client";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <>{children}</>;
  return <div className="app-shell">{children}</div>;
}
