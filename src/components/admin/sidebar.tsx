"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

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

interface ConnectionStatus {
  microsoft: { connected: boolean; email?: string };
  docusign: { connected: boolean };
  calendly: { connected: boolean };
}

const connections = [
  { key: "microsoft" as const, label: "Outlook", href: "/admin/settings?tab=connections" },
  { key: "docusign" as const, label: "DocuSign", href: "/admin/settings?tab=connections" },
  { key: "calendly" as const, label: "Calendly", href: "/admin/settings?tab=connections" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch("/api/admin/integrations/status", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setStatus(data))
      .catch(() => {});
  }, []);

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } min-h-screen bg-ottera-dark text-white flex flex-col transition-all duration-200`}
    >
      <div className="px-3 py-5 border-b border-white/10 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2 pl-3">
            <Image src="/ottera-logo.png" alt="OTTera" width={100} height={30} priority />
            <span className="text-xs text-gray-400">Data Room</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors ${
            collapsed ? "mx-auto" : ""
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navLinks.map((link) => {
          const isActive =
            pathname === link.href || pathname.startsWith(link.href + "/");

          return (
            <Link
              key={link.href}
              href={link.href}
              title={collapsed ? link.label : undefined}
              className={`flex items-center ${
                collapsed ? "justify-center" : ""
              } px-3 py-2 rounded-[10px] text-sm font-medium transition-colors ${
                isActive
                  ? "bg-ottera-red text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {collapsed ? (
                <span className="text-xs font-bold">{link.label.charAt(0)}</span>
              ) : (
                <span>{link.label}</span>
              )}
            </Link>
          );
        })}

        {/* Connections */}
        {!collapsed && (
          <div className="pt-5 mt-4 border-t border-white/10">
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Connections
            </p>
            {connections.map((conn) => {
              const connected = status?.[conn.key]?.connected ?? false;
              return (
                <button
                  key={conn.key}
                  onClick={() => router.push(conn.href)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-left"
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      connected ? "bg-green-400" : "bg-red-400"
                    }`}
                  />
                  <span>{conn.label}</span>
                </button>
              );
            })}
          </div>
        )}
        {collapsed && (
          <div className="pt-5 mt-4 border-t border-white/10 flex flex-col items-center gap-2">
            {connections.map((conn) => {
              const connected = status?.[conn.key]?.connected ?? false;
              return (
                <button
                  key={conn.key}
                  onClick={() => router.push(conn.href)}
                  title={conn.label}
                  className="p-2 rounded-[10px] text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <span
                    className={`block w-2 h-2 rounded-full ${
                      connected ? "bg-green-400" : "bg-red-400"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t border-white/10">
        <button
          onClick={async () => {
            await fetch("/api/admin/auth/logout", { method: "POST", credentials: "include" });
            router.push("/admin/login");
          }}
          title={collapsed ? "Log out" : undefined}
          className={`w-full flex items-center ${
            collapsed ? "justify-center" : "gap-2"
          } px-3 py-2 rounded-[10px] text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-white transition-colors`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </aside>
  );
}
