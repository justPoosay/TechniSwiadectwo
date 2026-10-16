"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { api, ApiError } from "../api";
import type { AuthContextType, SchoolMembership, User } from "./types";

const SELECTED_SCHOOL_STORAGE_KEY = "techni_swiadectwo_school_id";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentSchoolId, setCurrentSchoolId] = useState<string | null>(null);

  // Helper to determine the best active membership from user
  const resolveMembership = useCallback(
    (userData: User | null, preferredSchoolId: string | null): SchoolMembership | null => {
      if (!userData || !userData.memberships || userData.memberships.length === 0) {
        return null;
      }
      if (preferredSchoolId) {
        const found = userData.memberships.find(
          (m) => m.school === preferredSchoolId && m.is_active !== false
        );
        if (found) return found;
      }
      // Fallback to first active membership
      const firstActive = userData.memberships.find((m) => m.is_active !== false);
      return firstActive ?? userData.memberships[0] ?? null;
    },
    []
  );

  const initSchoolSelection = useCallback(
    (userData: User) => {
      let savedSchoolId: string | null = null;
      if (typeof window !== "undefined") {
        try {
          savedSchoolId = window.localStorage.getItem(SELECTED_SCHOOL_STORAGE_KEY);
        } catch {
          // ignore localStorage access errors
        }
      }
      const membership = resolveMembership(userData, savedSchoolId);
      if (membership) {
        setCurrentSchoolId(membership.school);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(SELECTED_SCHOOL_STORAGE_KEY, membership.school);
          } catch {
            // ignore
          }
        }
      } else {
        setCurrentSchoolId(null);
      }
    },
    [resolveMembership]
  );

  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.get("/api/auth/me/");
      setUser(userData);
      initSchoolSelection(userData);
    } catch (err) {
      setUser(null);
      setCurrentSchoolId(null);
      if (!(err instanceof ApiError && err.isUnauthenticated)) {
        console.warn("Failed to fetch session:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [initSchoolSelection]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const userData = await api.get("/api/auth/me/");
        if (!isMounted) return;
        setUser(userData);
        initSchoolSelection(userData);
      } catch (err) {
        if (!isMounted) return;
        setUser(null);
        setCurrentSchoolId(null);
        if (!(err instanceof ApiError && err.isUnauthenticated)) {
          console.warn("Failed to fetch session:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [initSchoolSelection]);

  const login = useCallback(
    async (credentials: { email: string; password: string }): Promise<User> => {
      const loggedInUser = await api.post("/api/auth/login/", {
        body: credentials,
      });
      setUser(loggedInUser);
      initSchoolSelection(loggedInUser);
      return loggedInUser;
    },
    [initSchoolSelection]
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post("/api/auth/logout/");
    } catch (err) {
      console.warn("Error during API logout:", err);
    } finally {
      setUser(null);
      setCurrentSchoolId(null);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(SELECTED_SCHOOL_STORAGE_KEY);
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const switchSchool = useCallback(
    (schoolId: string) => {
      if (!user) return;
      const membership = user.memberships?.find(
        (m) => m.school === schoolId && m.is_active !== false
      );
      if (membership) {
        setCurrentSchoolId(membership.school);
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(SELECTED_SCHOOL_STORAGE_KEY, membership.school);
          } catch {
            // ignore
          }
        }
      }
    },
    [user]
  );

  const currentMembership = useMemo(() => {
    return resolveMembership(user, currentSchoolId);
  }, [user, currentSchoolId, resolveMembership]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      currentMembership,
      currentSchoolId,
      login,
      logout,
      switchSchool,
      refreshUser,
    }),
    [user, isLoading, currentMembership, currentSchoolId, login, logout, switchSchool, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
