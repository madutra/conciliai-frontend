"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { CONTAINER_DEFAULT, CONTAINER_WIDE } from "@/lib/layout";

export function SiteHeader() {
  const pathname = usePathname();
  const wide = pathname?.startsWith("/batches/");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className={cn(wide ? CONTAINER_WIDE : CONTAINER_DEFAULT, "flex h-14 items-center justify-between")}>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm font-semibold tracking-tight transition-colors"
        >
          ConciliAI
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
