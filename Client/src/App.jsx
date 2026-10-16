// Application route definitions for Drexel-Ai with Chat and role-protected Admin
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

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

// Role-based Route Guard
import AdminRoute from "./components/AdminRoute";

export default function App() {
  return (
    <Routes>
      {/* Public and marketing routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Claude-inspired Chat interface */}
      <Route path="/chat" element={<Chat />} />
      <Route path="/chat/:id" element={<Chat />} />

      {/* Workspace routes */}
      <Route path="/projects" element={<Projects />} />
      <Route path="/projects/:id" element={<Builder />} />
      <Route path="/usage" element={<Usage />} />
      <Route path="/settings" element={<Settings />} />

      {/* Admin route protected with Role-Based Guard */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Admin />
          </AdminRoute>
        }
      />

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
