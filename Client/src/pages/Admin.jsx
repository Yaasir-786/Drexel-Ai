// Admin dashboard page: system stat cards, searchable users table, drawer, and modals
import React, { useState } from 'react';
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
import { useAuth } from '../context/AuthContext';

// MOCK DATA: replace with API data later
const INITIAL_USERS = [
  { id: 'u1', name: 'Alex Rivera', email: 'alex@example.com', initials: 'AR', role: 'ADMIN', credits: '340.5', status: 'Active', joined: 'Oct 01, 2026', projectsCount: 12, tokensUsed: '3.2M' },
  { id: 'u2', name: 'Jane Doe', email: 'jane@example.com', initials: 'JD', role: 'USER', credits: '178.6', status: 'Active', joined: 'Oct 05, 2026', projectsCount: 6, tokensUsed: '1.4M' },
  { id: 'u3', name: 'Michael Chen', email: 'michael@example.com', initials: 'MC', role: 'USER', credits: '84.0', status: 'Active', joined: 'Oct 08, 2026', projectsCount: 3, tokensUsed: '620K' },
  { id: 'u4', name: 'Sarah Connor', email: 'sarah@example.com', initials: 'SC', role: 'USER', credits: '0.0', status: 'Blocked', joined: 'Oct 09, 2026', projectsCount: 1, tokensUsed: '150K' },
  { id: 'u5', name: 'David Kim', email: 'david@example.com', initials: 'DK', role: 'USER', credits: '215.2', status: 'Active', joined: 'Oct 11, 2026', projectsCount: 8, tokensUsed: '2.1M' },
  { id: 'u6', name: 'Elena Rostova', email: 'elena@example.com', initials: 'ER', role: 'ADMIN', credits: '550.0', status: 'Active', joined: 'Oct 12, 2026', projectsCount: 15, tokensUsed: '4.8M' },
];

export default function Admin() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState('');

  // Active user selections
  const [selectedDrawerUser, setSelectedDrawerUser] = useState(null);
  const [adjustModalUser, setAdjustModalUser] = useState(null);
  const [adjustMode, setAdjustMode] = useState('add');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [deleteModalUser, setDeleteModalUser] = useState(null);

  // Filtered users
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateCredits = (userId, newAmount) => {
    if (!isAdmin) return;
    setUsers(users.map((u) => (u.id === userId ? { ...u, credits: newAmount } : u)));
    if (selectedDrawerUser?.id === userId) {
      setSelectedDrawerUser((prev) => ({ ...prev, credits: newAmount }));
    }
  };

  const handleToggleBlock = (user) => {
    const newStatus = user.status === 'Active' ? 'Blocked' : 'Active';
    setUsers(users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)));
    if (selectedDrawerUser?.id === user.id) {
      setSelectedDrawerUser((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteModalUser) return;
    setUsers(users.filter((u) => u.id !== deleteModalUser.id));
    if (selectedDrawerUser?.id === deleteModalUser.id) setSelectedDrawerUser(null);
    setDeleteModalUser(null);
  };

  const handleSaveModalCredits = (e) => {
    e.preventDefault();
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount <= 0 || !adjustModalUser) return;
    let newCredits = parseFloat(adjustModalUser.credits) || 0;
    if (adjustMode === 'add') newCredits += amount;
    else if (adjustMode === 'remove') newCredits = Math.max(0, newCredits - amount);
    else if (adjustMode === 'set') newCredits = Math.max(0, amount);
    handleUpdateCredits(adjustModalUser.id, newCredits.toFixed(1));
    setAdjustModalUser(null);
    setAdjustAmount('');
  };

  return (
    <AppShell title="Admin" description="Manage users and credits">
      <div className="flex flex-col gap-8">
        {/* Section: Overview (8 StatCards in 2 rows of 4) */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total users" value="128" icon={Users} />
            <StatCard label="Blocked users" value="3" icon={UserX} />
            <StatCard label="Admins" value="2" icon={ShieldCheck} />
            <StatCard label="Projects" value="214" icon={FolderKanban} />
            <StatCard label="Chats" value="214" icon={MessageSquare} />
            <StatCard label="Tokens used" value="8.4M" icon={Zap} />
            <StatCard label="Credits used" value="1,420.8" icon={Coins} />
            <StatCard label="Credits used today" value="42" icon={Activity} />
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
                {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
              </span>
            </div>

            {/* Users Table & Mobile Cards */}
            <UsersTable
              users={filteredUsers}
              onViewDetails={(u) => setSelectedDrawerUser(u)}
              onAdjustCredits={(u) => {
                setAdjustModalUser(u);
                setAdjustAmount('');
              }}
              onToggleBlock={handleToggleBlock}
              onDelete={(u) => setDeleteModalUser(u)}
            />
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
