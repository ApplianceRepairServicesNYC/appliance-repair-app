import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Technician } from '../../types';
import toast from 'react-hot-toast';
import { PlusIcon, LockClosedIcon, LockOpenIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function AdminTechnicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    loadTechnicians();
  }, [filter]);

  const loadTechnicians = async () => {
    try {
      const data = await api.getTechnicians(filter || undefined);
      setTechnicians(data);
    } catch (error) {
      toast.error('Failed to load technicians');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async (id: string) => {
    const reason = prompt('Enter lock reason:');
    if (!reason) return;

    try {
      await api.lockTechnician(id, reason);
      toast.success('Technician locked');
      loadTechnicians();
    } catch (error) {
      toast.error('Failed to lock technician');
      console.error(error);
    }
  };

  const handleUnlock = async (id: string) => {
    try {
      await api.unlockTechnician(id);
      toast.success('Technician unlocked');
      loadTechnicians();
    } catch (error) {
      toast.error('Failed to unlock technician');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this technician?')) return;

    try {
      await api.deleteTechnician(id);
      toast.success('Technician deleted');
      loadTechnicians();
    } catch (error) {
      toast.error('Failed to delete technician');
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="badge badge-success">Active</span>;
      case 'LOCKED':
        return <span className="badge badge-danger">Locked</span>;
      case 'INACTIVE':
        return <span className="badge badge-warning">Inactive</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Technicians</h1>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Technician
        </button>
      </div>

      <div className="flex gap-4 items-center">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input w-48"
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="LOCKED">Locked</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quota Progress</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {technicians.map((tech) => (
              <tr key={tech.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{tech.user.name}</div>
                  <div className="text-sm text-gray-500">{tech.phone || 'No phone'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {tech.user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(tech.status)}
                  {tech.lockedReason && (
                    <p className="text-xs text-gray-500 mt-1">{tech.lockedReason}</p>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className={`h-2 rounded-full ${
                          tech.currentWeekCompleted >= tech.weeklyQuota
                            ? 'bg-green-500'
                            : 'bg-primary-500'
                        }`}
                        style={{
                          width: `${Math.min(100, (tech.currentWeekCompleted / tech.weeklyQuota) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {tech.currentWeekCompleted}/{tech.weeklyQuota}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    {tech.status === 'LOCKED' ? (
                      <button
                        onClick={() => handleUnlock(tech.id)}
                        className="text-green-600 hover:text-green-800"
                        title="Unlock"
                      >
                        <LockOpenIcon className="h-5 w-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLock(tech.id)}
                        className="text-yellow-600 hover:text-yellow-800"
                        title="Lock"
                      >
                        <LockClosedIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(tech.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTechnicianModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadTechnicians();
          }}
        />
      )}
    </div>
  );
}

function CreateTechnicianModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    weeklyQuota: 25,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.createTechnician(formData);
      toast.success('Technician created');
      onCreated();
    } catch (error) {
      toast.error('Failed to create technician');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create Technician</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Quota</label>
            <input
              type="number"
              value={formData.weeklyQuota}
              onChange={(e) => setFormData({ ...formData, weeklyQuota: parseInt(e.target.value) })}
              className="input"
              min={1}
              max={100}
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
