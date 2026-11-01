// Admin dashboard page: system stat cards, searchable users table, drawer, and modals
import React, { useEffect, useState } from 'react';
import {
  Users,
  UserX,
  ShieldCheck,
  FolderKanban,
  MessageSquare,
  Zap,
  Coins,
  Activity,
  Search,
} from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import StatCard from '../components/StatCard';
import UsersTable from '../components/admin/UsersTable';
import UserDrawer from '../components/admin/UserDrawer';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import adminService from '../services/adminService';
import { logoutUser } from '../features/auth/authSlice';

// Format tokens as 1.2K / 8.4M
const formatTokens = (value) => {
  const n = Number(value) || 0;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
};

// Format credits with max 2 decimals
const formatCredits = (value) => `${Math.round((Number(value) || 0) * 100) / 100}`;

export default function Admin() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = user?.token;

  // Search, pagination and selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedDrawerUser, setSelectedDrawerUser] = useState(null);
  const [adjustModalUser, setAdjustModalUser] = useState(null);
  const [adjustMode, setAdjustMode] = useState('add');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [deleteModalUser, setDeleteModalUser] = useState(null);

  // Debounce the search input and reset to page 1 when it changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Overview stats
  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminService.getStats(token),
    enabled: !!token,
  });
  const stats = statsQuery.data;

  // Users list (server side search + pagination)
  const usersQuery = useQuery({
    queryKey: ['admin-users', page, debouncedSearch],
    queryFn: () => adminService.getUsers(token, { page, search: debouncedSearch }),
    enabled: !!token,
    placeholderData: keepPreviousData,
  });

  // Map API users to the table shape
  const users = (usersQuery.data?.users || []).map((u) => ({
    id: u._id,
    name: u.name,
    email: u.email,
    initials: (u.name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join(''),
    role: u.userType,
    credits: formatCredits(u.credits),
    status: u.isActive ? 'Active' : 'Blocked',
    joined: new Date(u.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    tokensUsed: formatTokens(u.totalTokensUsed),
  }));
  const total = usersQuery.data?.total || 0;
  const pages = usersQuery.data?.pages || 1;

  // Log out on auth errors from the admin API
  const handleError = (error) => {
    toast.error(error.response?.data?.message || 'Something went wrong');
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('user');
      dispatch(logoutUser());
      navigate('/login');
    }
  };

  // Refresh the shared admin data after a mutation
  const invalidateAdminData = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    queryClient.invalidateQueries({ queryKey: ['admin-user'] });
  };

  // Adjust credits mutation
  const creditsMutation = useMutation({
    mutationFn: ({ userId, payload }) => adminService.updateCredits(token, userId, payload),
    onSuccess: () => {
      toast.success('Credits updated');
      invalidateAdminData();
      setAdjustModalUser(null);
      setAdjustAmount('');
    },
    onError: handleError,
  });

  // Block / unblock mutation
  const blockMutation = useMutation({
    mutationFn: ({ userId, isActive }) => adminService.updateBlock(token, userId, isActive),
    onSuccess: (_, variables) => {
      toast.success(variables.isActive ? 'User unblocked' : 'User blocked');
      invalidateAdminData();
    },
    onError: handleError,
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (userId) => adminService.deleteUser(token, userId),
    onSuccess: () => {
      toast.success('User deleted');
      invalidateAdminData();
      if (selectedDrawerUser?.id === deleteModalUser?.id) setSelectedDrawerUser(null);
      setDeleteModalUser(null);
    },
    onError: handleError,
  });

  // Adjust credits from the drawer or modal
  const handleUpdateCredits = (userId, payload) => {
    creditsMutation.mutate({ userId, payload });
  };

  // Block or unblock a user
  const handleToggleBlock = (target) => {
    blockMutation.mutate({ userId: target.id, isActive: target.status !== 'Active' });
  };

  // Validate and submit the adjust credits modal
  const handleSaveModalCredits = (e) => {
    e.preventDefault();
    if (!adjustModalUser) return;
    const amount = parseFloat(adjustAmount);
    const valid = !isNaN(amount) && (adjustMode === 'set' ? amount >= 0 : amount > 0);
    if (!valid) {
      toast.error('Enter a valid amount');
      return;
    }
    handleUpdateCredits(adjustModalUser.id, { action: adjustMode, amount });
  };

  // Confirm user deletion
  const handleConfirmDelete = () => {
    if (!deleteModalUser) return;
    deleteMutation.mutate(deleteModalUser.id);
  };

  return (
    <AppShell title="Admin" description="Manage users and credits">
      <div className="flex flex-col gap-8">
        {/* Section: Overview (8 StatCards in 2 rows of 4) */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total users" value={stats ? stats.users : '...'} icon={Users} />
            <StatCard label="Blocked users" value={stats ? stats.blockedUsers : '...'} icon={UserX} />
            <StatCard label="Admins" value={stats ? stats.admins : '...'} icon={ShieldCheck} />
            <StatCard label="Projects" value={stats ? stats.projects : '...'} icon={FolderKanban} />
            <StatCard label="Chats" value={stats ? stats.chats : '...'} icon={MessageSquare} />
            <StatCard label="Tokens used" value={formatTokens(stats?.totalTokensUsed)} icon={Zap} />
            <StatCard label="Credits used" value={formatCredits(stats?.totalCreditsUsed)} icon={Coins} />
            <StatCard label="Credits used today" value={formatCredits(stats?.creditsUsedToday)} icon={Activity} />
          </div>
        </section>

        {/* Section: Users */}
        <section className="flex flex-col gap-3">
          <div className="bg-card border border-line rounded-2xl shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-line flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search size={18} className="absolute left-3.5 top-3 text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-xl border border-line bg-surface text-xs text-ink outline-none focus:ring-2 focus:ring-[#0099FF]"
                />
              </div>
              <span className="text-xs text-muted font-medium self-end sm:self-center">
                {total} {total === 1 ? 'user' : 'users'}
              </span>
            </div>

            {/* Users Table & Mobile Cards */}
            {usersQuery.isLoading ? (
              <div className="p-8 text-center text-xs text-muted">Loading users...</div>
            ) : usersQuery.isError ? (
              <div className="p-8 text-center text-xs text-muted">Could not load users</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted">No users found</div>
            ) : (
              <UsersTable
                users={users}
                page={page}
                pages={pages}
                onPageChange={setPage}
                onViewDetails={(u) => setSelectedDrawerUser(u)}
                onAdjustCredits={(u) => {
                  setAdjustModalUser(u);
                  setAdjustAmount('');
                }}
                onToggleBlock={handleToggleBlock}
                onDelete={(u) => setDeleteModalUser(u)}
              />
            )}
          </div>
        </section>
      </div>

      {/* User Drawer */}
      <UserDrawer
        user={selectedDrawerUser}
        isOpen={!!selectedDrawerUser}
        onClose={() => setSelectedDrawerUser(null)}
        onUpdateCredits={handleUpdateCredits}
        onToggleBlock={handleToggleBlock}
        onDeleteUser={(u) => {
          setSelectedDrawerUser(null);
          setDeleteModalUser(u);
        }}
      />

      {/* Adjust Credits Modal */}
      <Modal
        isOpen={!!adjustModalUser}
        onClose={() => setAdjustModalUser(null)}
        title="Adjust credits"
        description={adjustModalUser ? `Change credit balance for ${adjustModalUser.name}` : ''}
      >
        <form onSubmit={handleSaveModalCredits} className="flex flex-col gap-4 mt-2">
          <div className="flex rounded-xl bg-surface border border-line p-1">
            {['add', 'remove', 'set'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAdjustMode(mode)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize cursor-pointer ${
                  adjustMode === mode ? 'bg-primary-gradient text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <input
            type="number"
            step="any"
            min="0"
            placeholder="Amount"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-line bg-card text-ink text-sm outline-none focus:ring-2 focus:ring-[#0099FF]"
            autoFocus
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAdjustModalUser(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={!!deleteModalUser}
        onClose={() => setDeleteModalUser(null)}
        title="Delete this user?"
        description="This permanently deletes the user, their projects and chats."
      >
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={() => setDeleteModalUser(null)} className="min-w-[100px]">
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete} className="min-w-[100px]">
            Delete
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}
