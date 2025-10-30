// src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

// Simple guard; expand with real auth/roles when ready
export default function ProtectedRoute({ isAuthed = true, children, redirectTo = "/dashboard" }) {
  if (!isAuthed) return <Navigate to={redirectTo} replace />;
  return children;
}
