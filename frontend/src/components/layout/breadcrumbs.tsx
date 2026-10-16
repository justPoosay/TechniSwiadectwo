"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const PATH_NAME_MAP: Record<string, string> = {
  classes: "Klasy",
  "my-class": "Moja klasa",
  subjects: "Przedmioty",
  grades: "Oceny",
  certificates: "Świadectwa",
  students: "Księga uczniów",
  audit: "Dziennik audytu",
  users: "Użytkownicy",
  settings: "Ustawienia",
  reports: "Raporty",
};

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  const pathname = usePathname();

  const breadcrumbs: BreadcrumbItem[] = React.useMemo(() => {
    if (items && items.length > 0) return items;

    const segments = pathname.split("/").filter(Boolean);
    const result: BreadcrumbItem[] = [{ label: "Pulpit", href: "/" }];

    let currentHref = "";
    for (const segment of segments) {
      currentHref += `/${segment}`;
      const label = PATH_NAME_MAP[segment] || decodeURIComponent(segment);
      result.push({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        href: currentHref,
      });
    }

    return result;
  }, [items, pathname]);

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Ścieżka powrotu (breadcrumbs)"
      className={`flex items-center text-xs font-medium text-zinc-500 dark:text-zinc-400 ${className}`}
    >
      <ol className="inline-flex items-center space-x-1.5 md:space-x-2">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          return (
            <li key={crumb.href || idx} className="inline-flex items-center">
              {idx > 0 && (
                <svg
                  className="w-3.5 h-3.5 text-zinc-400 mx-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
              {isLast || !crumb.href ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className="text-zinc-800 dark:text-zinc-200 font-semibold"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
