"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Search, Menu, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { CommandPalette } from "./command-palette";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/daily-target", label: "Daily Target" },
  { href: "/topics", label: "Roadmap" },
  { href: "/problems", label: "Problems" },
  { href: "/companies", label: "Companies" },
  { href: "/sheets", label: "Sheets" },
  { href: "/bookmarks", label: "Bookmarks" },
];

export function TopNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mobileMenuId = useId();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className={`sticky top-0 z-40 h-14 border-b transition-all duration-200
        ${scrolled
          ? "border-border-default bg-bg-base/90 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)]"
          : "border-transparent bg-bg-base/70 backdrop-blur-md"}`}>
        <div className="max-w-[1400px] mx-auto h-full px-6 flex items-center gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0 group">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-[#4ade80] grid place-items-center text-white font-extrabold text-[13px] shadow-[0_2px_8px_rgba(110,110,247,0.4)] transition-shadow group-hover:shadow-[0_4px_12px_rgba(110,110,247,0.6)]">
              IO
            </span>
            <span className="text-text-primary">InterviewOS</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1" aria-label="Primary">
            {LINKS.map((link) => {
              const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap
                    ${isActive
                      ? "text-text-primary"
                      : "text-text-tertiary hover:text-text-primary hover:bg-bg-surface"}`}>
                  {isActive && (
                    <span className="absolute inset-x-2 -bottom-px h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
                  )}
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto">
            {/* Search */}
            <button onClick={() => setCmdkOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-bg-surface border border-border-default rounded-lg text-text-tertiary text-sm min-w-[160px] hover:border-border-strong hover:bg-bg-elevated transition-all duration-150 group"
              aria-label="Open search">
              <Search className="w-3.5 h-3.5 shrink-0 group-hover:text-text-secondary transition-colors" />
              <span className="hidden sm:inline flex-1 text-left text-xs">Search problems…</span>
              <kbd className="hidden sm:inline font-mono text-[10px] px-1.5 py-0.5 bg-bg-elevated border border-border-default rounded text-text-tertiary">⌘K</kbd>
            </button>

            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="btn-primary text-xs px-3 py-2 min-h-[36px]">Sign in</button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>

            <button
              className="md:hidden p-2 rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text-primary transition-colors min-h-[44px] min-w-[44px] grid place-items-center"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls={mobileMenuId}
              onClick={() => setMobileOpen((o) => !o)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div id={mobileMenuId}
            className="md:hidden border-t border-border-default bg-bg-base/95 backdrop-blur-xl px-4 py-3 space-y-0.5">
            {LINKS.map((link) => {
              const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]
                    ${isActive ? "bg-bg-surface text-text-primary" : "text-text-secondary hover:text-text-primary hover:bg-bg-surface"}`}>
                  {link.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>
      <CommandPalette open={cmdkOpen} onOpenChange={setCmdkOpen} />
    </>
  );
}
