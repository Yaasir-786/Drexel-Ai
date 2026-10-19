// Application route definitions for Drexel-Ai with Chat and role-protected Admin
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

// Pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Chat from "./pages/Chat";
import Projects from "./pages/Projects";
import Builder from "./pages/Builder";
import Usage from "./pages/Usage";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";

// Route Guards
import PrivateComponent from "./components/PrivateComponent";
import AdminRoute from "./components/AdminRoute";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Private protected routes */}
        <Route element={<PrivateComponent />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/chat/:id?" element={<Chat />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<Builder />} />
          <Route path="/usage" element={<Usage />} />
          <Route path="/settings" element={<Settings />} />

          {/* Admin route protected with Role-Based Guard */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </QueryClientProvider>
  );
}
