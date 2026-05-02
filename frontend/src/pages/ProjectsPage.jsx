import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, FolderKanban, Users, CheckSquare, Pencil, Trash2, X, MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

function ProjectModal({ project, onClose, onSave }) {
  const [form, setForm] = useState(project || { name: '', description: '', color: '#6366f1', status: 'active' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (project) {
        const res = await api.put(`/projects/${project.id}`, form);
        onSave(res.data.project, 'updated');
      } else {
        const res = await api.post('/projects', form);
        onSave(res.data.project, 'created');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save project');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-6 animate-slide-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Project Name</label>
            <input className="input" placeholder="My Awesome Project" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-20 resize-none" placeholder="What's this project about?" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm({...form, color: c})}
                  className={clsx('w-7 h-7 rounded-lg transition-all', form.color === c && 'ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110')}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          {project && (
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (project ? 'Save' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | project object

  useEffect(() => {
    api.get('/projects').then(res => setProjects(res.data.projects)).finally(() => setLoading(false));
  }, []);

  const handleSave = (project, action) => {
    if (action === 'created') setProjects(p => [project, ...p]);
    else setProjects(p => p.map(x => x.id === project.id ? project : x));
    setModal(null);
    toast.success(`Project ${action}!`);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project? All tasks will be deleted.')) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects(p => p.filter(x => x.id !== id));
      toast.success('Project deleted');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete'); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 text-sm mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">
          <Plus size={16} /> New Project
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <FolderKanban size={48} className="text-gray-600 mx-auto mb-3" />
          <h3 className="text-gray-400 font-medium mb-1">No projects yet</h3>
          <p className="text-gray-500 text-sm mb-4">Create your first project to get started</p>
          <button onClick={() => setModal('create')} className="btn-primary mx-auto">
            <Plus size={16} /> Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(project => {
            const taskPercent = project.task_count ? Math.round((project.done_count / project.task_count) * 100) : 0;
            return (
              <div key={project.id} className="card p-5 hover:border-white/[0.14] transition-all group">
                {/* Top bar */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: project.color }} />
                    <span className={clsx('badge', project.status === 'active' ? 'status-in_progress' : 'status-done')}>
                      {project.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModal(project)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-gray-200">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(project.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <Link to={`/projects/${project.id}`} className="block">
                  <h3 className="font-semibold text-white mb-1 group-hover:text-brand-300 transition-colors">{project.name}</h3>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">{project.description || 'No description'}</p>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>{project.done_count}/{project.task_count} tasks done</span>
                      <span>{taskPercent}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${taskPercent}%`, background: project.color }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Users size={12} /> {project.member_count}</span>
                    <span className="flex items-center gap-1"><CheckSquare size={12} /> {project.task_count}</span>
                    <span className="text-gray-600">by {project.owner_name}</span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ProjectModal
          project={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}