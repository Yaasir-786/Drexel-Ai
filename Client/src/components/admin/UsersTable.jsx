// UsersTable component: desktop table and mobile stacked cards with user action menus
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, UserCheck, UserX, Sliders, Trash2, Eye } from 'lucide-react';
import Badge from '../Badge';

// Action menu rendered in a portal so it is never clipped and never shifts the table
function UserActionMenu({
  user,
  anchorRect,
  onClose,
  onViewDetails,
  onAdjustCredits,
  onToggleBlock,
  onDelete,
}) {
  const menuRef = useRef(null);
  // Start off-screen so the real menu can be measured before it is shown
  const [position, setPosition] = useState({ top: -9999, left: -9999 });

  // Measure the real menu size and place it right next to the trigger button
  useLayoutEffect(() => {
    const updatePosition = () => {
      const menu = menuRef.current;
      if (!menu) return;
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;
      const left = Math.max(
        8,
        Math.min(anchorRect.right - menuWidth, window.innerWidth - menuWidth - 8),
      );
      const spaceBelow = window.innerHeight - anchorRect.bottom - 4;
      const spaceAbove = anchorRect.top - 4;
      let top = anchorRect.bottom + 4;
      if (spaceBelow < menuHeight && spaceAbove >= menuHeight) {
        // Not enough room below but enough above: flip upward
        top = anchorRect.top - menuHeight - 4;
      } else if (spaceBelow < menuHeight) {
        // Stay below but clamp so the menu stays fully inside the viewport
        top = Math.max(8, Math.min(top, window.innerHeight - menuHeight - 8));
      }
      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [anchorRect]);

  // Close on Escape and any scroll (scroll invalidates the captured rect)
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  // Close on outside click (the trigger button handles its own toggle)
  useEffect(() => {
    const onMouseDown = (event) => {
      if (event.target.closest && event.target.closest('[data-user-menu-trigger]')) return;
      if (menuRef.current && !menuRef.current.contains(event.target)) onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [onClose]);

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 100 }}
      className="w-40 bg-card border border-line rounded-xl shadow-lg py-1"
    >
      {/* View details */}
      <button
        type="button"
        onClick={() => {
          onViewDetails(user);
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-xs font-medium text-ink hover:bg-surface flex items-center gap-2 cursor-pointer"
      >
        <Eye size={14} /> View details
      </button>

      {/* Adjust credits */}
      <button
        type="button"
        onClick={() => {
          onAdjustCredits(user);
          onClose();
        }}
        className="w-full px-3 py-2 text-left text-xs font-medium text-ink hover:bg-surface flex items-center gap-2 cursor-pointer"
      >
        <Sliders size={14} /> Adjust credits
      </button>

      {/* Block / unblock (hidden for ADMIN accounts) */}
      {user.role !== 'ADMIN' && (
        <button
          type="button"
          onClick={() => {
            onToggleBlock(user);
            onClose();
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
      )}

      {/* Delete (hidden for ADMIN accounts) */}
      {user.role !== 'ADMIN' && (
        <button
          type="button"
          onClick={() => {
            onDelete(user);
            onClose();
          }}
          className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-surface flex items-center gap-2 cursor-pointer"
        >
          <Trash2 size={14} /> Delete
        </button>
      )}
    </div>,
    document.body
  );
}

export default function UsersTable({
  users,
  page,
  pages,
  onPageChange,
  onViewDetails,
  onAdjustCredits,
  onToggleBlock,
  onDelete,
}) {
  // Open menu state: the row user plus the trigger button rect
  const [menuState, setMenuState] = useState(null);

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

                {/* Actions three-dot trigger (menu itself renders in a portal) */}
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    data-user-menu-trigger
                    aria-label="User actions"
                    onClick={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      setMenuState((prev) =>
                        prev?.user.id === user.id ? null : { user, rect },
                      );
                    }}
                    className="p-1 rounded-lg text-muted hover:text-ink hover:bg-surface cursor-pointer"
                  >
                    <MoreVertical size={16} />
                  </button>
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
              {user.role !== 'ADMIN' && (
                <>
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
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-line flex items-center justify-between text-xs text-muted bg-surface/30">
        <span>Page {page} of {pages}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-line bg-card cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
            className="px-3 py-1.5 rounded-lg border border-line bg-card cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/* Shared portal action menu (desktop rows) */}
      {menuState && (
        <UserActionMenu
          user={menuState.user}
          anchorRect={menuState.rect}
          onClose={() => setMenuState(null)}
          onViewDetails={onViewDetails}
          onAdjustCredits={onAdjustCredits}
          onToggleBlock={onToggleBlock}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
