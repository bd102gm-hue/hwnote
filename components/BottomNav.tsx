"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", icon: "🏠", label: "หน้าแรก" },
  { href: "/homework", icon: "✏️", label: "จด" },
  { href: "/schedule", icon: "📅", label: "ตาราง" },
  { href: "/export", icon: "🖼", label: "แชร์" },
  { href: "/settings", icon: "⚙️", label: "ตั้งค่า" },
];

export default function BottomNav() {
  const path = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md border-t border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = path === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-col items-center gap-0.5 py-2.5 transition-colors"
            >
              <span className={`text-xl transition-transform ${active ? "scale-110" : "opacity-45 grayscale"}`}>
                {t.icon}
              </span>
              <span className={`text-[10px] font-medium ${active ? "text-indigo-600" : "text-slate-400"}`}>
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
