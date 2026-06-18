
import React, { useState, useEffect, useMemo } from 'react';
import { hrmsService } from '../services/hrmsService.ts';
import { AttendanceRecord, Employee, Department, User, Shift } from '../types.ts';
import { LoadingButton } from '../components/LoadingButton.tsx';
import { getYYMM } from '../constants.tsx';

interface DaySyncState {
  dd: string;
  status: 'idle' | 'fetching' | 'found' | 'importing' | 'synced' | 'error';
  records: any[];
  error?: string;
}

interface AttendanceProps {
  currentUser?: User | null;
}

const Attendance: React.FC<AttendanceProps> = ({ currentUser }) => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showOldServerModal, setShowOldServerModal] = useState(false);
  const [drillDown, setDrillDown] = useState<{ title: string; list: Employee[] } | null>(null);

  const [syncDays, setSyncDays] = useState<DaySyncState[]>([]);
  const [syncYYMM, setSyncYYMM] = useState(getYYMM());
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const [manualForm, setManualForm] = useState({
    empId: '',
    date: new Date().toISOString().split('T')[0],
    checkInLocal: '09:30',
    checkOutLocal: ''
  });

  // Permission check for Cloud Sync
  const canCloudSync = currentUser?.email?.toLowerCase() === 'sam.dev@ptb.com';

  const timeToMins = (timeStr: string) => {
    if (!timeStr || timeStr === '--' || timeStr === '') return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [records, empList, dList, sList] = await Promise.all([
        hrmsService.getAttendanceForDate(selectedDate),
        hrmsService.getEmployees(),
        hrmsService.getDepartments(),
        hrmsService.getShifts()
      ]);
      
      const enrichedRecords = (records || []).map(record => {
        const emp = empList.find(e => e.id === record.empId);
        return {
          ...record,
          empName: emp ? emp.name : 'Unknown Employee',
          department: emp ? emp.department : 'N/A'
        };
      });

      setAttendance(enrichedRecords);
      setEmployees(empList);
      setDepts(dList);
      setShifts(sList);
      
      if (empList.length > 0 && !manualForm.empId) {
        setManualForm(prev => ({ ...prev, empId: empList[0].id }));
      }
    } catch (err) {
      console.error("Error loading attendance:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const stats = useMemo(() => {
    const activeStaff = employees;
    const records = attendance;
    
    const presentList: Employee[] = [];
    const lateList: Employee[] = [];
    const otList: Employee[] = [];
    let totalOTMins = 0;

    records.forEach(record => {
      const emp = activeStaff.find(e => e.id === record.empId);
      if (!emp) return;
      
      if (!record.checkInLocal || record.checkInLocal === '--' || !record.checkOutLocal || record.checkOutLocal === '--') {
        return;
      }

      presentList.push(emp);
      
      const shift = shifts.find(s => s.id === emp.shift);
      const shiftInMins = timeToMins(shift?.checkIn || '09:30');
      const actualInMins = timeToMins(record.checkInLocal);
      
      if (actualInMins > shiftInMins + 5) {
        lateList.push(emp);
      }

      const shiftOutMins = timeToMins(shift?.checkOut || '18:30');
      const actualOutMins = timeToMins(record.checkOutLocal);
      const ot = actualOutMins - shiftOutMins;
      if (ot > 0) {
        otList.push(emp);
        totalOTMins += ot;
      }
    });

    const absentList = activeStaff.filter(e => !presentList.some(p => p.id === e.id));

    return {
      present: presentList.length,
      absent: absentList.length,
      late: lateList.length,
      otCount: otList.length,
      otMins: totalOTMins,
      presentList,
      absentList,
      lateList,
      otList
    };
  }, [attendance, employees, shifts]);

  const initOldServerSync = (targetYYMM: string = getYYMM()) => {
    if (!canCloudSync) return;
    setSyncYYMM(targetYYMM);
    const days: DaySyncState[] = [];
    const now = new Date();
    const isCurrentMonth = targetYYMM === getYYMM(now);
    const limit = (targetYYMM === '2512') ? 31 : (isCurrentMonth ? now.getDate() : 31);
    for (let i = 1; i <= limit; i++) {
      days.push({ dd: i.toString().padStart(2, '0'), status: 'idle', records: [] });
    }
    setSyncDays(days);
    setShowOldServerModal(true);
  };

  const handleOldServerFetch = async (dd: string) => {
    if (!canCloudSync) return;
    setSyncDays(prev => prev.map(d => d.dd === dd ? { ...d, status: 'fetching', error: undefined } : d));
    try {
      const records = await hrmsService.fetchOldServerDataForDay(syncYYMM, dd);
      setSyncDays(prev => prev.map(d => d.dd === dd ? { 
        ...d, 
        status: records.length > 0 ? 'found' : 'idle', 
        records 
      } : d));
      return records;
    } catch (err: any) {
      setSyncDays(prev => prev.map(d => d.dd === dd ? { ...d, status: 'error', error: err.message } : d));
      throw err;
    }
  };

  const handleOldServerImport = async (dd: string, recordsToUse?: any[]) => {
    if (!canCloudSync) return;
    const day = syncDays.find(d => d.dd === dd);
    const records = recordsToUse || day?.records;
    if (!records || records.length === 0) return;
    setSyncDays(prev => prev.map(d => d.dd === dd ? { ...d, status: 'importing' } : d));
    try {
      await hrmsService.saveOldServerImport(syncYYMM, dd, records);
      setSyncDays(prev => prev.map(d => d.dd === dd ? { ...d, status: 'synced' } : d));
      if (selectedDate === `20${syncYYMM.slice(0,2)}-${syncYYMM.slice(2)}-${dd}`) loadData();
    } catch (err: any) {
      setSyncDays(prev => prev.map(d => d.dd === dd ? { ...d, status: 'error', error: err.message } : d));
    }
  };

  const handleOldServerSyncAll = async () => {
    if (!canCloudSync || isSyncingAll) return;
    if (!window.confirm("Start batch sync from Legacy Cloud?")) return;
    setIsSyncingAll(true);
    const daysToProcess = [...syncDays];
    for (const day of daysToProcess) {
      if (day.status === 'synced') continue;
      try {
        const records = await handleOldServerFetch(day.dd);
        if (records.length > 0) await handleOldServerImport(day.dd, records);
      } catch (e) {
        console.warn(`Sync failed for day ${day.dd}:`, e);
      }
    }
    setIsSyncingAll(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await hrmsService.saveManualAttendance(manualForm);
      setShowManualModal(false);
      loadData();
    } catch (err) {
      alert("Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Center</h1>
          <p className="text-gray-500 text-sm">Real-time presence metrics for {new Date(selectedDate).toLocaleDateString()}.</p>
        </div>
        <div className="flex items-center space-x-3 text-sm">
          {canCloudSync && (
            <button onClick={() => initOldServerSync()} className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold flex items-center space-x-2 shadow-lg shadow-slate-900/10 hover:bg-slate-900 transition-all">
              <i className="fas fa-cloud-download-alt"></i>
              <span>Cloud Sync</span>
            </button>
          )}
          <button onClick={() => setShowManualModal(true)} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold flex items-center space-x-2"><i className="fas fa-keyboard"></i><span>Manual Log</span></button>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium shadow-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => setDrillDown({ title: 'Present Staff', list: stats.presentList })} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-green-300 transition-all text-left">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Present</p>
          <p className="text-4xl font-black text-gray-900">{stats.present}</p>
        </button>
        <button onClick={() => setDrillDown({ title: 'Absent Staff', list: stats.absentList })} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-red-300 transition-all text-left">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Absent</p>
          <p className="text-4xl font-black text-gray-900">{stats.absent}</p>
        </button>
        <button onClick={() => setDrillDown({ title: 'Late Arrivals', list: stats.lateList })} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-amber-300 transition-all text-left">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Late Count</p>
          <p className="text-4xl font-black text-amber-600">{stats.late}</p>
        </button>
        <button onClick={() => setDrillDown({ title: 'OT Performers', list: stats.otList })} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-indigo-300 transition-all text-left">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Work Overtime</p>
          <p className="text-4xl font-black text-indigo-600">{stats.otCount}</p>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Punch In</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Punch Out</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">Reading ledger...</td></tr>
            ) : attendance.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-20 text-center text-gray-400 font-medium italic">No punches found for this date.</td></tr>
            ) : (
              attendance.map((record) => {
                const isMissing = !record.checkInLocal || record.checkInLocal === '--' || !record.checkOutLocal || record.checkOutLocal === '--';
                return (
                  <tr key={record.empId} className={`hover:bg-gray-50/50 transition-colors ${isMissing ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{record.empName}</span>
                        <span className="text-xs font-mono text-indigo-400 font-bold">{record.empId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-800">{record.checkInLocal || '--:--'}</td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-800">{record.checkOutLocal || '--:--'}</td>
                    <td className="px-6 py-4 text-right">
                       {isMissing ? (
                         <span className="text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-100 px-2 py-1 rounded">Incomplete</span>
                       ) : (
                         <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-100 px-2 py-1 rounded">Synced</span>
                       )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showOldServerModal && canCloudSync && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 bg-slate-800 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight italic">Cloud Migration Portal</h2>
                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Legacy Firestore Project Path: AttendanceByDate/{syncYYMM}</p>
              </div>
              <button onClick={() => setShowOldServerModal(false)} className="text-slate-400 hover:text-white transition-colors"><i className="fas fa-times text-xl"></i></button>
            </div>
            
            <div className="p-8 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50">
               <div className="flex items-center space-x-3">
                 <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Target Month:</label>
                 <input 
                   type="text" 
                   maxLength={4} 
                   value={syncYYMM} 
                   onChange={(e) => setSyncYYMM(e.target.value)}
                   placeholder="YYMM (e.g. 2412)"
                   className="px-4 py-2 rounded-xl border-2 border-slate-200 outline-none focus:border-indigo-500 font-mono font-black text-center w-28"
                 />
                 <button onClick={() => initOldServerSync(syncYYMM)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><i className="fas fa-sync-alt"></i></button>
               </div>
               <button 
                 onClick={handleOldServerSyncAll}
                 disabled={isSyncingAll}
                 className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs shadow-lg shadow-indigo-200 hover:scale-105 transition-all disabled:opacity-50"
               >
                 {isSyncingAll ? 'Batch Processing...' : 'Auto-Sync All Days'}
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-2 bg-white">
              {syncDays.map(day => (
                <div key={day.dd} className="p-4 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500">
                      {day.dd}
                    </div>
                    <div>
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Day Status</p>
                      {day.error ? (
                        <p className="text-[10px] text-red-500 font-bold truncate max-w-[200px]">{day.error}</p>
                      ) : (
                        <p className={`text-xs font-bold uppercase tracking-widest ${
                          day.status === 'synced' ? 'text-emerald-500' : 
                          day.status === 'found' ? 'text-indigo-600' : 'text-gray-300'
                        }`}>
                          {day.status} {day.records.length > 0 ? `(${day.records.length} Punches)` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {day.status === 'idle' || day.status === 'error' ? (
                      <button onClick={() => handleOldServerFetch(day.dd)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase">Fetch</button>
                    ) : day.status === 'found' ? (
                      <button onClick={() => handleOldServerImport(day.dd)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase">Import</button>
                    ) : day.status === 'fetching' || day.status === 'importing' ? (
                      <i className="fas fa-circle-notch fa-spin text-indigo-400"></i>
                    ) : (
                      <i className="fas fa-check-circle text-emerald-500"></i>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {drillDown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <div>
                 <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{drillDown.title}</h2>
                 <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{drillDown.list.length} Personnel</p>
               </div>
               <button onClick={() => setDrillDown(null)} className="w-10 h-10 rounded-full hover:bg-white flex items-center justify-center text-gray-400 transition-colors"><i className="fas fa-times"></i></button>
             </div>
             <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar bg-white">
                {drillDown.list.length === 0 ? (
                  <p className="text-center py-12 text-gray-400 italic">No records in this category.</p>
                ) : (
                  <div className="space-y-2">
                    {drillDown.list.map(emp => (
                      <div key={emp.id} className="p-4 rounded-2xl border border-gray-100 flex justify-between items-center hover:border-indigo-200 transition-colors group">
                        <div>
                          <p className="font-black text-gray-900">{emp.name}</p>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{emp.id} • {emp.department}</p>
                        </div>
                        <i className="fas fa-chevron-right text-gray-200 group-hover:text-indigo-300 transition-colors"></i>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Manual Log</h2>
              <button onClick={() => setShowManualModal(false)} className="text-gray-400"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Staff</label>
                <select required value={manualForm.empId} onChange={(e) => setManualForm({...manualForm, empId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none font-bold bg-white">
                  {employees.map(e => <option key={e.id} value={e.id}>{e.id} - {e.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">In</label><input type="time" required value={manualForm.checkInLocal} onChange={(e) => setManualForm({...manualForm, checkInLocal: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 font-bold" /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Out</label><input type="time" value={manualForm.checkOutLocal} onChange={(e) => setManualForm({...manualForm, checkOutLocal: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 font-bold" /></div>
              </div>
              <LoadingButton isLoading={isSaving} type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg shadow-indigo-100">Save Log</LoadingButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
