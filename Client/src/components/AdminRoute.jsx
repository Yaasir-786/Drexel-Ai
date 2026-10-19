import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import useAuthStatus from "../hooks/useAuthStatus.jsx";
import LoaderScreen from "./Loader.jsx";

export default function AdminRoute() {
  const { isLoggedIn, checkingUser } = useAuthStatus();
  const { user } = useSelector((state) => state.auth);

  if (checkingUser) {
    return <LoaderScreen />;
  }

  if (!isLoggedIn || !user?.token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.userType !== "ADMIN") {
    return <Navigate to="/chat" replace />;
  }

  return <Outlet />;
}
