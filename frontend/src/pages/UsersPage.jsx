import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, Trash2, Crown } from 'lucide-react';
import clsx from 'clsx';

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/users').then(res => setUsers(res.data.users)).finally(() => setLoading(false));
  }, []);

  const toggleRole = async (u) => {
    const newRole = u.role === 'admin' ? 'member' : 'admin';
    if (!confirm(`Change ${u.name}'s role to ${newRole}?`)) return;
    try {
      await api.put(`/dashboard/users/${u.id}/role`, { role: newRole });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x));
      toast.success('Role updated');
    } catch (err) { toast.error('Failed'); }
  };

  const deleteUser = async (u) => {
    if (!confirm(`Permanently delete ${u.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/dashboard/users/${u.id}`);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast.success('User deleted');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users size={22} className="text-brand-400" /> User Management
        </h1>
        <p className="text-gray-400 text-sm mt-1">{users.length} registered users</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['User', 'Role', 'Projects', 'Active Tasks', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-xl" />
                      <div>
                        <div className="text-sm font-medium text-gray-200 flex items-center gap-1">
                          {u.name}
                          {u.id === me.id && <span className="text-xs text-brand-400">(you)</span>}
                        </div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={clsx('badge', u.role === 'admin' ? 'priority-high' : 'status-todo')}>
                      {u.role === 'admin' && <Crown size={10} />}
                      {u.role}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{u.project_count}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{u.task_count}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== me.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleRole(u)}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-yellow-400 transition-colors"
                          title={`Make ${u.role === 'admin' ? 'member' : 'admin'}`}
                        >
                          <Shield size={14} />
                        </button>
                        <button
                          onClick={() => deleteUser(u)}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}