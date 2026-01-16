import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Call, PaginatedResponse } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminCalls() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadCalls();
  }, [statusFilter, page]);

  const loadCalls = async () => {
    try {
      const data: PaginatedResponse<Call> = await api.getCalls({
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setCalls(data.data);
      setMeta(data.meta);
    } catch (error) {
      toast.error('Failed to load calls');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'badge badge-warning',
      ROUTED: 'badge badge-info',
      ANSWERED: 'badge badge-success',
      MISSED: 'badge badge-danger',
      COMPLETED: 'badge badge-success',
      CANCELLED: 'badge',
    };
    return <span className={styles[status] || 'badge'}>{status}</span>;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        <h1 className="text-2xl font-bold text-gray-900">Calls</h1>
      </div>

      <div className="flex gap-4 items-center">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="input w-48"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="ROUTED">Routed</option>
          <option value="ANSWERED">Answered</option>
          <option value="MISSED">Missed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <span className="text-sm text-gray-500">{meta.total} total calls</span>
      </div>

      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caller</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {calls.map((call) => (
              <tr key={call.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{call.callerNumber}</div>
                  {call.callerName && (
                    <div className="text-sm text-gray-500">{call.callerName}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {call.technician?.user?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(call.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDuration(call.duration)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(call.createdAt), 'MMM d, yyyy h:mm a')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="btn btn-secondary"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-600">
            Page {page} of {meta.totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === meta.totalPages}
            className="btn btn-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
