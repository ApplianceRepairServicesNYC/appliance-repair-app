import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { AuditLog, PaginatedResponse } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [actionFilter, entityFilter, page]);

  const loadLogs = async () => {
    try {
      const data: PaginatedResponse<AuditLog> = await api.getAuditLogs({
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
        page,
        limit: 50,
      });
      setLogs(data.data);
      setMeta(data.meta);
    } catch (error) {
      toast.error('Failed to load audit logs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: 'text-green-600 bg-green-100',
      UPDATE: 'text-blue-600 bg-blue-100',
      DELETE: 'text-red-600 bg-red-100',
      LOGIN: 'text-purple-600 bg-purple-100',
      LOGOUT: 'text-gray-600 bg-gray-100',
      LOCK: 'text-orange-600 bg-orange-100',
      UNLOCK: 'text-teal-600 bg-teal-100',
      QUOTA_RESET: 'text-indigo-600 bg-indigo-100',
      CALL_ROUTED: 'text-cyan-600 bg-cyan-100',
      SERVICE_COMPLETED: 'text-emerald-600 bg-emerald-100',
    };
    return colors[action] || 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const actions = [
    'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
    'LOCK', 'UNLOCK', 'QUOTA_RESET', 'CALL_ROUTED', 'SERVICE_COMPLETED'
  ];

  const entityTypes = ['USER', 'TECHNICIAN', 'CALL', 'SERVICE_RECORD', 'SCHEDULE', 'SYSTEM', 'SYSTEM_CONFIG'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="input w-48"
        >
          <option value="">All Actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
        <select
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
          className="input w-48"
        >
          <option value="">All Entity Types</option>
          {entityTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">{meta.total} total logs</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(log.createdAt), 'MMM d, yyyy h:mm:ss a')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {log.user?.name || 'System'}
                  </div>
                  {log.user?.email && (
                    <div className="text-sm text-gray-500">{log.user.email}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{log.entityType}</div>
                  {log.entityId && (
                    <div className="text-xs text-gray-500 font-mono">{log.entityId.slice(0, 8)}...</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {log.details && (
                    <pre className="text-xs text-gray-600 max-w-xs overflow-hidden">
                      {JSON.stringify(log.details, null, 2).slice(0, 100)}
                      {JSON.stringify(log.details).length > 100 && '...'}
                    </pre>
                  )}
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
