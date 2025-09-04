import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: "admin" }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  if (role === "admin" && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
