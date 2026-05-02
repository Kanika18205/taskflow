import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Plus, UserPlus, X, Trash2, Crown, User } from 'lucide-react';
import clsx from 'clsx';

const statusCols = [
  { key: 'todo', label: 'To Do', cls: 'status-todo' },
  { key: 'in_progress', label: 'In Progress', cls: 'status-in_progress' },
  { key: 'review', label: 'Review', cls: 'status-review' },
  { key: 'done', label: 'Done', cls: 'status-done' },
];

const priorityBadge = { urgent: 'priority-urgent', high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };

function TaskCard({ task, onDelete }) {
  return (
    <Link to={`/tasks/${task.id}`} className="block card p-3 hover:border-white/20 transition-all group mb-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-200 group-hover:text-white font-medium truncate">{task.title}</div>
          {task.assignee_name && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <img src={task.assignee_avatar} alt={task.assignee_name} className="w-4 h-4 rounded-full" />
              <span className="text-xs text-gray-500">{task.assignee_name}</span>
            </div>
          )}
        </div>
        <span className={clsx('badge shrink-0', priorityBadge[task.priority])}>{task.priority}</span>
      </div>
      {task.due_date && (
        <div className="text-xs text-gray-500 mt-2">Due {new Date(task.due_date).toLocaleDateString()}</div>
      )}
    </Link>
  );
}

function AddMemberModal({ projectId, onClose, onAdd }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post(`/projects/${projectId}/members`, { email, role });
      onAdd(res.data.user);
      toast.success('Member added!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 animate-slide-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Add Member</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Email Address</label>
            <input type="email" className="input" placeholder="member@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Project Role</label>
            <select className="input" value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [tab, setTab] = useState('board'); // board | members

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/tasks?project_id=${id}`)
    ]).then(([projRes, taskRes]) => {
      setProject(projRes.data.project);
      setMembers(projRes.data.members);
      setTasks(taskRes.data.tasks);
    }).catch(() => navigate('/projects')).finally(() => setLoading(false));
  }, [id]);

  const canManage = isAdmin || members.find(m => m.id === user?.id)?.project_role === 'admin';

  const removeMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      setMembers(m => m.filter(x => x.id !== userId));
      toast.success('Member removed');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  const tasksByStatus = statusCols.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8 max-w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/projects" className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-gray-200 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full" style={{ background: project?.color }} />
          <h1 className="text-xl font-bold text-white">{project?.name}</h1>
          <span className={clsx('badge', project?.status === 'active' ? 'status-in_progress' : 'status-done')}>{project?.status}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setTab(tab === 'board' ? 'members' : 'board')} className="btn-secondary">
            {tab === 'board' ? <><User size={14} /> Members ({members.length})</> : 'Board View'}
          </button>
          {canManage && (
            <Link to={`/tasks?project_id=${id}`} className="btn-primary">
              <Plus size={16} /> Add Task
            </Link>
          )}
        </div>
      </div>

      {project?.description && (
        <p className="text-gray-400 text-sm mb-6 ml-12">{project.description}</p>
      )}

      {tab === 'board' ? (
        /* Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {statusCols.map(col => (
            <div key={col.key} className="bg-white/[0.02] rounded-2xl p-3 border border-white/[0.05]">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={clsx('badge', col.cls)}>{col.label}</span>
                </div>
                <span className="text-xs text-gray-500 font-mono">{tasksByStatus[col.key]?.length || 0}</span>
              </div>
              {tasksByStatus[col.key]?.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
              {tasksByStatus[col.key]?.length === 0 && (
                <div className="text-center py-8 text-gray-600 text-xs">No tasks</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Members panel */
        <div className="max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Team Members</h2>
            {canManage && (
              <button onClick={() => setShowAddMember(true)} className="btn-primary">
                <UserPlus size={14} /> Invite
              </button>
            )}
          </div>
          <div className="space-y-2">
            {members.map(m => (
              <div key={m.id} className="card p-4 flex items-center gap-3">
                <img src={m.avatar} alt={m.name} className="w-9 h-9 rounded-xl" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-200">{m.name}</div>
                  <div className="text-xs text-gray-500">{m.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {m.project_role === 'admin' && <Crown size={13} className="text-yellow-400" />}
                  <span className={clsx('badge', m.project_role === 'admin' ? 'priority-high' : 'status-todo')}>{m.project_role}</span>
                  {canManage && m.id !== user.id && (
                    <button onClick={() => removeMember(m.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddMember && (
        <AddMemberModal
          projectId={id}
          onClose={() => setShowAddMember(false)}
          onAdd={(u) => setMembers(m => [...m, { ...u, project_role: 'member' }])}
        />
      )}
    </div>
  );
}