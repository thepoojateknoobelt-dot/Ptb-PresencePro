
import React, { useState, useEffect, useMemo } from 'react';
import { hrmsService } from '../services/hrmsService.ts';
import { Employee, Department, Shift, WeekOffType, AttendanceRecord, Holiday } from '../types.ts';
import { LoadingButton } from '../components/LoadingButton.tsx';

const Registry: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // Employee Details & Attendance Calendar States
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState<Employee | null>(null);
  const [detailsYear, setDetailsYear] = useState(new Date().getFullYear());
  const [detailsMonth, setDetailsMonth] = useState(new Date().getMonth());
  const [detailsAttendance, setDetailsAttendance] = useState<AttendanceRecord[]>([]);
  const [detailsHolidays, setDetailsHolidays] = useState<Holiday[]>([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [selectedDateInCalendar, setSelectedDateInCalendar] = useState<string | null>(null);

  // Fetch Attendance data for the selected employee and month
  useEffect(() => {
    if (selectedEmployeeForDetails) {
      const fetchDetailsData = async () => {
        setIsDetailsLoading(true);
        try {
          const yymm = `${detailsYear.toString().slice(-2)}${(detailsMonth + 1).toString().padStart(2, '0')}`;
          const [attList, holList] = await Promise.all([
            hrmsService.getMonthlyAttendanceForEmployee(yymm, selectedEmployeeForDetails.id),
            hrmsService.getHolidays()
          ]);
          setDetailsAttendance(attList || []);
          setDetailsHolidays(holList || []);
          
          // Set default selected date: today if it's the current month/year, otherwise the 1st
          const today = new Date();
          const isCurrentMonthYear = today.getFullYear() === detailsYear && today.getMonth() === detailsMonth;
          const defaultDay = isCurrentMonthYear ? today.getDate() : 1;
          const defaultDateStr = `${detailsYear}-${(detailsMonth + 1).toString().padStart(2, '0')}-${defaultDay.toString().padStart(2, '0')}`;
          setSelectedDateInCalendar(defaultDateStr);
        } catch (err) {
          console.error("Failed to load employee details attendance", err);
        } finally {
          setIsDetailsLoading(false);
        }
      };
      fetchDetailsData();
    }
  }, [selectedEmployeeForDetails, detailsYear, detailsMonth]);

  const handlePrevMonth = () => {
    if (detailsMonth === 0) {
      setDetailsMonth(11);
      setDetailsYear(prev => prev - 1);
    } else {
      setDetailsMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (detailsMonth === 11) {
      setDetailsMonth(0);
      setDetailsYear(prev => prev + 1);
    } else {
      setDetailsMonth(prev => prev + 1);
    }
  };

  const monthlyMetrics = useMemo(() => {
    let present = 0;
    let late = 0;
    let halfDay = 0;
    let absent = 0;
    let weekOffs = 0;
    let hols = 0;

    if (!selectedEmployeeForDetails) return { present, late, halfDay, absent, weekOffs, hols };

    const daysInMonth = new Date(detailsYear, detailsMonth + 1, 0).getDate();
    const today = new Date();

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${detailsYear}-${(detailsMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const cellDate = new Date(dateStr + 'T00:00:00');
      
      // Don't count metrics for future days
      if (cellDate > today) continue;

      const record = detailsAttendance.find(r => r.date === dateStr);
      
      // 1. Holiday
      const holiday = detailsHolidays.find(h => h.date === dateStr && (h.appliesTo === 'ALL' || h.departments.includes(selectedEmployeeForDetails.department)));
      if (holiday) {
        hols++;
        continue;
      }

      // 2. Week Off
      const dayOfWeek = cellDate.getDay();
      if (dayOfWeek === 0) {
        if (selectedEmployeeForDetails.weekOff === 'SUNDAY_OFF') {
          weekOffs++;
          continue;
        } else if (selectedEmployeeForDetails.weekOff === 'SUNDAY_HALF' && !record) {
          weekOffs++;
          continue;
        }
      }

      // 3. Attendance record
      if (record) {
        const status = (record.status || record.metrics?.status || '').toUpperCase();
        if (status === 'PRESENT' || status === 'ON_TIME') {
          present++;
        } else if (status === 'LATE') {
          present++;
          late++;
        } else if (status === 'HALF_DAY') {
          halfDay++;
        } else if (status === 'ABSENT') {
          absent++;
        } else if (record.checkInLocal) {
          present++;
        }
      } else {
        absent++;
      }
    }

    return { present, late, halfDay, absent, weekOffs, hols };
  }, [detailsAttendance, detailsHolidays, detailsYear, detailsMonth, selectedEmployeeForDetails]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterShift, setFilterShift] = useState('ALL');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    department: '',
    shift: '',
    monthlySalary: '',
    weekOff: 'SUNDAY_OFF' as WeekOffType,
    imageUrl: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [empList, dList, sList] = await Promise.all([
        hrmsService.getEmployees(),
        hrmsService.getDepartments(),
        hrmsService.getShifts()
      ]);
      setEmployees(empList || []);
      setDepts(dList || []);
      setShifts(sList || []);
    } catch (err) {
      console.error("Failed to load registry records", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddClick = () => {
    setEditingEmp(null);
    setFormData({
      name: '',
      phone: '',
      department: depts[0]?.id || '',
      shift: shifts[0]?.id || '',
      monthlySalary: '',
      weekOff: 'SUNDAY_OFF',
      imageUrl: ''
    });
    setShowModal(true);
  };

  const handleEditClick = (emp: Employee) => {
    setEditingEmp(emp);
    setFormData({
      name: emp.name,
      phone: emp.phone,
      department: emp.department,
      shift: emp.shift,
      monthlySalary: emp.monthlySalary.toString(),
      weekOff: emp.weekOff,
      imageUrl: emp.imageUrl || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert("Name and Phone contact are mandatory.");
      return;
    }

    setIsSaving(true);
    try {
      const salaryNum = parseFloat(formData.monthlySalary.replace(/,/g, '')) || 0;
      
      if (editingEmp) {
        await hrmsService.updateEmployee(editingEmp.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          department: formData.department,
          monthlySalary: salaryNum,
          weekOff: formData.weekOff,
          imageUrl: formData.imageUrl.trim()
        });
      } else {
        const finalId = await hrmsService.getNextEmployeeId();
        await hrmsService.createEmployee({
          id: finalId,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          department: formData.department,
          shift: formData.shift,
          monthlySalary: salaryNum,
          weekOff: formData.weekOff,
          status: 'active',
          imageUrl: formData.imageUrl.trim()
        });
      }
      await loadData();
      setShowModal(false);
    } catch (err: any) {
      console.error("Save Error:", err);
      alert(`Operation Failed: ${err.message || "Unknown server error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("ARE YOU SURE? This will deactivate the employee record permanently.")) {
      setIsSaving(true);
      try {
        await hrmsService.deleteEmployee(id);
        await loadData();
      } catch (err: any) {
        alert("Deletion aborted: " + err.message);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        emp.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = filterDept === 'ALL' || emp.department === filterDept;
      const matchesShift = filterShift === 'ALL' || emp.shift === filterShift;
      return matchesSearch && matchesDept && matchesShift;
    });
  }, [employees, searchTerm, filterDept, filterShift]);

  return (
    <>
      <div className="space-y-8 p-2 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase leading-none">
            Workforce Registry
          </h1>
          <p className="text-slate-500 font-medium mt-2">Manage personnel profiles, compensation, and shifts.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input 
              type="text"
              placeholder="Search name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 w-full lg:w-80 font-bold shadow-sm transition-all"
            />
          </div>
          <button
            onClick={handleAddClick}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 flex items-center gap-3 font-black uppercase text-xs tracking-widest transition-all hover:-translate-y-1 active:scale-95 whitespace-nowrap"
          >
            <i className="fas fa-plus"></i>
            <span>Register Staff</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2 px-3 border-r border-slate-100">
          <i className="fas fa-filter text-indigo-400 text-xs"></i>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filters</span>
        </div>
        
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="px-4 py-2.5 rounded-xl border-2 border-slate-50 outline-none focus:border-indigo-500 text-xs font-black uppercase tracking-wider bg-slate-50 cursor-pointer"
        >
          <option value="ALL">All Departments</option>
          {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select
          value={filterShift}
          onChange={(e) => setFilterShift(e.target.value)}
          className="px-4 py-2.5 rounded-xl border-2 border-slate-50 outline-none focus:border-indigo-500 text-xs font-black uppercase tracking-wider bg-slate-50 cursor-pointer"
        >
          <option value="ALL">All Shifts</option>
          {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-4">
          <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-4 py-2 rounded-full uppercase tracking-widest">
            {filteredEmployees.length} active records
          </span>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Employee Identity</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Work Assignment</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Compensation</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Rest Cycle</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="mt-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Syncing Registry...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <i className="fas fa-users-slash text-6xl mb-4"></i>
                      <p className="text-xl font-black uppercase italic">No matching records found</p>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.map((emp) => (
                <tr 
                  key={emp.id} 
                  onClick={() => {
                    setSelectedEmployeeForDetails(emp);
                    const now = new Date();
                    setDetailsYear(now.getFullYear());
                    setDetailsMonth(now.getMonth());
                  }}
                  className="hover:bg-indigo-50/10 transition-all group cursor-pointer"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        {emp.imageUrl ? (
                          <img src={emp.imageUrl} className="w-14 h-14 rounded-2xl object-cover shadow-lg border-2 border-white ring-2 ring-slate-100" alt="" />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-400 shadow-sm border-2 border-white ring-2 ring-slate-100">
                            <i className="fas fa-user text-xl"></i>
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-lg tracking-tight group-hover:text-indigo-600 transition-colors">{emp.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono font-black text-indigo-500 uppercase">{emp.id}</span>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span className="text-[10px] font-bold text-slate-400">{emp.phone}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <i className="fas fa-building text-slate-300 text-[10px]"></i>
                        <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider">{emp.department}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <i className="fas fa-clock text-indigo-300 text-[10px]"></i>
                        <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">{emp.shift}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900">₹{emp.monthlySalary.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Monthly</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 ${
                      emp.weekOff === 'SUNDAY_OFF' ? 'bg-rose-50 border-rose-100 text-rose-600' : 
                      emp.weekOff === 'SUNDAY_HALF' ? 'bg-amber-50 border-amber-100 text-amber-600' : 
                      'bg-emerald-50 border-emerald-100 text-emerald-600'
                    }`}>
                      {emp.weekOff.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditClick(emp); }} 
                        className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                      >
                        <i className="fas fa-pen-to-square text-sm"></i>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(emp.id); }} 
                        className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                      >
                        <i className="fas fa-trash-can text-sm"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {/* Enrollment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090d16]/90 backdrop-blur-lg animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border-[6px] border-slate-50">
            <div className="px-12 py-10 bg-slate-50 border-b border-slate-100 flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight italic">
                  {editingEmp ? 'Profile Revision' : 'Staff Enrollment'}
                </h2>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-1.5">Personnel Intelligence Node</p>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="w-12 h-12 rounded-full hover:bg-white flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all shadow-sm relative z-10"
              >
                <i className="fas fa-times text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-12 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Personal Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b-2 border-slate-50 pb-2">
                  <i className="fas fa-user-circle text-indigo-600"></i>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Personal Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Legal Full Name</label>
                    <input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold text-lg bg-slate-50/30"
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Mobile Contact</label>
                    <input
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+91"
                      className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-mono font-bold bg-slate-50/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Identity Image (URL)</label>
                    <input
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                      placeholder="https://..."
                      className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-mono text-xs bg-slate-50/30"
                    />
                  </div>
                </div>
              </div>

              {/* Work Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b-2 border-slate-50 pb-2">
                  <i className="fas fa-briefcase text-indigo-600"></i>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Work & Contract</h3>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Department</label>
                    <select
                      required
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold bg-slate-50/30 appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Choose Dept...</option>
                      {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Assigned Shift</label>
                    <select
                      disabled={!!editingEmp}
                      required
                      value={formData.shift}
                      onChange={(e) => setFormData({...formData, shift: e.target.value})}
                      className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold bg-slate-50/30 appearance-none disabled:opacity-50 cursor-pointer"
                    >
                      <option value="" disabled>Choose Shift...</option>
                      {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Monthly Base Pay</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300">₹</span>
                      <input
                        required
                        type="number"
                        value={formData.monthlySalary}
                        onChange={(e) => setFormData({...formData, monthlySalary: e.target.value})}
                        className="w-full pl-11 pr-6 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold bg-slate-50/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Weekly Rest Cycle</label>
                    <select
                      required
                      value={formData.weekOff}
                      onChange={(e) => setFormData({...formData, weekOff: e.target.value as WeekOffType})}
                      className="w-full px-6 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold bg-slate-50/30 appearance-none cursor-pointer"
                    >
                      <option value="SUNDAY_OFF">SUNDAY_OFF</option>
                      <option value="SUNDAY_WORKING">SUNDAY_WORKING</option>
                      <option value="SUNDAY_HALF">SUNDAY_HALF</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-8 flex justify-end gap-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-10 py-5 rounded-2xl text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
                >
                  Abort
                </button>
                <LoadingButton 
                  isLoading={isSaving} 
                  type="submit" 
                  className="px-12 py-5 bg-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-100 hover:bg-indigo-700 font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95"
                >
                  {editingEmp ? 'Update Profile' : 'Execute Enrollment'}
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Details & Attendance Calendar Modal */}
      {selectedEmployeeForDetails && (() => {
        // Prepare Calendar logic parameters
        const daysInMonth = new Date(detailsYear, detailsMonth + 1, 0).getDate();
        const firstDay = new Date(detailsYear, detailsMonth, 1).getDay(); // Sunday is 0
        const monthsList = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];

        const handleExportCSV = () => {
          let csvContent = "Date,Day,Arrival (In),Departure (Out),Duration,Status,Late Minutes,OT Minutes,Penalty Minutes\n";
          for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${detailsYear}-${(detailsMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const record = detailsAttendance.find(r => r.date === dateStr);
            const statusInfo = getDayStatus(dateStr, record);
            const cellDateObj = new Date(dateStr + 'T00:00:00');
            const dayName = cellDateObj.toLocaleDateString('en-IN', { weekday: 'short' });
            
            const dateVal = `${d.toString().padStart(2, '0')} ${monthsList[detailsMonth].slice(0, 3)}`;
            const arrivalVal = record?.checkInLocal || "—";
            const departureVal = record?.checkOutLocal ? record.checkOutLocal : record?.checkInLocal ? "Active" : "—";
            const durationVal = record?.metrics?.workingMinutes ? formatMinutes(record.metrics.workingMinutes) : "—";
            const statusVal = statusInfo.label;
            const lateVal = record?.metrics?.lateMinutes || 0;
            const otVal = record?.metrics?.otMinutes || 0;
            const penaltyVal = record?.metrics?.penaltyMinutes || 0;

            csvContent += `"${dateVal}","${dayName}","${arrivalVal}","${departureVal}","${durationVal}","${statusVal}",${lateVal},${otVal},${penaltyVal}\n`;
          }
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.setAttribute("download", `Attendance_${selectedEmployeeForDetails.name}_${monthsList[detailsMonth]}_${detailsYear}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        const handlePrint = () => {
          const printWindow = window.open('', '_blank');
          if (!printWindow) {
            alert("Please allow popups to print the report");
            return;
          }
          
          let tableRows = '';
          for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${detailsYear}-${(detailsMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const record = detailsAttendance.find(r => r.date === dateStr);
            const statusInfo = getDayStatus(dateStr, record);
            const cellDateObj = new Date(dateStr + 'T00:00:00');
            const dayName = cellDateObj.toLocaleDateString('en-IN', { weekday: 'short' });
            
            const dateVal = `${d.toString().padStart(2, '0')} ${monthsList[detailsMonth].slice(0, 3)} (${dayName})`;
            const arrivalVal = record?.checkInLocal || "—";
            const departureVal = record?.checkOutLocal ? record.checkOutLocal : record?.checkInLocal ? "Active" : "—";
            const durationVal = record?.metrics?.workingMinutes ? formatMinutes(record.metrics.workingMinutes) : "—";
            const statusVal = statusInfo.label;
            
            let auditVal = '—';
            if (record?.metrics) {
              const auditParts = [];
              if (record.metrics.lateMinutes > 0) auditParts.push(`Late: ${record.metrics.lateMinutes}m`);
              if (record.metrics.otMinutes > 0) auditParts.push(`OT: ${record.metrics.otMinutes}m`);
              if (record.metrics.penaltyMinutes > 0) auditParts.push(`Penalty: ${record.metrics.penaltyMinutes}`);
              if (auditParts.length > 0) auditVal = auditParts.join(', ');
              else auditVal = 'Standard Run';
            }

            tableRows += `
              <tr>
                <td>${dateVal}</td>
                <td>${arrivalVal}</td>
                <td>${departureVal}</td>
                <td>${durationVal}</td>
                <td>${statusVal}</td>
                <td>${auditVal}</td>
              </tr>
            `;
          }

          printWindow.document.write(`
            <html>
              <head>
                <title>Attendance Report - ${selectedEmployeeForDetails.name}</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #333; padding: 20px; }
                  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
                  .profile-details { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
                  .profile-label { font-weight: bold; color: #64748b; font-size: 11px; text-transform: uppercase; }
                  .profile-val { font-size: 14px; font-weight: bold; color: #1e293b; }
                  .metrics-summary { display: flex; gap: 15px; margin-bottom: 20px; }
                  .metric-card { flex: 1; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: center; }
                  .metric-title { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
                  .metric-value { font-size: 20px; font-weight: bold; color: #0f172a; }
                  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                  th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; font-size: 12px; }
                  th { background-color: #f1f5f9; font-weight: bold; color: #475569; }
                  tr:nth-child(even) { background-color: #f8fafc; }
                  @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                  }
                </style>
              </head>
              <body>
                <div class="header">
                  <div>
                    <h1 style="margin: 0; font-size: 22px;">POOJA TEKNO BELT</h1>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Workforce Attendance Ledger</p>
                  </div>
                  <div style="text-align: right;">
                    <h2 style="margin: 0; font-size: 18px; color: #4f46e5;">Monthly Report</h2>
                    <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold;">${monthsList[detailsMonth]} ${detailsYear}</p>
                  </div>
                </div>

                <div class="profile-details">
                  <div>
                    <span class="profile-label">Employee Name</span>
                    <div class="profile-val">${selectedEmployeeForDetails.name}</div>
                  </div>
                  <div>
                    <span class="profile-label">Employee ID</span>
                    <div class="profile-val">${selectedEmployeeForDetails.id}</div>
                  </div>
                  <div>
                    <span class="profile-label">Department</span>
                    <div class="profile-val">${selectedEmployeeForDetails.department}</div>
                  </div>
                  <div>
                    <span class="profile-label">Shift Schedule</span>
                    <div class="profile-val">${selectedEmployeeForDetails.shift}</div>
                  </div>
                  <div>
                    <span class="profile-label">Rest Cycle</span>
                    <div class="profile-val">${selectedEmployeeForDetails.weekOff.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <span class="profile-label">Compensation</span>
                    <div class="profile-val">₹${selectedEmployeeForDetails.monthlySalary.toLocaleString('en-IN')}/month</div>
                  </div>
                </div>

                <div class="metrics-summary">
                  <div class="metric-card">
                    <div class="metric-title">Present Days</div>
                    <div class="metric-value" style="color: #16a34a;">${monthlyMetrics.present}</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-title">Absent Days</div>
                    <div class="metric-value" style="color: #dc2626;">${monthlyMetrics.absent}</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-title">Late Count</div>
                    <div class="metric-value" style="color: #d97706;">${monthlyMetrics.late}</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-title">Offs / Holidays</div>
                    <div class="metric-value" style="color: #4f46e5;">${monthlyMetrics.weekOffs + monthlyMetrics.hols}</div>
                  </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Date / Day</th>
                      <th>Arrival (In)</th>
                      <th>Departure (Out)</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Audit Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tableRows}
                  </tbody>
                </table>

                <div style="margin-top: 50px; display: flex; justify-content: space-between;" class="no-print">
                  <button onclick="window.print();" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;">Print Report</button>
                  <button onclick="window.close();" style="background: #e2e8f0; color: #475569; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;">Close Window</button>
                </div>
                
                <script>
                  window.onload = function() {
                    window.print();
                  }
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        };
        
        // Generate grid items
        const gridCells: { isPadding: boolean; day: number; dateString: string }[] = [];
        for (let i = 0; i < firstDay; i++) {
          gridCells.push({ isPadding: true, day: 0, dateString: "" });
        }
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${detailsYear}-${(detailsMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
          gridCells.push({ isPadding: false, day: d, dateString: dateStr });
        }

        // Selected Date record finding
        const selectedDayRecord = selectedDateInCalendar ? detailsAttendance.find(r => r.date === selectedDateInCalendar) : undefined;
        
        // Status resolver helper
        const getDayStatus = (cellDateStr: string, record: AttendanceRecord | undefined) => {
          const holiday = detailsHolidays.find(h => h.date === cellDateStr && (h.appliesTo === 'ALL' || h.departments.includes(selectedEmployeeForDetails.department)));
          if (holiday) {
            return { type: 'HOLIDAY', label: `Holiday: ${holiday.name}`, color: 'bg-indigo-50 border-indigo-100 text-indigo-700 font-bold' };
          }

          const cellDateObj = new Date(cellDateStr + 'T00:00:00');
          const dayOfWeek = cellDateObj.getDay();
          if (dayOfWeek === 0) {
            if (selectedEmployeeForDetails.weekOff === 'SUNDAY_OFF') {
              return { type: 'WEEK_OFF', label: 'Sunday Week-Off', color: 'bg-slate-100 border-slate-200 text-slate-500' };
            } else if (selectedEmployeeForDetails.weekOff === 'SUNDAY_HALF' && !record) {
              return { type: 'WEEK_OFF', label: 'Sunday Half-Day Off', color: 'bg-amber-50 border-amber-100 text-amber-600' };
            }
          }

          if (record) {
            const status = (record.status || record.metrics?.status || '').toUpperCase();
            if (status === 'PRESENT' || status === 'ON_TIME') {
              return { type: 'PRESENT', label: 'Present', color: 'bg-emerald-50 border-emerald-100 text-emerald-600 font-bold' };
            }
            if (status === 'LATE') {
              return { type: 'LATE', label: 'Late', color: 'bg-amber-50 border-amber-200 text-amber-700 font-bold' };
            }
            if (status === 'HALF_DAY') {
              return { type: 'HALF_DAY', label: 'Half Day', color: 'bg-orange-50 border-orange-200 text-orange-700 font-bold' };
            }
            if (status === 'ABSENT') {
              return { type: 'ABSENT', label: 'Absent', color: 'bg-rose-50 border-rose-100 text-rose-600 font-bold' };
            }
            if (record.checkInLocal) {
              return { type: 'PRESENT', label: 'Present', color: 'bg-emerald-50 border-emerald-100 text-emerald-600 font-bold' };
            }
          }

          const todayDate = new Date();
          todayDate.setHours(0,0,0,0);
          if (cellDateObj < todayDate) {
            return { type: 'ABSENT', label: 'Absent (No Record)', color: 'bg-rose-50 border-rose-100 text-rose-600 font-bold' };
          }

          return { type: 'EMPTY', label: 'Scheduled', color: 'bg-white border-slate-100 text-slate-400 font-medium' };
        };

        const formatMinutes = (mins: number | undefined) => {
          if (mins === undefined || mins <= 0) return '0 hrs';
          const hrs = Math.floor(mins / 60);
          const remainingMins = mins % 60;
          return remainingMins > 0 ? `${hrs} hrs ${remainingMins} mins` : `${hrs} hrs`;
        };

        const getInitials = (name: string) => {
          return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090d16]/90 backdrop-blur-lg animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border-[6px] border-slate-50 flex flex-col md:flex-row max-h-[85vh]">
              
              {/* Left Side: Profile Information & Monthly Summary */}
              <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-100 p-8 flex flex-col justify-between overflow-y-auto relative">
                <div>
                  {/* Desktop Edit Button */}
                  <button
                    onClick={() => {
                      const emp = selectedEmployeeForDetails;
                      setSelectedEmployeeForDetails(null);
                      handleEditClick(emp);
                    }}
                    className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white items-center justify-center transition-all border border-slate-200/80 shadow-sm hidden md:flex"
                    title="Edit Employee Profile"
                  >
                    <i className="fas fa-edit text-xs"></i>
                  </button>

                  <div className="flex justify-between items-center md:hidden mb-6">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Personnel Profile</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const emp = selectedEmployeeForDetails;
                          setSelectedEmployeeForDetails(null);
                          handleEditClick(emp);
                        }}
                        className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-all"
                        title="Edit Employee Profile"
                      >
                        <i className="fas fa-edit text-xs"></i>
                      </button>
                      <button 
                        onClick={() => setSelectedEmployeeForDetails(null)} 
                        className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-all"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                  
                  {/* Avatar / Photo */}
                  <div className="flex flex-col items-center">
                    {selectedEmployeeForDetails.imageUrl ? (
                      <img 
                        src={selectedEmployeeForDetails.imageUrl} 
                        className="w-28 h-28 rounded-3xl object-cover border-4 border-white shadow-xl ring-4 ring-indigo-50" 
                        alt={selectedEmployeeForDetails.name} 
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-3xl font-black shadow-xl border-4 border-white ring-4 ring-indigo-50">
                        {getInitials(selectedEmployeeForDetails.name)}
                      </div>
                    )}
                    <h2 className="text-xl font-black text-slate-900 text-center mt-4 uppercase tracking-tight italic">
                      {selectedEmployeeForDetails.name}
                    </h2>
                    <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider mt-2.5">
                      {selectedEmployeeForDetails.id}
                    </span>
                  </div>

                  {/* Info List */}
                  <div className="mt-6 space-y-3.5 border-t border-slate-200/60 pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 text-xs">
                        <i className="fas fa-phone"></i>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Contact</p>
                        <p className="text-xs font-bold text-slate-700">{selectedEmployeeForDetails.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 text-xs">
                        <i className="fas fa-building"></i>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Department</p>
                        <p className="text-xs font-bold text-slate-700">{selectedEmployeeForDetails.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 text-xs">
                        <i className="fas fa-clock"></i>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Shift Schedule</p>
                        <p className="text-xs font-bold text-slate-700">{selectedEmployeeForDetails.shift}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 text-xs">
                        <i className="fas fa-indian-rupee-sign"></i>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Compensation</p>
                        <p className="text-xs font-bold text-slate-700">₹{selectedEmployeeForDetails.monthlySalary.toLocaleString('en-IN')} / month</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 text-xs">
                        <i className="fas fa-calendar-xmark"></i>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Rest Cycle</p>
                        <p className="text-xs font-bold text-slate-700">{selectedEmployeeForDetails.weekOff.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Summary Stats */}
                <div className="mt-6 border-t border-slate-200/60 pt-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                    Summary ({monthsList[detailsMonth]} {detailsYear})
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50 flex flex-col items-center">
                      <span className="text-xs font-black text-emerald-600">{monthlyMetrics.present}</span>
                      <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">Present</span>
                    </div>
                    <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/50 flex flex-col items-center">
                      <span className="text-xs font-black text-rose-600">{monthlyMetrics.absent}</span>
                      <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider mt-0.5">Absent</span>
                    </div>
                    <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/50 flex flex-col items-center">
                      <span className="text-xs font-black text-amber-600">{monthlyMetrics.late}</span>
                      <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mt-0.5">Late</span>
                    </div>
                    <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/50 flex flex-col items-center">
                      <span className="text-xs font-black text-indigo-600">{monthlyMetrics.weekOffs + monthlyMetrics.hols}</span>
                      <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">Offs/Hols</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Month Selector & Attendance Table */}
              <div className="w-full md:w-2/3 p-8 flex flex-col justify-between overflow-hidden min-h-[60vh] max-h-[85vh]">
                
                {/* Header Controls */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">
                      Attendance Record
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                      Monthly Sheet View
                    </p>
                  </div>
                  
                  {/* Month Picker controls */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handlePrevMonth} 
                      className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all border border-slate-100 shadow-sm"
                    >
                      <i className="fas fa-chevron-left text-xs"></i>
                    </button>
                    
                    <select 
                      value={detailsMonth} 
                      onChange={(e) => setDetailsMonth(parseInt(e.target.value))}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-black uppercase cursor-pointer"
                    >
                      {monthsList.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
                    </select>

                    <select 
                      value={detailsYear} 
                      onChange={(e) => setDetailsYear(parseInt(e.target.value))}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-black uppercase cursor-pointer"
                    >
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <button 
                      onClick={handleNextMonth} 
                      className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all border border-slate-100 shadow-sm"
                    >
                      <i className="fas fa-chevron-right text-xs"></i>
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></div>

                    <button 
                      onClick={handleExportCSV} 
                      className="h-9 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white flex items-center gap-1.5 transition-all border border-emerald-100 shadow-sm font-black uppercase text-[10px] tracking-wider"
                      title="Export to CSV"
                    >
                      <i className="fas fa-file-csv text-xs"></i>
                      <span>CSV</span>
                    </button>

                    <button 
                      onClick={handlePrint} 
                      className="h-9 px-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white flex items-center gap-1.5 transition-all border border-indigo-100 shadow-sm font-black uppercase text-[10px] tracking-wider"
                      title="Print Monthly Report"
                    >
                      <i className="fas fa-print text-xs"></i>
                      <span>Print</span>
                    </button>

                    {/* Close button */}
                    <button 
                      onClick={() => setSelectedEmployeeForDetails(null)} 
                      className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all border border-slate-100 shadow-sm ml-2 hidden md:flex"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>

                {/* Attendance Table */}
                {isDetailsLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center h-60">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-3 text-[9px] text-slate-400 font-bold uppercase tracking-widest">Fetching Logs...</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto mt-6 border border-slate-100 rounded-3xl shadow-inner max-h-[58vh] custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md">
                          <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">Date / Day</th>
                          <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">Arrival (In)</th>
                          <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">Departure (Out)</th>
                          <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">Duration</th>
                          <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                          <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">Audit Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {Array.from({ length: daysInMonth }, (_, idx) => {
                          const d = idx + 1;
                          const dateStr = `${detailsYear}-${(detailsMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                          const record = detailsAttendance.find(r => r.date === dateStr);
                          const statusInfo = getDayStatus(dateStr, record);
                          
                          const cellDateObj = new Date(dateStr + 'T00:00:00');
                          const dayName = cellDateObj.toLocaleDateString('en-IN', { weekday: 'short' });
                          const formattedDayStr = `${d.toString().padStart(2, '0')} ${monthsList[detailsMonth].slice(0, 3)} (${dayName})`;

                          return (
                            <tr key={d} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-3.5 font-bold text-slate-700 whitespace-nowrap">
                                {formattedDayStr}
                              </td>
                              <td className="px-5 py-3.5 font-mono text-slate-600 whitespace-nowrap">
                                {record?.checkInLocal ? record.checkInLocal : '—'}
                              </td>
                              <td className="px-5 py-3.5 font-mono text-slate-600 whitespace-nowrap font-medium">
                                {record?.checkOutLocal ? record.checkOutLocal : record?.checkInLocal ? 'Active' : '—'}
                              </td>
                              <td className="px-5 py-3.5 font-mono text-slate-600 whitespace-nowrap">
                                {record?.metrics?.workingMinutes ? formatMinutes(record.metrics.workingMinutes) : '—'}
                              </td>
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusInfo.color}`}>
                                  {statusInfo.label}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                                <div className="flex flex-col gap-0.5 text-[10px]">
                                  {record?.metrics ? (
                                    <>
                                      {record.metrics.lateMinutes > 0 && (
                                        <span className="font-bold text-rose-500 uppercase">Late: {record.metrics.lateMinutes} mins</span>
                                      )}
                                      {record.metrics.otMinutes > 0 && (
                                        <span className="font-bold text-emerald-600 uppercase">OT: {record.metrics.otMinutes} mins</span>
                                      )}
                                      {record.metrics.penaltyMinutes > 0 && (
                                        <span className="font-bold text-rose-600 uppercase">Penalty: {record.metrics.penaltyMinutes}</span>
                                      )}
                                      {record.metrics.lateMinutes <= 0 && record.metrics.otMinutes <= 0 && record.metrics.penaltyMinutes <= 0 && (
                                        <span className="font-bold text-slate-400 uppercase">Standard Run</span>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
            </div>
          </div>
        );
      })()}
    </>
  );
};

export default Registry;
