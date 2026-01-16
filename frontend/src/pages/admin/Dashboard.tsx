import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { DashboardStats } from '../../types';
import toast from 'react-hot-toast';
import {
  UsersIcon,
  PhoneIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (error) {
      toast.error('Failed to load dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuotaReset = async () => {
    if (!confirm('Are you sure you want to reset all quotas?')) return;
    
    try {
      await api.triggerQuotaReset();
      toast.success('Quota reset completed');
      loadDashboard();
    } catch (error) {
      toast.error('Failed to reset quotas');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      name: 'Active Technicians',
      value: stats.technicians.active,
      subtext: `${stats.technicians.availableNow} available now`,
      icon: UsersIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Locked Technicians',
      value: stats.technicians.locked,
      subtext: 'Need attention',
      icon: UsersIcon,
      color: 'bg-red-500',
    },
    {
      name: 'Calls Today',
      value: stats.calls.today,
      subtext: `${stats.calls.thisWeek} this week`,
      icon: PhoneIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Services Completed',
      value: stats.services.completedThisWeek,
      subtext: 'This week',
      icon: CheckCircleIcon,
      color: 'bg-purple-500',
    },
  ];

  const chartData = stats.topTechnicians.map((t) => ({
    name: t.name.split(' ')[0],
    completed: t.completedThisWeek,
    quota: t.quota,
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <button onClick={handleQuotaReset} className="btn btn-secondary">
          Reset Quotas
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.subtext}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Technicians Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Top Technicians This Week</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" fill="#3b82f6" name="Completed" />
                <Bar dataKey="quota" fill="#e5e7eb" name="Quota" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {stats.recentActivity.map((log) => (
              <div key={log.id} className="flex items-start text-sm">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary-500" />
                <div className="ml-3">
                  <p className="text-gray-900">
                    <span className="font-medium">{log.user?.name || 'System'}</span>{' '}
                    <span className="text-gray-500">{log.action.toLowerCase()}</span>{' '}
                    <span className="text-gray-700">{log.entityType.toLowerCase()}</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Call Status Summary */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Call Status Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(stats.calls.byStatus).map(([status, count]) => (
            <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500">{status}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Service Records Summary */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Service Records Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.services.byStatus).map(([status, count]) => (
            <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500">{status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
