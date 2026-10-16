// Settings page: profile details, password update, and theme appearance selector
import React, { useState } from 'react';
import { Sun, Moon, CheckCircle2, User, RotateCcw, Palette } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import TextField from '../components/TextField';
import Button from '../components/Button';
import Toast from '../components/Toast';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile form states
  const [name, setName] = useState('Jane Doe');
  const [role, setRole] = useState('Developer');
  const [goal, setGoal] = useState('SaaS and AI agent web applications');
  const [teamSize, setTeamSize] = useState('Just me');

  // Password form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Toast state
  const [showToast, setShowToast] = useState(false);

  const handleProfileSave = (e) => {
    e.preventDefault();
    setShowToast(true);
  };

  const handlePasswordSave = (e) => {
    e.preventDefault();
    setCurrentPassword('');
    setNewPassword('');
    setShowToast(true);
  };

  return (
    <AppShell title="Settings" description="Manage your profile and appearance">
      <div className="flex flex-col md:flex-row gap-8 items-start relative">
        {/* Sub-navigation matching reference image */}
        <nav aria-label="Settings sections" className="w-full md:w-[220px] shrink-0 sticky top-20 z-10">
          <div className="flex md:flex-col gap-1 p-1 bg-surface rounded-2xl border border-line">
            <a
              href="#profile"
              onClick={() => setActiveTab('profile')}
              className={`px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors ${
                activeTab === 'profile'
                  ? 'bg-[#dbeafe] text-[#0066cc] dark:bg-blue-600/20 dark:text-[#60a5fa]'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
              }`}
            >
              <User
                size={18}
                className={
                  activeTab === 'profile'
                    ? 'text-[#0066cc] dark:text-[#60a5fa]'
                    : 'text-slate-700 dark:text-slate-300'
                }
              />
              <span>Profile</span>
            </a>
            <a
              href="#password"
              onClick={() => setActiveTab('password')}
              className={`px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors ${
                activeTab === 'password'
                  ? 'bg-[#dbeafe] text-[#0066cc] dark:bg-blue-600/20 dark:text-[#60a5fa]'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
              }`}
            >
              <RotateCcw
                size={18}
                className={
                  activeTab === 'password'
                    ? 'text-[#0066cc] dark:text-[#60a5fa]'
                    : 'text-slate-700 dark:text-slate-300'
                }
              />
              <span>Password</span>
            </a>
            <a
              href="#appearance"
              onClick={() => setActiveTab('appearance')}
              className={`px-3.5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-colors ${
                activeTab === 'appearance'
                  ? 'bg-[#dbeafe] text-[#0066cc] dark:bg-blue-600/20 dark:text-[#60a5fa]'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
              }`}
            >
              <Palette
                size={18}
                className={
                  activeTab === 'appearance'
                    ? 'text-[#0066cc] dark:text-[#60a5fa]'
                    : 'text-slate-700 dark:text-slate-300'
                }
              />
              <span>Appearance</span>
            </a>
          </div>
        </nav>

        {/* Settings Cards (24px gap) */}
        <div className="flex-1 flex flex-col gap-6 w-full">
          {/* 1. Profile Details Card */}
          <div id="profile" className="bg-card border border-line rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink mb-1">Profile details</h2>
            <p className="text-xs text-muted mb-5">Update your basic information and team configuration.</p>

            <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  id="profile-name"
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />

                <div className="flex flex-col gap-1.5 w-full">
                  <label htmlFor="profile-role" className="text-sm font-medium text-ink">Role</label>
                  <select
                    id="profile-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-line bg-card text-sm text-ink outline-none focus:ring-2 focus:ring-[#0099FF]"
                  >
                    <option value="Student">Student</option>
                    <option value="Developer">Developer</option>
                    <option value="Designer">Designer</option>
                    <option value="Founder">Founder</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  id="profile-goal"
                  label="What do you want to build"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />

                <div className="flex flex-col gap-1.5 w-full">
                  <label htmlFor="profile-team" className="text-sm font-medium text-ink">Team size</label>
                  <select
                    id="profile-team"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-line bg-card text-sm text-ink outline-none focus:ring-2 focus:ring-[#0099FF]"
                  >
                    <option value="Just me">Just me</option>
                    <option value="2-5">2-5</option>
                    <option value="6-20">6-20</option>
                    <option value="21-50">21-50</option>
                    <option value="50+">50+</option>
                  </select>
                </div>
              </div>

              <TextField
                id="profile-email"
                label="Email"
                value="jane@example.com"
                readOnly
                helperText="Email cannot be changed."
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary">
                  Save changes
                </Button>
              </div>
            </form>
          </div>

          {/* 2. Change Password Card */}
          <div id="password" className="bg-card border border-line rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink mb-1">Change password</h2>
            <p className="text-xs text-muted mb-5">Ensure your account is protected with a secure password.</p>

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

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="primary">
                  Update password
                </Button>
              </div>
            </form>
          </div>

          {/* 3. Appearance Card */}
          <div id="appearance" className="bg-card border border-line rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-semibold text-ink mb-1">Appearance</h2>
            <p className="text-xs text-muted mb-5">Choose between light and dark visual themes.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Light Tile */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer text-left ${
                  theme === 'light'
                    ? 'border-[#0099FF] bg-blue-50/60 dark:bg-blue-950/40 text-ink'
                    : 'border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-card border border-line flex items-center justify-center text-amber-500">
                    <Sun size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">Light</div>
                    <div className="text-xs text-muted">Crisp white workbench</div>
                  </div>
                </div>
                {theme === 'light' && <CheckCircle2 size={20} className="text-[#0099FF]" />}
              </button>

              {/* Dark Tile */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer text-left ${
                  theme === 'dark'
                    ? 'border-[#0099FF] bg-blue-50/60 dark:bg-blue-950/40 text-ink'
                    : 'border-line bg-surface text-muted hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-card border border-line flex items-center justify-center text-blue-400">
                    <Moon size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">Dark</div>
                    <div className="text-xs text-muted">Low-light obsidian layout</div>
                  </div>
                </div>
                {theme === 'dark' && <CheckCircle2 size={20} className="text-[#0099FF]" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message="Saved successfully"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </AppShell>
  );
}
