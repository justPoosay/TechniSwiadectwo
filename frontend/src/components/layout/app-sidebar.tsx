"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, ROLE_LABELS } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

// Icons
function HomeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function BookIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );
}

function UsersIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function CertificateIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function ClipboardCheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

function ShieldCheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

export function AppSidebar({ isOpen = true, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { currentMembership } = useAuth();

  const role = currentMembership?.role;

  const roleNavItems = React.useMemo((): { title: string; items: NavItem[] } => {
    switch (role) {
      case "teacher":
        return {
          title: "Widok Nauczyciela",
          items: [
            { label: "Moje przedmioty", href: "/subjects", icon: BookIcon },
            { label: "Oceny cząstkowe", href: "/grades", icon: ClipboardCheckIcon },
          ],
        };

      case "homeroom_teacher":
        return {
          title: "Widok Wychowawcy",
          items: [
            { label: "Moja klasa", href: "/my-class", icon: UsersIcon },
            { label: "Arkusze ocen klasy", href: "/grade-sheets", icon: BookIcon },
            { label: "Świadectwa klasy", href: "/certificates", icon: CertificateIcon },
          ],
        };

      case "secretariat":
        return {
          title: "Widok Sekretariatu",
          items: [
            { label: "Księga uczniów", href: "/students", icon: UsersIcon },
            { label: "Wydawanie świadectw", href: "/certificates", icon: CertificateIcon },
          ],
        };

      case "principal":
        return {
          title: "Widok Dyrekcji",
          items: [
            { label: "Zatwierdzenia", href: "/approvals", icon: ShieldCheckIcon },
            { label: "Księga uczniów", href: "/students", icon: UsersIcon },
            { label: "Świadectwa", href: "/certificates", icon: CertificateIcon },
            { label: "Dziennik audytu", href: "/audit", icon: ClipboardCheckIcon },
          ],
        };

      case "admin":
        return {
          title: "Widok Administratora",
          items: [
            { label: "Księga uczniów", href: "/students", icon: UsersIcon },
            { label: "Dziennik audytu", href: "/audit", icon: ClipboardCheckIcon },
          ],
        };

      default:
        return {
          title: "Panel Użytkownika",
          items: [],
        };
    }
  }, [role]);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 md:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:sticky top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-200 ease-in-out md:translate-x-0 overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 space-y-6">
          {/* Main Dashboard item */}
          <div>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/"
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    pathname === "/"
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-900"
                  }`}
                >
                  <HomeIcon
                    className={`w-5 h-5 ${pathname === "/" ? "text-white" : "text-zinc-400"}`}
                  />
                  <span>Pulpit</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Role-specific section */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                {roleNavItems.title}
              </span>
              {role && (
                <span className="text-[10px] font-medium bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded">
                  {ROLE_LABELS[role] || role}
                </span>
              )}
            </div>

            <ul className="space-y-1">
              {roleNavItems.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-900"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-zinc-400"}`} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </aside>
    </>
  );
}
