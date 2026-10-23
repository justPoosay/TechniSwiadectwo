import type { ApiSchema } from "@/lib/api";

export type StudentStatus = ApiSchema["StatusEnum"];

export const STATUS_LABELS: Record<StudentStatus, string> = {
  ACTIVE: "Uczęszcza",
  GRADUATED: "Absolwent",
  WITHDRAWN: "Odszedł",
};

export const STATUS_STYLES: Record<StudentStatus, string> = {
  ACTIVE:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300",
  GRADUATED:
    "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-950/40 dark:text-indigo-300",
  WITHDRAWN: "bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PASSPORT: "Paszport",
  ID_CARD: "Dowód osobisty",
  OTHER: "Inny dokument",
};

/** Labels for StudentDataCorrection.changed_fields keys (StudentCorrectionService). */
export const FIELD_LABELS: Record<string, string> = {
  first_name: "Imię",
  second_name: "Drugie imię",
  last_name: "Nazwisko",
  date_of_birth: "Data urodzenia",
  place_of_birth: "Miejsce urodzenia",
  pesel: "PESEL",
  id_document_type: "Rodzaj dokumentu",
  id_document_number: "Numer dokumentu",
  register_number: "Nr w księdze uczniów",
};

type StudentNames = Pick<ApiSchema["StudentList"], "first_name" | "second_name" | "last_name">;

export function fullName(student: StudentNames): string {
  return [student.first_name, student.second_name, student.last_name].filter(Boolean).join(" ");
}

/** "Nowak Jan Adam": the order used in the student register. */
export function registerName(student: StudentNames): string {
  return [student.last_name, student.first_name, student.second_name].filter(Boolean).join(" ");
}

/** PESEL, or the substitute identity document when the student has no PESEL. */
export function identifier(
  student: Pick<ApiSchema["StudentList"], "pesel" | "id_document_type" | "id_document_number">
): string {
  if (student.pesel) return `PESEL ${student.pesel}`;
  if (student.id_document_number) {
    const type = DOCUMENT_TYPE_LABELS[student.id_document_type ?? ""] ?? "Dokument";
    return `${type} ${student.id_document_number}`;
  }
  return "Brak identyfikatora";
}

/** "2008-05-14" -> "14.05.2008" without time-zone shifts. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  });
}

/** Value from changed_fields shown to the user. */
export function formatChangeValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "date_of_birth" && typeof value === "string") return formatDate(value);
  if (field === "id_document_type" && typeof value === "string") {
    return DOCUMENT_TYPE_LABELS[value] ?? value;
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export type FieldChange = { field: string; label: string; old: string; new: string };

/** Parses `changed_fields` ({field: {old, new}}), ignoring anything malformed. */
export function parseChanges(changedFields: unknown): FieldChange[] {
  if (!changedFields || typeof changedFields !== "object") return [];
  return Object.entries(changedFields as Record<string, unknown>).flatMap(([field, change]) => {
    if (!change || typeof change !== "object") return [];
    const { old, new: next } = change as { old?: unknown; new?: unknown };
    return [
      {
        field,
        label: FIELD_LABELS[field] ?? field,
        old: formatChangeValue(field, old),
        new: formatChangeValue(field, next),
      },
    ];
  });
}
