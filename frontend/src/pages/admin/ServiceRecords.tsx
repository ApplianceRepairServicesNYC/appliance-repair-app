import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { ServiceRecord, Technician, PaginatedResponse } from '../../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function AdminServiceRecords() {
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [techFilter, setTechFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadRecords();
    loadTechnicians();
  }, [statusFilter, techFilter, page]);

  const loadRecords = async () => {
    try {
      const data: PaginatedResponse<ServiceRecord> = await api.getServiceRecords({
        status: statusFilter || undefined,
        technicianId: techFilter || undefined,
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

  const loadTechnicians = async () => {
    try {
      const data = await api.getTechnicians();
      setTechnicians(data);
    } catch (error) {
      console.error(error);
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
      toast.success('Service record completed');
      loadRecords();
    } catch (error) {
      toast.error('Failed to complete service record');
      console.error(error);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this service record?')) return;

    try {
      await api.cancelServiceRecord(id);
      toast.success('Service record cancelled');
      loadRecords();
    } catch (error) {
      toast.error('Failed to cancel service record');
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
        <h1 className="text-2xl font-bold text-gray-900">Service Records</h1>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Service Record
        </button>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
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
        <select
          value={techFilter}
          onChange={(e) => {
            setTechFilter(e.target.value);
            setPage(1);
          }}
          className="input w-48"
        >
          <option value="">All Technicians</option>
          {technicians.map((tech) => (
            <option key={tech.id} value={tech.id}>
              {tech.user.name}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">{meta.total} total records</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appliance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technician</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((record) => (
              <tr key={record.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{record.customerName}</div>
                  <div className="text-sm text-gray-500">{record.customerPhone}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{record.applianceType}</div>
                  <div className="text-sm text-gray-500 truncate max-w-xs">
                    {record.issueDescription}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.technician?.user?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(record.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.scheduledDate
                    ? format(new Date(record.scheduledDate), 'MMM d, yyyy')
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {record.status !== 'COMPLETED' && record.status !== 'CANCELLED' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleComplete(record.id)}
                        className="text-green-600 hover:text-green-800"
                        title="Complete"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleCancel(record.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Cancel"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
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

      {/* Create Modal */}
      {showCreateModal && (
        <CreateServiceRecordModal
          technicians={technicians}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadRecords();
          }}
        />
      )}
    </div>
  );
}

function CreateServiceRecordModal({
  technicians,
  onClose,
  onCreated,
}: {
  technicians: Technician[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    technicianId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    applianceType: '',
    issueDescription: '',
    scheduledDate: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.createServiceRecord({
        ...formData,
        scheduledDate: formData.scheduledDate || undefined,
      });
      toast.success('Service record created');
      onCreated();
    } catch (error) {
      toast.error('Failed to create service record');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Create Service Record</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
            <select
              value={formData.technicianId}
              onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
              className="input"
              required
            >
              <option value="">Select Technician</option>
              {technicians
                .filter((t) => t.status === 'ACTIVE')
                .map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.user.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Address</label>
            <input
              type="text"
              value={formData.customerAddress}
              onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Appliance Type</label>
            <input
              type="text"
              value={formData.applianceType}
              onChange={(e) => setFormData({ ...formData, applianceType: e.target.value })}
              className="input"
              required
              placeholder="e.g., Refrigerator, Dishwasher"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Description</label>
            <textarea
              value={formData.issueDescription}
              onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
              className="input"
              rows={3}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
            <input
              type="datetime-local"
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows={2}
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
