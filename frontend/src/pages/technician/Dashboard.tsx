import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { QuotaStatus, ServiceRecord } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [recentRecords, setRecentRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const technicianId = user?.technician?.id;

  useEffect(() => {
    if (technicianId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [technicianId]);

  const loadData = async () => {
    try {
      const [quotaData, recordsData] = await Promise.all([
        api.getTechnicianQuota(technicianId!),
        api.getServiceRecords({ technicianId, limit: 5 }),
      ]);
      setQuota(quotaData);
      setRecentRecords(recordsData.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const isLocked = user?.technician?.status === 'LOCKED';

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SCHEDULED: 'badge badge-info',
      IN_PROGRESS: 'badge badge-warning',
      COMPLETED: 'badge badge-success',
      CANCELLED: 'badge',
    };
    return <span className={styles[status] || 'badge'}>{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user?.name}
        </h1>
        {isLocked && (
          <span className="badge badge-danger text-sm px-3 py-1">
            Account Locked
          </span>
        )}
      </div>

      {isLocked && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-red-800">Account Locked</h3>
            <p className="text-red-700 text-sm">
              Reason: {user?.technician?.lockedReason || 'No reason provided'}
            </p>
            <p className="text-red-600 text-sm mt-1">
              Please contact your administrator to unlock your account.
            </p>
          </div>
        </div>
      )}

      {quota && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Weekly Quota Progress</h2>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">
                  {quota.current} of {quota.required} completed
                </span>
                <span className={quota.onTrack ? 'text-green-600' : 'text-yellow-600'}>
                  {quota.onTrack ? 'On Track' : 'Behind Schedule'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all ${
                    quota.percentage >= 100
                      ? 'bg-green-500'
                      : quota.onTrack
                      ? 'bg-primary-500'
                      : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min(100, quota.percentage)}%` }}
                />
              </div>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">{quota.percentage}%</p>
              <p className="text-sm text-gray-500">Progress</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            {quota.remaining} more service{quota.remaining !== 1 ? 's' : ''} needed this week
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card flex items-center">
          <div className="bg-blue-100 p-3 rounded-lg">
            <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-500">Pending Services</p>
            <p className="text-2xl font-bold text-gray-900">
              {recentRecords.filter((r) => r.status === 'SCHEDULED' || r.status === 'IN_PROGRESS').length}
            </p>
          </div>
        </div>

        <div className="card flex items-center">
          <div className="bg-green-100 p-3 rounded-lg">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-500">Completed This Week</p>
            <p className="text-2xl font-bold text-gray-900">
              {quota?.current || 0}
            </p>
          </div>
        </div>

        <div className="card flex items-center">
          <div className="bg-purple-100 p-3 rounded-lg">
            <ClockIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-gray-500">Weekly Quota</p>
            <p className="text-2xl font-bold text-gray-900">
              {quota?.required || 25}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Service Records</h2>
        {recentRecords.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No service records yet</p>
        ) : (
          <div className="space-y-4">
            {recentRecords.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{record.customerName}</p>
                  <p className="text-sm text-gray-500">
                    {record.applianceType} - {record.issueDescription.slice(0, 50)}
                    {record.issueDescription.length > 50 ? '...' : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {record.scheduledDate
                      ? format(new Date(record.scheduledDate), 'MMM d, yyyy h:mm a')
                      : 'Not scheduled'}
                  </p>
                </div>
                <div>{getStatusBadge(record.status)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
