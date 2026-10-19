import React, { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import useAuthStatus from "../hooks/useAuthStatus.jsx";
import authService from "../services/authService.jsx";
import { getProfile, logoutUser } from "../features/auth/authSlice.js";
import LoaderScreen from "./Loader.jsx";

export default function PrivateComponent() {
  const { isLoggedIn, checkingUser } = useAuthStatus();
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const { data, isError } = useQuery({
    queryKey: ["profile", user?.token],
    queryFn: () => authService.getMyProfile(user?.token),
    enabled: !!user?.token,
    retry: false,
  });

  useEffect(() => {
    if (data) {
      dispatch(getProfile(data));
    }
  }, [data, dispatch]);

  useEffect(() => {
    if (isError) {
      localStorage.removeItem("user");
      dispatch(logoutUser());
    }
  }, [isError, dispatch]);

  if (checkingUser) {
    return <LoaderScreen />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
