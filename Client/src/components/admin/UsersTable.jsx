// UsersTable component: desktop table and mobile stacked cards with user action menus
import React, { useState } from 'react';
import { MoreVertical, UserCheck, UserX, Sliders, Trash2, Eye } from 'lucide-react';
import Badge from '../Badge';

export default function UsersTable({
  users,
  onViewDetails,
  onAdjustCredits,
  onToggleBlock,
  onDelete,
}) {
  const [activeMenuId, setActiveMenuId] = useState(null);

  return (
    <div className="w-full flex flex-col">
      {/* Desktop & Tablet Table (hidden md:block) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-line text-muted bg-surface/50">
              <th className="py-3 px-4 font-semibold">User</th>
              <th className="py-3 px-4 font-semibold">Role</th>
              <th className="py-3 px-4 font-semibold text-right">Credits</th>
              <th className="py-3 px-4 font-semibold text-center">Status</th>
              <th className="py-3 px-4 font-semibold">Joined</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-surface">
                {/* User avatar and name/email stacked */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-gradient text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {user.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-ink leading-tight">{user.name}</div>
                      <div className="text-[11px] text-muted">{user.email}</div>
                    </div>
                  </div>
                </td>

                {/* Role badge */}
                <td className="py-3 px-4">
                  <Badge variant={user.role === 'ADMIN' ? 'purple' : 'neutral'}>
                    {user.role}
                  </Badge>
                </td>

                {/* Credits */}
                <td className="py-3 px-4 text-right font-medium text-ink">
                  {user.credits}
                </td>

                {/* Status badge: shown on EVERY row */}
                <td className="py-3 px-4 text-center">
                  <Badge variant={user.status === 'Active' ? 'success' : 'danger'} dot>
                    {user.status}
                  </Badge>
                </td>

                {/* Joined */}
                <td className="py-3 px-4 text-muted whitespace-nowrap">
                  {user.joined}
                </td>

                {/* Actions three-dot menu */}
                <td className="py-3 px-4 text-right">
                  <div className="relative inline-block text-left">
                    <button
                      type="button"
                      aria-label="User actions"
                      onClick={() => setActiveMenuId(activeMenuId === user.id ? null : user.id)}
                      className="p-1 rounded-lg text-muted hover:text-ink hover:bg-surface cursor-pointer"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {activeMenuId === user.id && (
                      <div className="absolute right-0 top-7 w-40 bg-card border border-line rounded-xl shadow-lg py-1 z-30">
                        <button
                          type="button"
                          onClick={() => {
                            onViewDetails(user);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-ink hover:bg-surface flex items-center gap-2 cursor-pointer"
                        >
                          <Eye size={14} /> View details
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onAdjustCredits(user);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-ink hover:bg-surface flex items-center gap-2 cursor-pointer"
                        >
                          <Sliders size={14} /> Adjust credits
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onToggleBlock(user);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-ink hover:bg-surface flex items-center gap-2 cursor-pointer"
                        >
                          {user.status === 'Active' ? (
                            <>
                              <UserX size={14} className="text-amber-500" /> Block
                            </>
                          ) : (
                            <>
                              <UserCheck size={14} className="text-emerald-500" /> Unblock
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDelete(user);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-surface flex items-center gap-2 cursor-pointer"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards (md:hidden) */}
      <div className="md:hidden flex flex-col divide-y divide-line/60">
        {users.map((user) => (
          <div key={user.id} className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-gradient text-white text-xs font-bold flex items-center justify-center">
                  {user.initials}
                </div>
                <div>
                  <div className="font-semibold text-ink text-sm">{user.name}</div>
                  <div className="text-xs text-muted">{user.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={user.status === 'Active' ? 'success' : 'danger'} dot>
                  {user.status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted pt-1">
              <span>{user.role} • {user.joined}</span>
              <span className="font-semibold text-ink">{user.credits} credits</span>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-line/40">
              <button
                type="button"
                onClick={() => onViewDetails(user)}
                className="flex-1 h-9 rounded-lg border border-line bg-surface text-ink text-xs font-medium cursor-pointer"
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => onAdjustCredits(user)}
                className="flex-1 h-9 rounded-lg border border-line bg-surface text-ink text-xs font-medium cursor-pointer"
              >
                Credits
              </button>
              <button
                type="button"
                onClick={() => onToggleBlock(user)}
                className="h-9 px-3 rounded-lg border border-line bg-surface text-xs font-medium text-amber-600 cursor-pointer"
              >
                {user.status === 'Active' ? 'Block' : 'Unblock'}
              </button>
              <button
                type="button"
                onClick={() => onDelete(user)}
                className="h-9 px-3 rounded-lg border border-line bg-surface text-xs font-medium text-red-600 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Footer: disabled buttons (TODO: real pagination comes with backend) */}
      <div className="p-4 border-t border-line flex items-center justify-between text-xs text-muted bg-surface/30">
        <span>Page 1 of 1</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="px-3 py-1.5 rounded-lg border border-line bg-card opacity-50 cursor-not-allowed"
          >
            Previous
          </button>
          <button
            type="button"
            disabled
            className="px-3 py-1.5 rounded-lg border border-line bg-card opacity-50 cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
