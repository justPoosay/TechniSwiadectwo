import type { ApiSchema } from "../api";

export type User = ApiSchema["User"];
export type SchoolMembership = ApiSchema["SchoolMembership"];
export type RoleEnum = ApiSchema["RoleEnum"];

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  currentMembership: SchoolMembership | null;
  currentSchoolId: string | null;
  login: (credentials: { email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  switchSchool: (schoolId: string) => void;
  refreshUser: () => Promise<void>;
}

export const ROLE_LABELS: Record<RoleEnum, string> = {
  secretariat: "Sekretariat",
  teacher: "Nauczyciel",
  homeroom_teacher: "Wychowawca",
  principal: "Dyrekcja",
  admin: "Administrator",
};
