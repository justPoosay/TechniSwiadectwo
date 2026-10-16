"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, type RoleEnum } from "@/lib/auth";
import { LoadingState, UnauthorizedState } from "@/components/ui/states";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleEnum[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, currentMembership } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const nextQuery = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${nextQuery}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <LoadingState message="Weryfikacja sesji..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <LoadingState message="Przekierowanie do logowania..." />
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = currentMembership?.role;
    if (!role || !allowedRoles.includes(role)) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <UnauthorizedState currentRole={role} requiredRoles={allowedRoles} />
        </div>
      );
    }
  }

  return <>{children}</>;
}
