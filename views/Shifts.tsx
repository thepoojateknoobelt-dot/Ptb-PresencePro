
import React, { useState, useEffect } from 'react';
import { hrmsService } from '../services/hrmsService.ts';
import { Shift } from '../types.ts';
import { LoadingButton } from '../components/LoadingButton.tsx';

const Shifts: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    checkIn: '09:30',
    checkOut: '18:30',
    remark: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    const data = await hrmsService.getShifts();
    setShifts(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    if (editingId) {
      await hrmsService.updateShift(editingId, formData);
    } else {
      await hrmsService.createShift({
        id: formData.name,
        ...formData
      });
    }
    setFormData({ name: '', checkIn: '09:30', checkOut: '18:30', remark: '' });
    setEditingId(null);
    await loadData();
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    setIsLoading(true);
    try {
      await hrmsService.deleteShift(id);
      if (editingId === id) {
        setEditingId(null);
        setFormData({ name: '', checkIn: '09:30', checkOut: '18:30', remark: '' });
      }
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete shift');
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Shifts</h1>
          <p className="text-gray-500">Define operational hours for your workforce.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm sticky top-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6">{editingId ? 'Edit Shift' : 'Create New Shift'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Shift Name</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Day Shift, Night"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Check-In</label>
                  <input
                    type="time"
                    required
                    value={formData.checkIn}
                    onChange={(e) => setFormData({...formData, checkIn: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Check-Out</label>
                  <input
                    type="time"
                    required
                    value={formData.checkOut}
                    onChange={(e) => setFormData({...formData, checkOut: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Remark</label>
                <textarea
                  rows={2}
                  value={formData.remark || ''}
                  onChange={(e) => setFormData({...formData, remark: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setFormData({ name: '', checkIn: '09:30', checkOut: '18:30', remark: '' });
                    }}
                    className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <LoadingButton isLoading={isSaving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 font-bold">
                  {editingId ? 'Update' : 'Create Shift'}
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Configured Shifts</h2>
          {isLoading ? (
            <p className="text-gray-400">Loading shifts...</p>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Shift Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Check-In</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Check-Out</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Remarks</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {shifts.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800 text-sm flex items-center gap-2">
                          <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                            <i className="fas fa-clock text-xs"></i>
                          </div>
                          {s.name}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-700 text-sm">{s.checkIn}</td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-700 text-sm">{s.checkOut}</td>
                        <td className="px-6 py-4 text-slate-500 italic font-medium">
                          {s.remark ? `"${s.remark}"` : '—'}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setEditingId(s.id);
                              setFormData({
                                name: s.name,
                                checkIn: s.checkIn,
                                checkOut: s.checkOut,
                                remark: s.remark || ''
                              });
                            }}
                            className="p-1.5 text-indigo-600 hover:text-indigo-950 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <i className="fas fa-edit text-xs"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="p-1.5 text-rose-600 hover:text-rose-950 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <i className="fas fa-trash text-xs"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Shifts;
