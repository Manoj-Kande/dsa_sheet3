"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, Target, BarChart2, Brain } from "lucide-react";

const TABS = [
  { href: "/",             icon: Home,      label: "Home"      },
  { href: "/problems",     icon: BookOpen,  label: "Problems"  },
  { href: "/daily-target", icon: Target,    label: "Target"    },
  { href: "/analytics",    icon: BarChart2, label: "Stats"     },
  { href: "/review",       icon: Brain,     label: "Review"    },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border-default bg-bg-base/95 backdrop-blur-xl">
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {TABS.map(tab => {
          const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[56px] min-h-[44px] justify-center transition-colors
                ${isActive ? "text-accent" : "text-text-tertiary hover:text-text-secondary"}`}>
              <tab.icon className={`h-5 w-5 transition-transform ${isActive ? "scale-110" : ""}`} />
              <span className={`text-[10px] font-medium ${isActive ? "text-accent" : ""}`}>{tab.label}</span>
              {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-accent rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
