import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, Filter, X, CheckSquare, AlertCircle } from 'lucide-react';
import { format, isPast } from 'date-fns';
import clsx from 'clsx';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];
const priorityOptions = [
  { value: '', label: 'All Priority' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];
const priorityBadge = { urgent: 'priority-urgent', high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };
const statusBadge = { todo: 'status-todo', in_progress: 'status-in_progress', review: 'status-review', done: 'status-done' };
const statusLabel = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };

function TaskModal({ task, projects, onClose, onSave }) {
  const { user } = useAuth();
  const [form, setForm] = useState(task || {
    title: '', description: '', project_id: projects[0]?.id || '',
    status: 'todo', priority: 'medium', assignee_id: '', due_date: ''
  });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (form.project_id) {
      api.get(`/projects/${form.project_id}`).then(res => setMembers(res.data.members)).catch(() => {});
    }
  }, [form.project_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...form, assignee_id: form.assignee_id || undefined, due_date: form.due_date || undefined };
    try {
      let res;
      if (task) res = await api.put(`/tasks/${task.id}`, payload);
      else res = await api.post('/tasks', payload);
      onSave(res.data.task, task ? 'updated' : 'created');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg p-6 animate-slide-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{task ? 'Edit Task' : 'Create Task'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" placeholder="Task title..." value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-20 resize-none" placeholder="What needs to be done?" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Project *</label>
              <select className="input" value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value, assignee_id: ''})} required>
                <option value="">Select project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Assignee</label>
              <select className="input" value={form.assignee_id} onChange={e => setForm({...form, assignee_id: e.target.value})}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                {statusOptions.slice(1).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                {priorityOptions.slice(1).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (task ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [filters, setFilters] = useState({
    status: '', priority: '',
    project_id: searchParams.get('project_id') || '',
    overdue: '',
    my: searchParams.get('my') || ''
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.project_id) params.set('project_id', filters.project_id);
      if (filters.overdue) params.set('overdue', 'true');

      const endpoint = filters.my ? '/tasks/my' : `/tasks?${params}`;
      const res = await api.get(endpoint);
      setTasks(res.data.tasks);
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { api.get('/projects').then(res => setProjects(res.data.projects)); }, []);

  const handleSave = (task, action) => {
    if (action === 'created') setTasks(t => [task, ...t]);
    else setTasks(t => t.map(x => x.id === task.id ? task : x));
    setModal(null);
    toast.success(`Task ${action}!`);
  };

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(t => t.filter(x => x.id !== id));
      toast.success('Task deleted');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-gray-400 text-sm mt-1">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <select className="input w-auto text-xs" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value, my: ''})}>
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="input w-auto text-xs" value={filters.priority} onChange={e => setFilters({...filters, priority: e.target.value, my: ''})}>
          {priorityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="input w-auto text-xs" value={filters.project_id} onChange={e => setFilters({...filters, project_id: e.target.value, my: ''})}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button
          onClick={() => setFilters(f => ({...f, overdue: f.overdue ? '' : 'true', my: ''}))}
          className={clsx('btn-secondary text-xs', filters.overdue && 'border-red-500/50 text-red-400')}
        >
          <AlertCircle size={13} /> Overdue
        </button>
        <button
          onClick={() => setFilters(f => ({...f, my: f.my ? '' : '1', status: '', priority: '', project_id: '', overdue: ''}))}
          className={clsx('btn-secondary text-xs', filters.my && 'border-brand-500/50 text-brand-400')}
        >
          My Tasks
        </button>
        {(filters.status || filters.priority || filters.project_id || filters.overdue || filters.my) && (
          <button onClick={() => setFilters({ status: '', priority: '', project_id: '', overdue: '', my: '' })} className="btn-secondary text-xs text-gray-500">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20">
          <CheckSquare size={48} className="text-gray-600 mx-auto mb-3" />
          <h3 className="text-gray-400 font-medium mb-1">No tasks found</h3>
          <p className="text-gray-500 text-sm">Try adjusting filters or create a new task</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';
            return (
              <div key={task.id} className="card p-4 flex items-center gap-4 hover:border-white/[0.14] transition-all group">
                <div className="w-1 h-12 rounded-full shrink-0" style={{ background: task.project_color || '#6366f1' }} />
                <div className="flex-1 min-w-0">
                  <Link to={`/tasks/${task.id}`} className="text-sm font-medium text-gray-200 hover:text-white truncate block">{task.title}</Link>
                  <div className="text-xs text-gray-500 mt-0.5">{task.project_name}</div>
                </div>
                <div className="hidden md:flex items-center gap-3 shrink-0">
                  {task.assignee_name && (
                    <div className="flex items-center gap-1.5">
                      <img src={task.assignee_avatar} alt={task.assignee_name} className="w-5 h-5 rounded-full" />
                      <span className="text-xs text-gray-400">{task.assignee_name}</span>
                    </div>
                  )}
                  {task.due_date && (
                    <span className={clsx('text-xs', isOverdue ? 'text-red-400' : 'text-gray-500')}>
                      {isOverdue ? '⚠ ' : ''}{format(new Date(task.due_date), 'MMM d')}
                    </span>
                  )}
                  <span className={clsx('badge', priorityBadge[task.priority])}>{task.priority}</span>
                  <span className={clsx('badge', statusBadge[task.status])}>{statusLabel[task.status]}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setModal(task)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-gray-200 text-xs">Edit</button>
                  <button onClick={() => deleteTask(task.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 text-xs">Del</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <TaskModal
          task={modal === 'create' ? null : modal}
          projects={projects}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}