// Sidebar navigation matching Stitch reference design system exactly
import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Folder,
  BarChart2,
  Settings,
  Shield,
  Plus,
  LogOut,
  Coins,
  Trash2,
  MessageSquarePlus,
  ChevronUp,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Logo from "../Logo";
import { logoutUser } from "../../features/auth/authSlice";
import chatService from "../../services/chatService";
import useUsage from "../../hooks/useUsage";

const navClass = (active) =>
  `w-full h-10 px-3.5 rounded-xl flex items-center gap-3 text-[15px] font-medium cursor-pointer outline-none select-none text-left ${active ? "bg-[#0099FF]/12 text-[#0066cc] dark:bg-blue-600/20 dark:text-[#60a5fa]" : "text-ink hover:bg-card dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60"}`;

export default function Sidebar({ onItemClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.userType === "ADMIN";
  const { data: usage } = useUsage();

  const { data: chatList = [] } = useQuery({
    queryKey: ["chats"],
    queryFn: () => chatService.getChats(user?.token),
    enabled: !!user?.token,
  });

  const deleteChatMutation = useMutation({
    mutationFn: (chatId) => chatService.deleteChat(user?.token, chatId),
    onSuccess: (_, chatId) => {
      queryClient.invalidateQueries({ queryKey: ["chats"] });
      if (location.pathname === `/chat/${chatId}`) {
        navigate("/chat");
      }
    },
  });

  const handleNewChat = () => {
    if (onItemClick) onItemClick();
    navigate("/chat");
  };

  const handleDeleteChat = (e, chatId) => {
    e.preventDefault();
    e.stopPropagation();
    deleteChatMutation.mutate(chatId);
  };

  const handleLogout = () => {
    queryClient.clear();
    localStorage.removeItem("user");
    dispatch(logoutUser());
    if (onItemClick) onItemClick();
    navigate("/landing");
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const close = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target))
        setMenuOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <aside
      aria-label="Sidebar navigation"
      className="w-[320px] h-full bg-surface border-r border-line flex flex-col justify-between p-4 shrink-0 overflow-hidden select-none [-webkit-tap-highlight-color:transparent]">
      {/* Top section: Logo, Navigation, Recent Chats */}
      <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Brand Logo */}
        <Link
          to="/chat"
          onClick={onItemClick}
          className="px-1 pt-1 block outline-none shrink-0">
          <Logo />
        </Link>

        {/* Main Navigation */}
        <nav className="flex flex-col gap-1 pt-1 shrink-0">
          <button
            type="button"
            onClick={handleNewChat}
            className={navClass(false)}>
            <MessageSquarePlus size={18} />
            <span>New chat</span>
          </button>

          <Link
            to="/projects"
            onClick={onItemClick}
            className={navClass(location.pathname.startsWith("/projects"))}>
            <Folder size={18} />
            <span>Projects</span>
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              onClick={onItemClick}
              className={navClass(location.pathname === "/admin")}>
              <Shield size={18} />
              <span>Admin</span>
            </Link>
          )}
        </nav>

        {/* Recent Chats Section */}
        <div className="flex flex-col gap-1.5 mt-2 pt-3 border-t border-line flex-1 min-h-0">
          <div className="flex items-center justify-between px-3 text-xs font-bold uppercase tracking-wider text-muted dark:text-slate-500">
            <span>Recent Chats</span>
            <button
              type="button"
              onClick={handleNewChat}
              className="text-xs font-medium text-[#0066cc] hover:underline flex items-center gap-0.5 cursor-pointer"
              title="Create new chat">
              <Plus size={12} /> New
            </button>
          </div>

          <div className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto pr-0.5">
            {chatList.map((chat) => {
              const isChatActive = location.pathname === `/chat/${chat._id}`;
              return (
                <div
                  key={chat._id}
                  onClick={() => {
                    if (onItemClick) onItemClick();
                    navigate(`/chat/${chat._id}`);
                  }}
                  className={`group h-10 rounded-xl flex items-center justify-between text-[15px] font-medium cursor-pointer transition-colors outline-none select-none px-3 ${
                    isChatActive
                      ? "bg-[#0099FF]/12 text-[#0066cc] dark:bg-blue-600/20 dark:text-[#60a5fa]"
                      : "text-ink hover:bg-card dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60"
                  }`}>
                  <span className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      aria-hidden="true"
                      className={`w-1.5 h-1.5 rounded-full border-[1.5px] shrink-0 transition-colors ${
                        isChatActive
                          ? "border-[#0099FF]"
                          : "border-muted group-hover:border-ink"
                      }`}
                    />
                    <span
                      className="truncate min-w-0 font-dm text-sm"
                      title={chat.title || chat.name || "New chat"}>
                      {chat.title || chat.name || "New chat"}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label="Delete chat"
                    onClick={(e) => handleDeleteChat(e, chat._id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 hover:bg-surface rounded transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom section: account menu */}
      <div
        ref={menuRef}
        className="relative shrink-0 pt-3 border-t border-line mt-3">
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-line rounded-2xl shadow-lg p-2 flex flex-col gap-1 z-50">
            <div className="px-3 py-2 text-xs text-muted truncate">
              {user?.email}
            </div>

            <div className="mx-1 mb-1 p-3 bg-surface border border-line rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted">
                  Credits balance
                </span>
                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Coins size={14} className="text-[#0099FF]" />
                  {user?.credits ?? 0} credits
                </span>
              </div>
              <div className="w-full h-1.5 bg-card rounded-full overflow-hidden border border-line/60">
                <div
                  className="h-full bg-primary-gradient rounded-full"
                  style={{
                    width: `${usage ? Math.min(100, (usage.dailyUsed / usage.dailyLimit) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="text-[11px] text-muted">
                {usage
                  ? `${usage.dailyUsed} / ${usage.dailyLimit} used today`
                  : "Loading..."}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                navigate("/settings");
                setMenuOpen(false);
                if (onItemClick) onItemClick();
              }}
              className={navClass(location.pathname === "/settings")}>
              <Settings size={18} />
              <span>Settings</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigate("/usage");
                setMenuOpen(false);
                if (onItemClick) onItemClick();
              }}
              className={navClass(location.pathname === "/usage")}>
              <BarChart2 size={18} />
              <span>Usage</span>
            </button>
            <div className="h-px bg-line my-1" />
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
              className={navClass(false)}>
              <LogOut size={18} />
              <span>Log out</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Account menu"
          className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-xl hover:bg-card cursor-pointer outline-none">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-primary-gradient flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs">
              {user?.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="truncate text-left">
              <div className="text-sm font-semibold text-ink truncate leading-tight">
                {user?.name}
              </div>
              <div className="text-xs text-muted truncate leading-tight">
                {user?.email}
              </div>
            </div>
          </div>
          <ChevronUp size={16} className="text-muted shrink-0" />
        </button>
      </div>
    </aside>
  );
}
