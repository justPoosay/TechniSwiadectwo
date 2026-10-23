import type { ApiSchema } from "@/lib/api";

export type StudentStatus = "ACTIVE" | "GRADUATED" | "WITHDRAWN";
export type CohortNested = ApiSchema["CohortNested"];
export type StudentList = ApiSchema["StudentList"];
export type PaginatedStudentResponse = ApiSchema["PaginatedStudentListList"];
export type StudentHistoryEntry = ApiSchema["StudentHistoryEntry"];
export type StudentDataCorrection = ApiSchema["StudentDataCorrection"];
export type StudentDetail = ApiSchema["StudentDetail"];
