// Settings page: profile details, password update, and theme appearance selector
import React, { useState } from "react";
import {
  Sun,
  Moon,
  CheckCircle2,
  User,
  RotateCcw,
  Palette,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";
import TextField from "../components/TextField";
import Button from "../components/Button";
import { useTheme } from "../context/ThemeContext";
import { useSelector, useDispatch } from "react-redux";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import userService from "../services/userService";
import authService from "../services/authService";
import { getProfile } from "../features/auth/authSlice";

// Show "-" when a read-only profile value is empty
const orDash = (value) => (value ? value : "-");

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const isAdmin = user?.userType === "ADMIN";

  // Editable profile form states (prefilled from the logged-in user)
  const [name, setName] = useState(user?.name || "");
  const [role, setRole] = useState(user?.onboarding?.role || "");
  const [goal, setGoal] = useState(user?.onboarding?.goal || "");
  const [teamSize, setTeamSize] = useState(user?.onboarding?.teamSize || "");

  // Last saved values, used to detect changes and resync after saving
  const [saved, setSaved] = useState({
    name: user?.name || "",
    role: user?.onboarding?.role || "",
    goal: user?.onboarding?.goal || "",
    teamSize: user?.onboarding?.teamSize || "",
  });

  // Password form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Save profile mutation
  const profileMutation = useMutation({
    mutationFn: (payload) => userService.updateProfile(user?.token, payload),
    onSuccess: (data, variables) => {
      dispatch(getProfile(data));
      localStorage.setItem("user", JSON.stringify({ ...user, ...data }));
      setSaved((prev) => ({ ...prev, ...variables }));
      toast.success("Profile updated");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Something went wrong");
    },
  });

  // Build the payload from changed fields that are not empty (admins can only change the name)
  const payload = {};
  if (name.trim() !== saved.name && name.trim()) payload.name = name.trim();
  if (!isAdmin) {
    if (role !== saved.role && role) payload.role = role;
    if (goal.trim() !== saved.goal && goal.trim()) payload.goal = goal.trim();
    if (teamSize !== saved.teamSize && teamSize) payload.teamSize = teamSize;
  }

  // Save is allowed only with valid name/goal and at least one real change
  const isValid =
    name.trim().length >= 2 &&
    name.trim().length <= 50 &&
    goal.trim().length <= 300;
  const canSave =
    isValid && !profileMutation.isPending && Object.keys(payload).length > 0;

  // Save the profile
  const handleProfileSave = (e) => {
    e.preventDefault();
    if (!canSave) return;
    profileMutation.mutate(payload);
  };

  // Change password mutation (the API returns a fresh token)
  const passwordMutation = useMutation({
    mutationFn: (payload) => authService.changePassword(user?.token, payload),
    onSuccess: (data) => {
      dispatch(getProfile({ token: data.token }));
      localStorage.setItem(
        "user",
        JSON.stringify({ ...user, token: data.token }),
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Something went wrong");
    },
  });

  // Validate and change the password
  const handlePasswordSave = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Enter both passwords");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword === currentPassword) {
      toast.error("New password must be different from the current one");
      return;
    }
    passwordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <AppShell title="Settings" description="Manage your profile and appearance">
      <div className="flex flex-col md:flex-row gap-8 items-start relative">
        {/* Settings Cards (24px gap) */}
        <div className="flex-1 flex flex-col gap-6 w-full">
          {/* 1. Profile Details Card */}
          <div
            id="profile"
            className="bg-card border border-line rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink mb-1">
              Profile details
            </h2>
            <p className="text-xs text-muted mb-5">
              Update your basic information and team configuration.
            </p>

            <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
              <div
                className={`grid gap-4 ${
                  isAdmin ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
                }`}>
                <TextField
                  id="profile-name"
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                {!isAdmin && (
                  <div className="flex flex-col gap-1.5 w-full">
                    <label
                      htmlFor="profile-role"
                      className="text-sm font-medium text-ink">
                      Role
                    </label>
                    <select
                      id="profile-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-line bg-card text-sm text-ink outline-none focus:ring-2 focus:ring-[#0099FF]">
                      <option value="">Select role</option>
                      <option value="Student">Student</option>
                      <option value="Developer">Developer</option>
                      <option value="Designer">Designer</option>
                      <option value="Founder">Founder</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}
              </div>

              {!isAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    id="profile-goal"
                    label="What do you want to build"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    maxLength={300}
                  />

                  <div className="flex flex-col gap-1.5 w-full">
                    <label
                      htmlFor="profile-team"
                      className="text-sm font-medium text-ink">
                      Team size
                    </label>
                    <select
                      id="profile-team"
                      value={teamSize}
                      onChange={(e) => setTeamSize(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-line bg-card text-sm text-ink outline-none focus:ring-2 focus:ring-[#0099FF]">
                      <option value="">Select team size</option>
                      <option value="Just me">Just me</option>
                      <option value="2-5">2-5</option>
                      <option value="6-20">6-20</option>
                      <option value="21-50">21-50</option>
                      <option value="50+">50+</option>
                    </select>
                  </div>
                </div>
              )}

              {isAdmin ? (
                <TextField
                  id="profile-email"
                  label="Email"
                  value={orDash(user?.email)}
                  readOnly
                  helperText="Email cannot be changed."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField
                    id="profile-phone"
                    label="Phone"
                    value={orDash(user?.phone)}
                    readOnly
                    helperText="Phone cannot be changed."
                  />

                  <TextField
                    id="profile-email"
                    label="Email"
                    value={orDash(user?.email)}
                    readOnly
                    helperText="Email cannot be changed."
                  />
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary" disabled={!canSave}>
                  Save changes
                </Button>
              </div>
            </form>
          </div>

          {/* 2. Change Password Card */}
          <div
            id="password"
            className="bg-card border border-line rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink mb-1">
              Change password
            </h2>
            <p className="text-xs text-muted mb-5">
              Ensure your account is protected with a secure password.
            </p>

            <form onSubmit={handlePasswordSave} className="flex flex-col gap-4">
              <TextField
                id="current-password"
                label="Current password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                showPasswordToggle
              />

              <TextField
                id="new-password"
                label="New password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                showPasswordToggle
                helperText="Min 8 characters, with a letter and a number"
              />

              <TextField
                id="confirm-password"
                label="Confirm new password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                showPasswordToggle
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary">
                  Update password
                </Button>
              </div>
            </form>
          </div>

          {/* 3. Appearance Card */}
          <div
            id="appearance"
            className="bg-card border border-line rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink mb-1">
              Appearance
            </h2>
            <p className="text-xs text-muted mb-5">
              Choose between light and dark visual themes.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Light Tile */}
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer text-left ${
                  theme === "light"
                    ? "border-[#0099FF] bg-blue-50/60 dark:bg-blue-950/40 text-ink"
                    : "border-line bg-surface text-muted hover:text-ink"
                }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-card border border-line flex items-center justify-center text-amber-500">
                    <Sun size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">Light</div>
                    <div className="text-xs text-muted">
                      Crisp white workbench
                    </div>
                  </div>
                </div>
                {theme === "light" && (
                  <CheckCircle2 size={20} className="text-[#0099FF]" />
                )}
              </button>

              {/* Dark Tile */}
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer text-left ${
                  theme === "dark"
                    ? "border-[#0099FF] bg-blue-50/60 dark:bg-blue-950/40 text-ink"
                    : "border-line bg-surface text-muted hover:text-ink"
                }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-card border border-line flex items-center justify-center text-blue-400">
                    <Moon size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">Dark</div>
                    <div className="text-xs text-muted">
                      Low-light obsidian layout
                    </div>
                  </div>
                </div>
                {theme === "dark" && (
                  <CheckCircle2 size={20} className="text-[#0099FF]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
