
import React, { useState, useEffect } from 'react';
import { hrmsService } from '../services/hrmsService.ts';
import { Holiday, Department, DayType, HolidayScope } from '../types.ts';
import { LoadingButton } from '../components/LoadingButton.tsx';

const Holidays: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<{ date: string; name: string } | null>(null);

  const [formData, setFormData] = useState({
    date: '',
    name: '',
    dayType: 'FULL' as DayType,
    appliesTo: 'ALL' as HolidayScope,
    selectedDepts: [] as string[]
  });

  const loadData = async () => {
    setIsLoading(true);
    const [hList, dList] = await Promise.all([
      hrmsService.getHolidays(),
      hrmsService.getDepartments()
    ]);
    setHolidays((hList || []).sort((a, b) => a.date.localeCompare(b.date)));
    setDepts(dList || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const holidayData = {
      date: formData.date,
      name: formData.name,
      dayType: formData.dayType,
      appliesTo: formData.appliesTo,
      departments: formData.appliesTo === 'ALL' ? [] : formData.selectedDepts,
      createdBy: 'Admin'
    };
    if (editingKey) {
      await hrmsService.updateHoliday(editingKey.date, editingKey.name, {
        ...holidayData,
        newDate: formData.date,
        newName: formData.name
      });
    } else {
      await hrmsService.createHoliday(holidayData);
    }
    setFormData({ date: '', name: '', dayType: 'FULL', appliesTo: 'ALL', selectedDepts: [] });
    setEditingKey(null);
    await loadData();
    setIsSaving(false);
  };

  const handleDelete = async (date: string, name: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    setIsLoading(true);
    try {
      await hrmsService.deleteHoliday(date, name);
      if (editingKey && editingKey.date === date && editingKey.name === name) {
        setEditingKey(null);
        setFormData({ date: '', name: '', dayType: 'FULL', appliesTo: 'ALL', selectedDepts: [] });
      }
      await loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete holiday');
    }
    setIsLoading(false);
  };

  const toggleDept = (id: string) => {
    if (formData.selectedDepts.includes(id)) {
      setFormData({...formData, selectedDepts: formData.selectedDepts.filter(d => d !== id)});
    } else {
      setFormData({...formData, selectedDepts: [...formData.selectedDepts, id]});
    }
  };

  const upcomingHolidays = holidays.filter(h => {
    try {
      return new Date(h.date) >= new Date();
    } catch (e) {
      return true;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holiday Calendar</h1>
          <p className="text-gray-500">Manage public and company holidays.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">{editingKey ? 'Edit Holiday' : 'New Holiday'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Holiday Name</label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Diwali, Foundation Day"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Day Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, dayType: 'FULL'})}
                    className={`py-2 px-4 rounded-xl border text-sm font-medium transition-all ${
                      formData.dayType === 'FULL' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'border-gray-200 text-gray-600'
                    }`}
                  >Full Holiday</button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, dayType: 'HALF'})}
                    className={`py-2 px-4 rounded-xl border text-sm font-medium transition-all ${
                      formData.dayType === 'HALF' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'border-gray-200 text-gray-600'
                    }`}
                  >Half Working</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Applies To</label>
                <select
                  value={formData.appliesTo}
                  onChange={(e) => setFormData({...formData, appliesTo: e.target.value as HolidayScope})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Employees</option>
                  <option value="DEPARTMENT">Specific Departments</option>
                </select>
              </div>
              {formData.appliesTo === 'DEPARTMENT' && (
                <div className="p-3 border border-gray-100 rounded-xl bg-gray-50 space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Select Departments</p>
                  <div className="flex flex-wrap gap-2">
                    {depts.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDept(d.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          formData.selectedDepts.includes(d.id) ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-white text-gray-500 border border-gray-200'
                        }`}
                      >{d.name}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                {editingKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingKey(null);
                      setFormData({ date: '', name: '', dayType: 'FULL', appliesTo: 'ALL', selectedDepts: [] });
                    }}
                    className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <LoadingButton isLoading={isSaving} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 font-bold">
                  {editingKey ? 'Update' : 'Save Holiday'}
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Upcoming Holidays</h2>
          {isLoading ? (
            <p className="text-gray-400">Loading calendar...</p>
          ) : upcomingHolidays.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
              <i className="fas fa-calendar-day text-4xl mb-4 opacity-20"></i>
              <p>No upcoming holidays scheduled.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Holiday Name</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Scope / Applies To</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {upcomingHolidays.map((h) => {
                      const dateObj = new Date(h.date);
                      const formattedDate = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                      const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'long' });

                      return (
                        <tr key={`${h.date}-${h.name}`} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 text-sm">{formattedDate}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{dayName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800 text-sm whitespace-nowrap">
                            {h.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                              h.dayType === 'FULL' 
                                ? 'bg-rose-50 border-rose-100 text-rose-600' 
                                : 'bg-amber-50 border-amber-100 text-amber-600'
                            }`}>
                              {h.dayType === 'FULL' ? 'Full Holiday' : 'Half Working'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              h.appliesTo === 'ALL' 
                                ? 'bg-indigo-50 text-indigo-700' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {h.appliesTo === 'ALL' ? 'Company Wide' : `${h.departments.length} Depts`}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setEditingKey({ date: h.date, name: h.name });
                                setFormData({
                                  date: h.date,
                                  name: h.name,
                                  dayType: h.dayType,
                                  appliesTo: h.appliesTo,
                                  selectedDepts: h.departments || []
                                });
                              }}
                              className="p-1.5 text-indigo-600 hover:text-indigo-950 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <i className="fas fa-edit text-xs"></i>
                            </button>
                            <button
                              onClick={() => handleDelete(h.date, h.name)}
                              className="p-1.5 text-rose-600 hover:text-rose-950 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <i className="fas fa-trash text-xs"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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

export default Holidays;
