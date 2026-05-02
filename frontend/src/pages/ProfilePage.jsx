import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { User, Lock, Save, Shield } from 'lucide-react';
import clsx from 'clsx';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setLoading(true);
    try {
      const payload = {};
      if (form.name !== user.name) payload.name = form.name;
      if (form.password) payload.password = form.password;
      if (Object.keys(payload).length === 0) return toast('Nothing to update');

      const res = await api.put('/auth/profile', payload);
      updateUser(res.data.user);
      setForm(f => ({ ...f, password: '', confirmPassword: '' }));
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">Profile</h1>

      <div className="card p-6 mb-6">
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-white/[0.06]">
          <img src={user?.avatar} alt={user?.name} className="w-16 h-16 rounded-2xl" />
          <div>
            <h2 className="text-lg font-semibold text-white">{user?.name}</h2>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <div className={clsx('badge mt-1.5', user?.role === 'admin' ? 'priority-high' : 'status-todo')}>
              <Shield size={10} /> {user?.role}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Display Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                className="input pl-10"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4">
            <p className="text-xs text-gray-500 mb-3">Leave blank to keep current password</p>
            <div className="space-y-3">
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    className="input pl-10"
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password"
                    className="input pl-10"
                    placeholder="Repeat new password"
                    value={form.confirmPassword}
                    onChange={e => setForm({...form, confirmPassword: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={14} /> Save Changes</>}
          </button>
        </form>
      </div>
    </div>
  );
}