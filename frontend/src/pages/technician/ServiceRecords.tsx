import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { ServiceRecord, PaginatedResponse } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CheckIcon } from '@heroicons/react/24/outline';

export default function TechnicianServiceRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const technicianId = user?.technician?.id;

  useEffect(() => {
    if (technicianId) {
      loadRecords();
    }
  }, [technicianId, statusFilter, page]);

  const loadRecords = async () => {
    try {
      const data: PaginatedResponse<ServiceRecord> = await api.getServiceRecords({
        technicianId,
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setRecords(data.data);
      setMeta(data.meta);
    } catch (error) {
      toast.error('Failed to load service records');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    const diagnosis = prompt('Enter diagnosis:');
    const resolution = prompt('Enter resolution:');
    const laborHours = prompt('Enter labor hours:');

    if (!diagnosis || !resolution) return;

    try {
      await api.completeServiceRecord(id, {
        diagnosis,
        resolution,
        laborHours: laborHours ? parseFloat(laborHours) : undefined,
      });
      toast.success('Service record completed!');
      loadRecords();
    } catch (error) {
      toast.error('Failed to complete service record');
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SCHEDULED: 'badge badge-info',
      IN_PROGRESS: 'badge badge-warning',
      COMPLETED: 'badge badge-success',
      CANCELLED: 'badge',
    };
    return <span className={styles[status] || 'badge'}>{status}</span>;
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
        <h1 className="text-2xl font-bold text-gray-900">My Service Records</h1>
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
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <span className="text-sm text-gray-500">{meta.total} total records</span>
      </div>

      <div className="space-y-4">
        {records.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">No service records found</p>
          </div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{record.customerName}</h3>
                    {getStatusBadge(record.status)}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{record.customerPhone}</p>
                  {record.customerAddress && (
                    <p className="text-sm text-gray-500">{record.customerAddress}</p>
                  )}
                </div>
                {(record.status === 'SCHEDULED' || record.status === 'IN_PROGRESS') && (
                  <button
                    onClick={() => handleComplete(record.id)}
                    className="btn btn-success flex items-center"
                  >
                    <CheckIcon className="h-5 w-5 mr-1" />
                    Complete
                  </button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase">Appliance</p>
                  <p className="text-sm text-gray-900">{record.applianceType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Scheduled Date</p>
                  <p className="text-sm text-gray-900">
                    {record.scheduledDate
                      ? format(new Date(record.scheduledDate), 'MMM d, yyyy h:mm a')
                      : 'Not scheduled'}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs text-gray-400 uppercase">Issue Description</p>
                <p className="text-sm text-gray-900">{record.issueDescription}</p>
              </div>

              {record.status === 'COMPLETED' && (
                <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                  {record.diagnosis && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase">Diagnosis</p>
                      <p className="text-sm text-gray-900">{record.diagnosis}</p>
                    </div>
                  )}
                  {record.resolution && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase">Resolution</p>
                      <p className="text-sm text-gray-900">{record.resolution}</p>
                    </div>
                  )}
                  {record.laborHours && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase">Labor Hours</p>
                      <p className="text-sm text-gray-900">{record.laborHours} hrs</p>
                    </div>
                  )}
                  {record.completedAt && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase">Completed At</p>
                      <p className="text-sm text-gray-900">
                        {format(new Date(record.completedAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {record.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-400 uppercase">Notes</p>
                  <p className="text-sm text-gray-700">{record.notes}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

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
