import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

interface DaySchedule {
  day: string;
  dayOfWeek: number;
  schedule: {
    id: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  } | null;
  isAvailable: boolean;
}

export default function TechnicianSchedule() {
  const { user } = useAuth();
  const [weeklySchedule, setWeeklySchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ startTime: '', endTime: '', isAvailable: true });

  const technicianId = user?.technician?.id;

  useEffect(() => {
    if (technicianId) {
      loadSchedule();
    }
  }, [technicianId]);

  const loadSchedule = async () => {
    try {
      const data = await api.getTechnicianWeeklySchedule(technicianId!);
      setWeeklySchedule(data);
    } catch (error) {
      toast.error('Failed to load schedule');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (day: DaySchedule) => {
    setEditing(day.dayOfWeek);
    setEditForm({
      startTime: day.schedule?.startTime || '09:00',
      endTime: day.schedule?.endTime || '17:00',
      isAvailable: day.schedule?.isAvailable ?? true,
    });
  };

  const handleSave = async (dayOfWeek: number) => {
    const day = weeklySchedule.find((d) => d.dayOfWeek === dayOfWeek);
    
    try {
      if (day?.schedule) {
        await api.updateSchedule(day.schedule.id, editForm);
      } else {
        await api.createSchedule({
          technicianId: technicianId!,
          dayOfWeek,
          ...editForm,
        });
      }
      toast.success('Schedule updated');
      setEditing(null);
      loadSchedule();
    } catch (error) {
      toast.error('Failed to update schedule');
      console.error(error);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await api.deleteSchedule(scheduleId);
      toast.success('Schedule deleted');
      loadSchedule();
    } catch (error) {
      toast.error('Failed to delete schedule');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
      </div>

      <div className="card">
        <p className="text-gray-600 mb-6">
          Set your availability for each day of the week. Calls will only be routed to you during your available hours.
        </p>

        <div className="space-y-4">
          {weeklySchedule.map((day) => (
            <div
              key={day.dayOfWeek}
              className={`p-4 rounded-lg border ${
                day.isAvailable ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              {editing === day.dayOfWeek ? (
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <span className="font-medium w-24">{day.day}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                      className="input w-32"
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={editForm.endTime}
                      onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                      className="input w-32"
                    />
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.isAvailable}
                      onChange={(e) => setEditForm({ ...editForm, isAvailable: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm">Available</span>
                  </label>
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => handleSave(day.dayOfWeek)}
                      className="btn btn-primary"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <span className="font-medium w-24">{day.day}</span>
                  {day.schedule ? (
                    <>
                      <span className="text-gray-600">
                        {day.schedule.startTime} - {day.schedule.endTime}
                      </span>
                      <span
                        className={`badge ${
                          day.schedule.isAvailable ? 'badge-success' : 'badge-warning'
                        }`}
                      >
                        {day.schedule.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                      <div className="flex gap-2 ml-auto">
                        <button
                          onClick={() => handleEdit(day)}
                          className="btn btn-secondary text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(day.schedule!.id)}
                          className="btn btn-danger text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-400">No schedule set</span>
                      <button
                        onClick={() => handleEdit(day)}
                        className="btn btn-primary text-sm ml-auto"
                      >
                        Add Schedule
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card bg-blue-50 border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">How Call Routing Works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Calls are only routed to you during your available hours</li>
          <li>• If you're marked as "unavailable" for a day, you won't receive calls</li>
          <li>• If your account is locked, calls won't be routed to you regardless of schedule</li>
          <li>• Technicians with fewer completed calls this week are prioritized for new calls</li>
        </ul>
      </div>
    </div>
  );
}
