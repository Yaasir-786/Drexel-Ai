// UserDrawer component (480px right) for inspecting user details, adjusting credits, and blocking
import React, { useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import Badge from '../Badge';
import Button from '../Button';

export default function UserDrawer({
  user,
  isOpen,
  onClose,
  onUpdateCredits,
  onToggleBlock,
  onDeleteUser,
}) {
  const [creditMode, setCreditMode] = useState('add'); // 'add', 'remove', 'set'
  const [creditAmount, setCreditAmount] = useState('');

  if (!isOpen || !user) return null;

  const handleSaveCredits = (e) => {
    e.preventDefault();
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) return;

    let newCredits = parseFloat(user.credits) || 0;
    if (creditMode === 'add') {
      newCredits += amount;
    } else if (creditMode === 'remove') {
      newCredits = Math.max(0, newCredits - amount);
    } else if (creditMode === 'set') {
      newCredits = Math.max(0, amount);
    }

    onUpdateCredits(user.id, newCredits.toFixed(1));
    setCreditAmount('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full md:w-[480px] h-full bg-card border-l border-line flex flex-col shadow-2xl z-50 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h2 className="text-lg font-semibold text-ink tracking-tight">User details</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close user drawer"
            className="text-muted hover:text-ink p-1 rounded-lg cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 flex flex-col gap-6">
          {/* User Profile Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-gradient text-white text-lg font-bold flex items-center justify-center shrink-0 shadow-sm">
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-ink truncate">{user.name}</h3>
              <p className="text-xs text-muted truncate">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={user.role === 'ADMIN' ? 'purple' : 'neutral'}>{user.role}</Badge>
                <Badge variant={user.status === 'Active' ? 'success' : 'danger'} dot>
                  {user.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* 3 Equal Mini Stat Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface border border-line rounded-xl p-3 text-center">
              <span className="text-[11px] font-medium text-muted block mb-1">Projects</span>
              <span className="text-base font-bold text-ink">{user.projectsCount || 6}</span>
            </div>
            <div className="bg-surface border border-line rounded-xl p-3 text-center">
              <span className="text-[11px] font-medium text-muted block mb-1">Tokens</span>
              <span className="text-base font-bold text-ink">{user.tokensUsed || '1.4M'}</span>
            </div>
            <div className="bg-surface border border-line rounded-xl p-3 text-center">
              <span className="text-[11px] font-medium text-muted block mb-1">Credits</span>
              <span className="text-base font-bold text-ink">{user.credits}</span>
            </div>
          </div>

          {/* Section: Adjust credits */}
          <div className="bg-surface border border-line rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-xs font-semibold text-ink uppercase tracking-wider">Adjust credits</span>
            <div className="flex rounded-xl bg-card border border-line p-1">
              {['add', 'remove', 'set'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCreditMode(mode)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize cursor-pointer ${
                    creditMode === mode ? 'bg-primary-gradient text-white' : 'text-muted hover:text-ink'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveCredits} className="flex gap-2">
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Amount"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="flex-1 h-10 px-3 rounded-xl border border-line bg-card text-ink text-sm outline-none focus:ring-2 focus:ring-[#0099FF]"
              />
              <Button type="submit" variant="secondary" className="h-10 px-4">
                Save
              </Button>
            </form>
          </div>

          {/* Row: Block User Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-line bg-surface">
            <div>
              <span className="text-sm font-semibold text-ink block">Block user</span>
              <span className="text-xs text-muted">Prevent this user from logging in and generating code</span>
            </div>
            <button
              type="button"
              onClick={() => onToggleBlock(user)}
              className={`w-12 h-6 rounded-full border border-line p-0.5 flex items-center cursor-pointer ${
                user.status === 'Blocked' ? 'bg-red-500 justify-end' : 'bg-card justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {/* Danger Zone Card */}
          <div className="border border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm">
              <ShieldAlert size={18} />
              Danger zone
            </div>
            <p className="text-xs text-muted">
              This permanently deletes the user, their projects and chats.
            </p>
            <Button
              variant="danger"
              onClick={() => onDeleteUser(user)}
              className="w-full mt-1"
            >
              Delete user
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
