import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import {
  CheckSquare, FolderKanban, AlertTriangle, Zap,
  TrendingUp, Clock, ArrowRight, Circle
} from 'lucide-react';
import clsx from 'clsx';

const priorityColors = {
  urgent: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-green-400'
};
const statusLabel = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };

function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colorMap = {
    brand: 'bg-brand-600/20 text-brand-400',
    green: 'bg-green-500/20 text-green-400',
    red: 'bg-red-500/20 text-red-400',
    orange: 'bg-orange-500/20 text-orange-400',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', colorMap[color])}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
        <div className="text-sm text-gray-400">{label}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats').then(res => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { taskStats, projectStats, myTasks, recentTasks = [], overdueTasksList = [] } = data || {};

  const progress = taskStats?.total ? Math.round((taskStats.done / taskStats.total) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
          <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Here's what's happening with your projects today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={CheckSquare} label="Total Tasks" value={taskStats?.total} color="brand" />
        <StatCard icon={FolderKanban} label="Active Projects" value={projectStats?.active} sub={`${projectStats?.total} total`} color="green" />
        <StatCard icon={AlertTriangle} label="Overdue" value={taskStats?.overdue} color="red" />
        <StatCard icon={Zap} label="Urgent Tasks" value={taskStats?.urgent} color="orange" />
      </div>

      {/* Progress + My tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Overall progress */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-brand-400" />
            <span className="text-sm font-medium text-gray-300">Overall Progress</span>
          </div>
          <div className="relative">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>Completion rate</span>
              <span className="text-brand-400 font-medium">{progress}%</span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-600 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { label: 'To Do', val: taskStats?.todo, cls: 'status-todo' },
              { label: 'In Progress', val: taskStats?.in_progress, cls: 'status-in_progress' },
              { label: 'Review', val: taskStats?.review, cls: 'status-review' },
              { label: 'Done', val: taskStats?.done, cls: 'status-done' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03]">
                <span className="text-xs text-gray-400">{s.label}</span>
                <span className={clsx('badge', s.cls)}>{s.val ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* My tasks */}
        <div className="card p-5 col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-brand-400" />
              <span className="text-sm font-medium text-gray-300">My Tasks</span>
            </div>
            <Link to="/tasks?my=true" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex gap-4 mb-3 text-xs text-gray-500">
            <span><span className="text-white font-medium">{myTasks?.total ?? 0}</span> assigned</span>
            <span><span className="text-red-400 font-medium">{myTasks?.overdue ?? 0}</span> overdue</span>
          </div>
          {recentTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No recent activity</div>
          ) : (
            <div className="space-y-2">
              {recentTasks.slice(0, 5).map(task => (
                <Link key={task.id} to={`/tasks/${task.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: task.project_color || '#6366f1' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200 truncate group-hover:text-white">{task.title}</div>
                    <div className="text-xs text-gray-500">{task.project_name}</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={clsx('badge', `status-${task.status}`)}>{statusLabel[task.status]}</span>
                    {task.due_date && (
                      <span className={clsx('text-xs', isPast(new Date(task.due_date)) && task.status !== 'done' ? 'text-red-400' : 'text-gray-500')}>
                        {format(new Date(task.due_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue tasks */}
      {overdueTasksList.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-sm font-medium text-gray-300">Overdue Tasks</span>
            <span className="badge priority-urgent ml-1">{overdueTasksList.length}</span>
          </div>
          <div className="space-y-2">
            {overdueTasksList.map(task => (
              <Link key={task.id} to={`/tasks/${task.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200 truncate">{task.title}</div>
                  <div className="text-xs text-gray-500">{task.project_name} • {task.assignee_name || 'Unassigned'}</div>
                </div>
                <div className="text-xs text-red-400 shrink-0">
                  {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}