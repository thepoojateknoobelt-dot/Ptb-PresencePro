
import React, { useState, useEffect } from 'react';
import { hrmsService } from '../services/hrmsService.ts';
import { Department } from '../types.ts';
import { LoadingButton } from '../components/LoadingButton.tsx';

const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [otBuffer, setOtBuffer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const data = await hrmsService.getDepartments();
    setDepartments(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setIsSaving(true);
    if (editingId) {
      await hrmsService.updateDepartment(editingId, { name, otBufferEnabled: otBuffer });
    } else {
      await hrmsService.createDepartment({ id: name, name, otBufferEnabled: otBuffer });
    }
    setName('');
    setOtBuffer(false);
    setEditingId(null);
    await loadData();
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    setIsLoading(true);
    try {
      await hrmsService.deleteDepartment(id);
      if (editingId === id) {
        setEditingId(null);
        setName('');
        setOtBuffer(false);
      }
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete department');
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500">Configure company departments and OT rules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-6">{editingId ? 'Edit Department' : 'Create New Department'}</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Department Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sales, Production"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
              <input
                type="checkbox"
                id="ot"
                checked={otBuffer}
                onChange={(e) => setOtBuffer(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 rounded"
              />
              <label htmlFor="ot" className="text-sm">
                <span className="block font-semibold text-gray-800">15-Min OT Buffer</span>
                <span className="text-gray-500 text-xs">If enabled, OT count starts 15 minutes after shift end.</span>
              </label>
            </div>
            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setName('');
                    setOtBuffer(false);
                  }}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              )}
              <LoadingButton isLoading={isSaving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 font-bold">
                {editingId ? 'Update' : 'Create Department'}
              </LoadingButton>
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Active Departments</h2>
          {isLoading ? (
            <p className="text-gray-400">Loading departments...</p>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Department Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Overtime Policy</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {departments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800 text-sm">{dept.name}</td>
                        <td className="px-6 py-4 text-slate-600">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            dept.otBufferEnabled 
                              ? 'bg-amber-50 border-amber-100 text-amber-600' 
                              : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                          }`}>
                            {dept.otBufferEnabled ? '15-min OT buffer' : 'Direct Overtime'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[9px]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Permanent
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setEditingId(dept.id);
                              setName(dept.name);
                              setOtBuffer(dept.otBufferEnabled);
                            }}
                            className="p-1.5 text-indigo-600 hover:text-indigo-950 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <i className="fas fa-edit text-xs"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(dept.id)}
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

export default Departments;
