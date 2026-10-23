import React from "react";
import { STATUS_LABELS, STATUS_STYLES, type StudentStatus } from "./format";

export function StatusBadge({ status }: { status: StudentStatus | undefined }) {
  const value = status ?? "ACTIVE";
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[value]}`}
    >
      {STATUS_LABELS[value]}
    </span>
  );
}
