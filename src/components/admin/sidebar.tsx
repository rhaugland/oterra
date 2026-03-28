"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarLink {
  href: string;
  label: string;
}

const navLinks: SidebarLink[] = [
  { href: "/admin/rooms", label: "Data Rooms" },
  { href: "/admin/contacts", label: "Contacts" },
  { href: "/admin/ndas", label: "NDAs" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/receipts", label: "Weekly Receipts" },
  { href: "/admin/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-ottera-dark text-white flex flex-col">
      <div className="px-6 py-5 border-b border-white/10">
        <span className="text-lg font-[var(--font-jura)] font-bold tracking-tight text-ottera-red">
          OTTera
        </span>
        <span className="text-xs text-gray-400 ml-1.5">Data Room</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navLinks.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(link.href + "/");

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between px-3 py-2 rounded-[10px] text-sm font-medium transition-colors ${
                isActive
                  ? "bg-ottera-red text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
