"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignIn, SignInButton, UserButton } from "@clerk/nextjs";
import { Search, Menu, X, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { CommandPalette } from "./command-palette";

// Primary nav — always visible
const PRIMARY = [
  { href: "/",             label: "Dashboard"    },
  { href: "/problems",     label: "Problems"     },
  { href: "/topics",       label: "Roadmap"      },
  { href: "/daily-target", label: "Daily Target" },
  { href: "/analytics",    label: "Analytics"    },
];

// Secondary — in "More" dropdown
const SECONDARY = [
  { href: "/companies",  label: "Companies"     },
  { href: "/sheets",     label: "Sheets"        },
  { href: "/my-sheets",  label: "My Sheets"     },
  { href: "/bookmarks",  label: "Bookmarks"     },
  { href: "/review",     label: "Review Queue"  },
];

const ALL = [...PRIMARY, ...SECONDARY];

function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const hasActive = SECONDARY.some(l => pathname.startsWith(l.href));

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`relative flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
          ${hasActive ? "text-text-primary" : "text-text-tertiary hover:text-text-primary hover:bg-bg-surface"}`}>
        More <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        {hasActive && <span className="absolute inset-x-2 -bottom-px h-px bg-gradient-to-r from-transparent via-accent to-transparent" />}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-44 rounded-xl border border-border-default bg-bg-surface shadow-xl overflow-hidden z-50">
          {SECONDARY.map(link => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                className={`flex items-center px-4 py-2.5 text-sm transition-colors
                  ${isActive ? "bg-bg-elevated text-accent font-semibold" : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"}`}>
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdkOpen(true); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className={`sticky top-0 z-40 h-14 border-b transition-all duration-200
        ${scrolled ? "border-border-default bg-bg-base/90 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)]"
                   : "border-transparent bg-bg-base/70 backdrop-blur-md"}`}>
        <div className="max-w-[1400px] mx-auto h-full px-6 flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0 group">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-[#4ade80] grid place-items-center text-white font-extrabold text-[13px] shadow-[0_2px_8px_rgba(110,110,247,0.4)] transition-shadow group-hover:shadow-[0_4px_12px_rgba(110,110,247,0.6)]">IO</span>
            <span className="text-text-primary hidden sm:inline">InterviewOS</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1">
            {PRIMARY.map(link => {
              const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap
                    ${isActive ? "text-text-primary" : "text-text-tertiary hover:text-text-primary hover:bg-bg-surface"}`}>
                  {isActive && <span className="absolute inset-x-2 -bottom-px h-px bg-gradient-to-r from-transparent via-accent to-transparent" />}
                  {link.label}
                </Link>
              );
            })}
            <MoreMenu />
          </nav>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto">
            <button onClick={() => setCmdkOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-bg-surface border border-border-default rounded-lg text-text-tertiary text-sm hover:border-border-strong hover:bg-bg-elevated transition-all duration-150 group"
              aria-label="Open search">
              <Search className="w-3.5 h-3.5 shrink-0 group-hover:text-text-secondary transition-colors" />
              <span className="hidden sm:inline text-xs">Search…</span>
              <kbd className="hidden sm:inline font-mono text-[10px] px-1.5 py-0.5 bg-bg-elevated border border-border-default rounded text-text-tertiary">⌘K</kbd>
            </button>
            <SignInButton mode="modal">
              <button className="btn-primary text-xs px-3 py-2 min-h-[36px] [&:not([data-clerk-sign-in])]:hidden">Sign in</button>
            </SignInButton>
            <UserButton />
            <button
              className="md:hidden p-2 rounded-lg text-text-secondary hover:bg-bg-surface hover:text-text-primary transition-colors min-h-[44px] min-w-[44px] grid place-items-center"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen} aria-controls={mobileMenuId}
              onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div id={mobileMenuId} className="md:hidden border-t border-border-default bg-bg-base/95 backdrop-blur-xl px-4 py-3 space-y-0.5">
            {ALL.map(link => {
              const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]
                    ${isActive ? "bg-bg-surface text-accent" : "text-text-secondary hover:text-text-primary hover:bg-bg-surface"}`}>
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
