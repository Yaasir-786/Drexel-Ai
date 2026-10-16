// Sidebar navigation matching Stitch reference design system exactly
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Folder,
  BarChart2,
  Settings,
  Shield,
  Plus,
  LogOut,
  Coins,
  Trash2,
} from 'lucide-react';
import Logo from '../Logo';
import { useAuth } from '../../context/AuthContext';
import { getSavedChats, deleteChat, createNewChat } from '../../utils/chatStorage';

export default function Sidebar({ onItemClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const [chatList, setChatList] = useState([]);

  useEffect(() => {
    setChatList(getSavedChats());
  }, [location.pathname]);

  const handleNewChat = () => {
    const chat = createNewChat();
    setChatList(getSavedChats());
    if (onItemClick) onItemClick();
    navigate(`/chat/${chat.id}`);
  };

  const handleDeleteChat = (e, chatId) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = deleteChat(chatId);
    setChatList(updated);
    if (location.pathname === `/chat/${chatId}`) {
      navigate('/chat');
    }
  };

  const handleLogout = () => {
    logout();
    if (onItemClick) onItemClick();
    navigate('/login');
  };

  return (
    <aside
      aria-label="Sidebar navigation"
      className="w-[264px] h-full bg-surface border-r border-line flex flex-col justify-between p-4 shrink-0 overflow-y-auto select-none [-webkit-tap-highlight-color:transparent]"
    >
      {/* Top section: Logo, Action Buttons, Navigation */}
      <div className="flex flex-col gap-4">
        {/* Brand Logo */}
        <Link to="/chat" onClick={onItemClick} className="px-1 pt-1 block outline-none">
          <Logo />
        </Link>

        {/* Primary Action Button: + New project matching reference design */}
        <div className="flex flex-col gap-2 pt-1">
          <Link
            to="/projects/new"
            onClick={onItemClick}
            className="w-full h-10 rounded-xl bg-gradient-to-r from-[#1877f2] via-[#2f62eb] to-[#5846f5] text-white font-medium text-sm shadow-[0_2px_8px_rgba(24,119,242,0.25)] hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1877f2]"
          >
            <Plus size={18} className="stroke-[2.5]" />
            <span>New project</span>
          </Link>
        </div>

        {/* Main Navigation List */}
        <nav aria-label="Main menu" className="flex flex-col gap-4 mt-2">
          {/* Workspace Section */}
          <div className="flex flex-col gap-1">
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              WORKSPACE
            </span>

            {/* Projects */}
            <Link
              to="/projects"
              onClick={onItemClick}
              className={`h-10 px-3.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer outline-none select-none ${
                location.pathname.startsWith('/projects')
                  ? 'bg-[#dbeafe] text-[#0066cc] dark:bg-blue-600/20 dark:text-[#60a5fa]'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
              }`}
            >
              <Folder
                size={18}
                className={
                  location.pathname.startsWith('/projects')
                    ? 'text-[#0066cc] dark:text-[#60a5fa]'
                    : 'text-slate-700 dark:text-slate-300'
                }
              />
              <span>Projects</span>
            </Link>

            {/* Usage */}
            <Link
              to="/usage"
              onClick={onItemClick}
              className={`h-10 px-3.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer outline-none select-none ${
                location.pathname === '/usage'
                  ? 'bg-[#dbeafe] text-[#0066cc] dark:bg-blue-600/20 dark:text-[#60a5fa]'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
              }`}
            >
              <BarChart2
                size={18}
                className={
                  location.pathname === '/usage'
                    ? 'text-[#0066cc] dark:text-[#60a5fa]'
                    : 'text-slate-700 dark:text-slate-300'
                }
              />
              <span>Usage</span>
            </Link>
          </div>

          {/* Account Section */}
          <div className="flex flex-col gap-1">
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              ACCOUNT
            </span>

            {/* Settings */}
            <Link
              to="/settings"
              onClick={onItemClick}
              className={`h-10 px-3.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer outline-none select-none ${
                location.pathname === '/settings'
                  ? 'bg-[#dbeafe] text-[#0066cc] dark:bg-blue-600/20 dark:text-[#60a5fa]'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
              }`}
            >
              <Settings
                size={18}
                className={
                  location.pathname === '/settings'
                    ? 'text-[#0066cc] dark:text-[#60a5fa]'
                    : 'text-slate-700 dark:text-slate-300'
                }
              />
              <span>Settings</span>
            </Link>
          </div>

          {/* Admin Section */}
          <div className="flex flex-col gap-1">
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              ADMIN
            </span>

            {/* Admin */}
            <Link
              to="/admin"
              onClick={onItemClick}
              className={`h-10 px-3.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors cursor-pointer outline-none select-none ${
                location.pathname === '/admin'
                  ? 'bg-[#dbeafe] text-[#0066cc] dark:bg-blue-600/20 dark:text-[#60a5fa]'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
              }`}
            >
              <Shield
                size={18}
                className={
                  location.pathname === '/admin'
                    ? 'text-[#0066cc] dark:text-[#60a5fa]'
                    : 'text-slate-700 dark:text-slate-300'
                }
              />
              <span>Admin</span>
            </Link>
          </div>
        </nav>

        {/* Recent Chats Section (if any chats exist) */}
        {chatList.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-2 pt-3 border-t border-line">
            <div className="flex items-center justify-between px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>Recent Chats</span>
              <button
                type="button"
                onClick={handleNewChat}
                className="text-[11px] font-medium text-[#0066cc] hover:underline flex items-center gap-0.5"
                title="Create new chat"
              >
                <Plus size={12} /> New
              </button>
            </div>

            <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-0.5">
              {chatList.map((chat) => {
                const isChatActive =
                  location.pathname === `/chat/${chat.id}` ||
                  (location.pathname === '/chat' && chatList[0]?.id === chat.id);
                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      if (onItemClick) onItemClick();
                      navigate(`/chat/${chat.id}`);
                    }}
                    className={`group h-9 rounded-xl flex items-center justify-between text-xs font-medium cursor-pointer transition-colors outline-none select-none px-3 ${
                      isChatActive
                        ? 'bg-[#dbeafe] text-[#0066cc] dark:bg-blue-600/20 dark:text-[#60a5fa]'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="truncate max-w-[165px]" title={chat.title}>
                      {chat.title}
                    </span>
                    <button
                      type="button"
                      aria-label="Delete chat"
                      onClick={(e) => handleDeleteChat(e, chat.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 hover:bg-surface rounded transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom section: Credits card and user profile */}
      <div className="flex flex-col gap-3 pt-3 border-t border-line mt-3">
        {/* Credits Balance Card */}
        <div className="p-3 bg-card border border-line rounded-xl flex flex-col gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted">Credits balance</span>
            <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <Coins size={14} className="text-[#0099FF]" />
              {user?.credits || '178.6'} credits
            </span>
          </div>

          {/* Thin progress bar */}
          <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden border border-line/60">
            <div className="h-full bg-primary-gradient w-[42%] rounded-full" />
          </div>

          <div className="flex justify-between items-center text-[11px] text-muted">
            <span>42 / 100 used today</span>
            {user?.role === 'ADMIN' && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-bold uppercase tracking-wider">
                Admin
              </span>
            )}
          </div>
        </div>

        {/* User Profile Row */}
        <div className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-primary-gradient flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
              {user?.initials || 'JD'}
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-ink truncate leading-tight">
                {user?.name || 'Jane Doe'}
              </div>
              <div className="text-[11px] text-muted truncate leading-tight">
                {user?.email || 'jane@example.com'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-red-500 hover:bg-card cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0099FF]/30"
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
