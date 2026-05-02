import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users, LogOut,
  User, Menu, X, Zap, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0f13]">
      {/* Sidebar */}
      <aside className={clsx(
        'flex flex-col bg-[#13131a] border-r border-white/[0.06] transition-all duration-300 shrink-0',
        sidebarOpen ? 'w-64' : 'w-16'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]">
          <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center shrink-0">
            <Zap size={16} className="text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <span className="font-bold text-white text-base tracking-tight">TaskFlow</span>
              <div className="text-[10px] text-brand-400 font-mono uppercase tracking-widest">Team Manager</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto p-1 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 transition-colors"
          >
            {sidebarOpen ? <X size={14} /> : <Menu size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx('sidebar-link', isActive && 'active', !sidebarOpen && 'justify-center px-2')}
            >
              <Icon size={18} className="shrink-0" />
              {sidebarOpen && <span>{label}</span>}
              {sidebarOpen && <ChevronRight size={14} className="ml-auto opacity-30" />}
            </NavLink>
          ))}

          {isAdmin && (
            <NavLink
              to="/users"
              className={({ isActive }) => clsx('sidebar-link', isActive && 'active', !sidebarOpen && 'justify-center px-2')}
            >
              <Users size={18} className="shrink-0" />
              {sidebarOpen && <span>Users</span>}
              {sidebarOpen && <ChevronRight size={14} className="ml-auto opacity-30" />}
            </NavLink>
          )}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-white/[0.06]">
          <NavLink
            to="/profile"
            className={({ isActive }) => clsx('sidebar-link', isActive && 'active', !sidebarOpen && 'justify-center px-2', 'mb-1')}
          >
            <img src={user?.avatar} alt={user?.name} className="w-6 h-6 rounded-full shrink-0" />
            {sidebarOpen && (
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-200 truncate">{user?.name}</div>
                <div className={clsx('text-[10px] uppercase tracking-wide font-mono', user?.role === 'admin' ? 'text-brand-400' : 'text-gray-500')}>
                  {user?.role}
                </div>
              </div>
            )}
          </NavLink>
          <button
            onClick={handleLogout}
            className={clsx('sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10', !sidebarOpen && 'justify-center px-2')}
          >
            <LogOut size={16} className="shrink-0" />
            {sidebarOpen && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}