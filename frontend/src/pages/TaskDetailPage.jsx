import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Send, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import clsx from 'clsx';

const statusOptions = ['todo', 'in_progress', 'review', 'done'];
const priorityOptions = ['low', 'medium', 'high', 'urgent'];
const statusLabel = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
const priorityBadge = { urgent: 'priority-urgent', high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };
const statusBadge = { todo: 'status-todo', in_progress: 'status-in_progress', review: 'status-review', done: 'status-done' };

export default function TaskDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/tasks/${id}`)
      .then(res => {
        setTask(res.data.task);
        setComments(res.data.comments);
        return api.get(`/projects/${res.data.task.project_id}`);
      })
      .then(res => setMembers(res.data.members))
      .catch(() => navigate('/tasks'))
      .finally(() => setLoading(false));
  }, [id]);

  const updateField = async (field, value) => {
    setSaving(true);
    try {
      const res = await api.put(`/tasks/${id}`, { [field]: value });
      setTask(res.data.task);
      toast.success('Updated');
    } catch (err) {
      toast.error('Failed to update');
    } finally { setSaving(false); }
  };

  const sendComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSendingComment(true);
    try {
      const res = await api.post(`/tasks/${id}/comments`, { content: comment });
      setComments(c => [...c, res.data.comment]);
      setComment('');
    } catch (err) { toast.error('Failed to send'); } finally { setSendingComment(false); }
  };

  const deleteTask = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      toast.success('Task deleted');
      navigate('/tasks');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!task) return null;

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/tasks" className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-gray-200 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: task.project_color }} />
          <Link to={`/projects/${task.project_id}`} className="text-sm text-gray-400 hover:text-gray-200">{task.project_name}</Link>
        </div>
        <button onClick={deleteTask} className="ml-auto btn-danger">
          <Trash2 size={14} /> Delete
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="card p-5">
            <h1 className="text-xl font-bold text-white mb-2">{task.title}</h1>
            {task.description && <p className="text-gray-400 text-sm leading-relaxed">{task.description}</p>}
            <div className="flex items-center gap-3 mt-4 text-xs text-gray-500">
              <span>Created by <span className="text-gray-300">{task.creator_name}</span></span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
              {saving && <span className="text-brand-400 ml-auto">Saving...</span>}
            </div>
          </div>

          {/* Comments */}
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-4 text-sm">Comments ({comments.length})</h3>
            <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
              {comments.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-6">No comments yet</div>
              ) : comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <img src={c.user_avatar} alt={c.user_name} className="w-7 h-7 rounded-full shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-300">{c.user_name}</span>
                      <span className="text-xs text-gray-600">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                    </div>
                    <div className="text-sm text-gray-300 bg-white/[0.04] rounded-xl px-3 py-2">{c.content}</div>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendComment} className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="Write a comment..."
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              <button type="submit" disabled={sendingComment || !comment.trim()} className="btn-primary px-3">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-4 space-y-4">
            <div>
              <label className="label">Status</label>
              <select className="input" value={task.status} onChange={e => updateField('status', e.target.value)}>
                {statusOptions.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
              </select>
              <div className={clsx('badge mt-2', statusBadge[task.status])}>{statusLabel[task.status]}</div>
            </div>

            <div>
              <label className="label">Priority</label>
              <select className="input" value={task.priority} onChange={e => updateField('priority', e.target.value)}>
                {priorityOptions.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
              <div className={clsx('badge mt-2', priorityBadge[task.priority])}>{task.priority}</div>
            </div>

            <div>
              <label className="label">Assignee</label>
              <select className="input" value={task.assignee_id || ''} onChange={e => updateField('assignee_id', e.target.value || null)}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              {task.assignee_name && (
                <div className="flex items-center gap-2 mt-2">
                  <img src={task.assignee_avatar} alt={task.assignee_name} className="w-5 h-5 rounded-full" />
                  <span className="text-xs text-gray-300">{task.assignee_name}</span>
                </div>
              )}
            </div>

            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                className="input"
                value={task.due_date || ''}
                onChange={e => updateField('due_date', e.target.value || null)}
              />
              {task.due_date && (
                <div className={clsx('text-xs mt-1.5', isOverdue ? 'text-red-400' : 'text-gray-500')}>
                  {isOverdue ? '⚠ Overdue · ' : ''}{format(new Date(task.due_date), 'MMM d, yyyy')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}