"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarLink {
  href: string;
  label: string;
  badge?: number;
}

const navLinks: SidebarLink[] = [
  { href: "/admin/rooms", label: "Rooms" },
  { href: "/admin/contacts", label: "Contacts" },
  { href: "/admin/approvals", label: "Approvals" },
  { href: "/admin/audit-log", label: "Audit Log" },
  { href: "/admin/settings", label: "Settings" },
];

interface SidebarProps {
  pendingCount?: number;
}

export function Sidebar({ pendingCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-indigo-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-indigo-700">
        <span className="text-lg font-semibold tracking-tight">Data Room</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navLinks.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(link.href + "/");
          const showBadge = link.label === "Approvals" && pendingCount > 0;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-indigo-700 text-white"
                  : "text-indigo-200 hover:bg-indigo-800 hover:text-white"
              }`}
            >
              <span>{link.label}</span>
              {showBadge && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-400 text-yellow-900">
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
