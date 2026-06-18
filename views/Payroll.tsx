
import React, { useState, useEffect, useMemo } from 'react';
import { hrmsService } from '../services/hrmsService.ts';
import { Employee, Department, Shift, Holiday, CalculatedMetrics, AttendanceRecord } from '../types.ts';
import { getYYMM, formatCurrency, numberToWords } from '../constants.tsx';
import { LoadingButton } from '../components/LoadingButton.tsx';
import { SearchableSelect } from '../components/SearchableSelect.tsx';

const Payroll: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [processingIndex, setProcessingIndex] = useState(0);

  const [selectedMonth, setSelectedMonth] = useState(getYYMM());
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [processedDays, setProcessedDays] = useState<AttendanceRecord[]>([]);
  const [salarySummary, setSalarySummary] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'individual' | 'bulk-report'>('individual');
  const [bulkReport, setBulkReport] = useState<any>(null);
  
  // Bulk Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkDeptFilter, setBulkDeptFilter] = useState('ALL');

  // Bulk Processing Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkMonthInput, setBulkMonthInput] = useState(getYYMM());

  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = -6; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      const yy = d.getFullYear().toString().slice(-2);
      const mm = (d.getMonth() + 1).toString().padStart(2, '0');
      options.push({ value: `${yy}${mm}`, label });
    }
    return options.reverse();
  }, []);

  const timeToMins = (timeStr: string) => {
    if (!timeStr || timeStr === '--' || timeStr === '') return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    const [h, m] = parts.map(Number);
    return (isNaN(h) || isNaN(m)) ? 0 : h * 60 + m;
  };

  const getMonthNameFromYYMM = (yymm: string) => {
    const month = parseInt(yymm.slice(2));
    const year = 2000 + parseInt(yymm.slice(0, 2));
    return new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const [eList, dList, sList, hList] = await Promise.all([
          hrmsService.getEmployees(),
          hrmsService.getDepartments(),
          hrmsService.getShifts(),
          hrmsService.getHolidays()
        ]);
        setEmployees(eList);
        setDepts(dList);
        setShifts(sList);
        setHolidays(hList);
        if (eList.length > 0) setSelectedEmpId(eList[0].id);
        
        const report = await hrmsService.getPayrollReport(selectedMonth);
        if (report) setBulkReport(report);
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [selectedMonth]);

  const calculateOneEmployee = async (empId: string, month: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) throw new Error(`Employee ${empId} not found in local registry.`);
    
    // Safety check for shift and dept
    const shift = shifts.find(s => s.id === emp.shift) || shifts[0];
    const dept = depts.find(d => d.id === emp.department) || depts[0];
    
    // Robust time parsing
    const shiftIn = timeToMins(shift?.checkIn || '09:30');
    const shiftOut = timeToMins(shift?.checkOut || '18:30');
    let shiftDurationMins = shiftOut - shiftIn;
    
    // Prevent Division by Zero
    if (shiftDurationMins <= 0) shiftDurationMins = 480; // Default to 8 hours if config is broken

    const advance = await hrmsService.getAdvance(emp.id, month);
    const rawAttendance = await hrmsService.getMonthlyAttendanceForEmployee(month, empId);

    const year = 2000 + parseInt(month.slice(0, 2));
    const monthNum = parseInt(month.slice(2));
    const daysInMonthCount = new Date(year, monthNum, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];
    
    let totalLatePenaltyMins = 0, totalOTMins = 0, absentDaysCount = 0, presentDaysCount = 0, goneDaysCount = 0; 

    const dailyRate = emp.monthlySalary / daysInMonthCount;
    const minuteRate = dailyRate / shiftDurationMins;
    const dailyMetricsList: AttendanceRecord[] = [];

    for (let dayNum = 1; dayNum <= daysInMonthCount; dayNum++) {
      const dd = dayNum.toString().padStart(2, '0');
      const dateStr = `${year}-${monthNum.toString().padStart(2, '0')}-${dd}`;
      const isFuture = dateStr > todayStr;
      if (!isFuture) goneDaysCount++;

      const record = rawAttendance.find(r => r.date === dateStr);
      const holiday = holidays.find(h => h.date === dateStr);
      const dayOfWeek = new Date(dateStr).getDay();
      const isSunday = dayOfWeek === 0;
      const isFullOff = (isSunday && emp.weekOff === 'SUNDAY_OFF');
      const isHalfOff = (isSunday && emp.weekOff === 'SUNDAY_HALF');

      const m: CalculatedMetrics = { status: 'ABSENT', workingMinutes: 0, lateMinutes: 0, otMinutes: 0, penaltyMinutes: 0 };

      const hasBothPunches = record && record.checkInLocal && record.checkInLocal !== '--' && record.checkOutLocal && record.checkOutLocal !== '--';

      if (hasBothPunches) {
        const checkIn = timeToMins(record.checkInLocal);
        const checkOut = timeToMins(record.checkOutLocal!);
        const totalWorking = (checkOut > checkIn) ? (checkOut - checkIn) : 0;
        m.workingMinutes = totalWorking;

        if (holiday || isFullOff) {
          m.status = holiday ? 'HOLIDAY' : 'WEEK_OFF';
          m.otMinutes = totalWorking;
          if (!isFuture) presentDaysCount++;
        } else if (isHalfOff) {
          m.status = 'PRESENT';
          if (!isFuture) presentDaysCount++;
          const halfShift = shiftDurationMins / 2;
          if (totalWorking > halfShift) m.otMinutes = totalWorking - halfShift;
        } else {
          const late = checkIn - shiftIn;
          if (late <= 5) {
            m.status = 'PRESENT';
            if (!isFuture) presentDaysCount++;
          } else if (late > 5 && late <= 30) {
            m.status = 'LATE';
            if (!isFuture) { presentDaysCount++; m.lateMinutes = late; m.penaltyMinutes = late * 2; }
          } else {
            m.status = 'HALF_DAY';
            if (!isFuture) { presentDaysCount += 0.5; absentDaysCount += 0.5; m.lateMinutes = late; }
          }
          if (checkOut > 0) {
            const diffOut = checkOut - shiftOut;
            if (diffOut > (dept?.otBufferEnabled ? 15 : 0)) m.otMinutes = diffOut;
            else if (diffOut < 0) m.penaltyMinutes += Math.abs(diffOut);
          }
        }
        if (!isFuture) { totalLatePenaltyMins += m.penaltyMinutes; totalOTMins += m.otMinutes; }
      } else {
        if (!isFuture) {
          if (holiday || isFullOff) { m.status = holiday ? 'HOLIDAY' : 'WEEK_OFF'; presentDaysCount++; }
          else if (isHalfOff) { m.status = 'ABSENT'; absentDaysCount += 0.5; }
          else { m.status = 'ABSENT'; absentDaysCount += 1; }
        }
      }
      dailyMetricsList.push({ ...(record || { empId, checkInLocal: '--', date: dateStr, checkInServer: null }), metrics: m });
    }

    const overtimePay = totalOTMins * minuteRate;
    const penaltyPay = totalLatePenaltyMins * minuteRate;
    const basicEarned = presentDaysCount * dailyRate;
    const advances = advance?.totalAdvance || 0;
    
    const netPayable = Math.round(basicEarned + overtimePay - penaltyPay - advances);
    
    return { 
      empId, 
      empName: emp.name, 
      department: emp.department, 
      absentDays: absentDaysCount, 
      presentDays: presentDaysCount, 
      totalOTHours: (totalOTMins / 60).toFixed(1), 
      overtimePay: overtimePay,
      netPayable, 
      earnings: { baseSalary: basicEarned, overtime: overtimePay }, 
      deductions: { latePenalty: penaltyPay, advance: advances }, 
      days: dailyMetricsList, 
      shift, 
      goneDays: goneDaysCount,
      month: month
    };
  };

  const calculateIndividual = async () => {
    if (!selectedEmpId) return;
    setIsAnalyzing(true);
    try {
      const summary = await calculateOneEmployee(selectedEmpId, selectedMonth);
      setProcessedDays(summary.days);
      setSalarySummary(summary);
    } catch (err: any) {
      alert(`Individual Analysis Failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startMasterCalculation = async () => {
    if (employees.length === 0) {
      alert("No active employees found to process.");
      return;
    }

    setShowBulkModal(false);
    setIsBulkProcessing(true);
    setProcessingIndex(0);
    setSelectedMonth(bulkMonthInput);
    
    try {
      const results = [];
      const activeStaff = employees;
      
      for (let i = 0; i < activeStaff.length; i++) {
        setProcessingIndex(i + 1);
        const emp = activeStaff[i];
        try {
          const res = await calculateOneEmployee(emp.id, bulkMonthInput);
          results.push(res);
          await hrmsService.saveIndividualPayrollRecord(bulkMonthInput, emp.id, res);
        } catch (innerErr: any) {
          console.error(`Failed at ${emp.id}:`, innerErr);
          throw new Error(`Error calculating ${emp.id} (${emp.name}): ${innerErr.message}`);
        }
      }
      
      const deptStats: Record<string, any> = {};
      results.forEach(r => {
        if (!deptStats[r.department]) deptStats[r.department] = { net: 0, ot: 0, count: 0 };
        deptStats[r.department].net += r.netPayable;
        deptStats[r.department].ot += r.overtimePay;
        deptStats[r.department].count++;
      });

      const report = {
        month: bulkMonthInput,
        totalStaff: activeStaff.length,
        totalNetPayable: results.reduce((sum, r) => sum + r.netPayable, 0),
        totalGross: results.reduce((sum, r) => sum + r.earnings.baseSalary + r.earnings.overtime, 0),
        totalAdvancePaid: results.reduce((sum, r) => sum + r.deductions.advance, 0),
        totalPenalty: results.reduce((sum, r) => sum + r.deductions.latePenalty, 0),
        totalOTPayable: results.reduce((sum, r) => sum + r.overtimePay, 0),
        results: results.map(r => ({ 
          id: r.empId, 
          name: r.empName, 
          dept: r.department, 
          net: r.netPayable, 
          absent: r.absentDays, 
          otAmount: r.overtimePay
        })),
        departmentSummary: deptStats
      };

      await hrmsService.saveBulkPayrollResults(bulkMonthInput, report);
      setBulkReport(report);
      setCurrentView('bulk-report');
    } catch (err: any) {
      console.error("Master Payroll Crash:", err);
      alert(`Calculation Interrupted: ${err.message}`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const exportIndividualCSV = () => {
    if (!salarySummary) return;
    const headers = ["Date", "In", "Out", "Status", "WorkingMins", "OTMins", "PenaltyMins"];
    const csvContent = headers.join(",") + "\n" + processedDays.map(d => [d.date, d.checkInLocal, d.checkOutLocal || '--:--', d.metrics?.status, d.metrics?.workingMinutes, d.metrics?.otMinutes, d.metrics?.penaltyMinutes].join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Payroll_${salarySummary.empName}_${selectedMonth}.csv`;
    link.click();
  };

  const exportBulkLedgerCSV = () => {
    if (!filteredBulkResults.length) return;
    const headers = ["Staff ID", "Name", "Department", "Absent Days", "OT Amount", "Net Payable"];
    const csvRows = filteredBulkResults.map((r: any) => [r.id, r.name, r.dept, r.absent, r.otAmount, r.net].join(","));
    const csvContent = headers.join(",") + "\n" + csvRows.join("\n") + "\n\n" + `TOTAL,,,,, ${filteredTotalNet}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Payroll_Ledger_${bulkReport.month}_${bulkDeptFilter}.csv`;
    link.click();
  };

  const filteredBulkResults = useMemo(() => {
    if (!bulkReport?.results) return [];
    return bulkReport.results.filter((r: any) => {
      const searchMatch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.id.toLowerCase().includes(searchTerm.toLowerCase());
      const deptMatch = bulkDeptFilter === 'ALL' || r.dept === bulkDeptFilter;
      return searchMatch && deptMatch;
    });
  }, [bulkReport, searchTerm, bulkDeptFilter]);

  const filteredTotalNet = useMemo(() => {
    return filteredBulkResults.reduce((sum: number, r: any) => sum + r.net, 0);
  }, [filteredBulkResults]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div><h1 className="text-3xl font-black text-gray-900 tracking-tight italic uppercase">Payroll Intelligence</h1><p className="text-gray-500 font-medium tracking-tight">Enterprise financial ledger for PTB workforce.</p></div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
          <button onClick={() => setCurrentView('individual')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentView === 'individual' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:text-gray-600'}`}>Individual</button>
          <button onClick={() => setCurrentView('bulk-report')} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentView === 'bulk-report' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:text-gray-600'}`}>Monthly Ledger</button>
        </div>
      </div>

      {currentView === 'individual' ? (
        <>
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl flex flex-wrap gap-8 items-end no-print relative">
            <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50/50 rounded-full blur-3xl -mr-10 -mt-10"></div>
            </div>
            <div className="relative z-10">
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Select Payroll Month</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                className="px-6 py-3.5 rounded-2xl border-2 border-gray-100 outline-none focus:border-indigo-500 font-bold text-gray-800 bg-white shadow-sm"
              >
                {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[300px] relative z-10">
              <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Staff Member</label>
              <SearchableSelect
                options={employees.map(e => ({ value: e.id, label: `${e.id} - ${e.name}` }))}
                value={selectedEmpId}
                onChange={setSelectedEmpId}
              />
            </div>
            <div className="flex space-x-3 relative z-10">
              <LoadingButton isLoading={isAnalyzing} onClick={calculateIndividual} className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black shadow-lg shadow-indigo-100 uppercase tracking-widest text-xs">Analyze Records</LoadingButton>
              {salarySummary && (
                <>
                  <button onClick={exportIndividualCSV} className="bg-emerald-50 text-emerald-600 w-14 h-14 rounded-2xl border border-emerald-100 shadow-sm" title="Download CSV"><i className="fas fa-file-csv text-xl"></i></button>
                  <button onClick={() => window.print()} className="bg-gray-900 text-white w-14 h-14 rounded-2xl shadow-xl" title="Print Payslip"><i className="fas fa-print text-xl"></i></button>
                </>
              )}
            </div>
          </div>
          {salarySummary && !isAnalyzing && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 no-print animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="lg:col-span-2 bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden overflow-y-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-20">
                    <tr><th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest">Date</th><th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Punches</th><th className="px-8 py-5 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Day Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {processedDays.map(d => <tr key={d.date} className="hover:bg-indigo-50/10 transition-colors"><td className="px-8 py-5 font-mono text-xs text-gray-400 font-bold">{d.date}</td><td className="px-8 py-5 text-center"><div className="flex flex-col"><span className="text-xs font-black text-gray-800">{d.checkInLocal}</span><span className="text-[10px] text-gray-300 font-bold tracking-tighter">{d.checkOutLocal || '--:--'}</span></div></td><td className="px-8 py-5 text-right"><span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${d.metrics?.status === 'PRESENT' ? 'bg-green-50 text-green-600 border-green-100' : d.metrics?.status === 'ABSENT' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>{d.metrics?.status}</span></td></tr>)}
                  </tbody>
                </table>
              </div>
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-12 border-2 border-indigo-100 shadow-2xl rounded-[3rem] text-center flex flex-col justify-center"><p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-3">Net Individual Payout</p><p className="text-6xl font-black text-gray-900 tracking-tighter">{formatCurrency(salarySummary.netPayable)}</p></div>
                <div className="bg-indigo-600 p-8 rounded-[2rem] text-white">
                   <h4 className="text-xs font-black uppercase tracking-widest mb-4 opacity-60">Audit Summary</h4>
                   <div className="space-y-3">
                     <div className="flex justify-between text-sm"><span className="opacity-70">Working Days</span><span className="font-bold">{salarySummary.presentDays}</span></div>
                     <div className="flex justify-between text-sm"><span className="opacity-70">Absent Count</span><span className="font-bold">{salarySummary.absentDays}</span></div>
                     <div className="flex justify-between text-sm"><span className="opacity-70">OT Amount</span><span className="font-bold">{formatCurrency(salarySummary.overtimePay)}</span></div>
                   </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-8 no-print animate-in fade-in duration-500">
          <div className="bg-indigo-600 rounded-[3rem] p-10 text-white flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
             <div className="z-10 text-center md:text-left"><p className="text-[10px] font-black uppercase text-indigo-200 mb-2 tracking-[0.4em]">Consolidated Analytics</p><h2 className="text-4xl font-black italic">Monthly Master Report</h2><p className="text-indigo-100 mt-2 font-medium">Sequential cloud processing engine.</p></div>
             <div className="mt-8 md:mt-0 z-10 flex space-x-4"><button onClick={() => setShowBulkModal(true)} className="px-10 py-4 bg-white text-indigo-600 rounded-2xl font-black uppercase text-xs shadow-xl shadow-indigo-900/20 hover:scale-105 transition-transform">Run Master Calculation</button></div>
          </div>
          
          {isBulkProcessing && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <div className="bg-white p-12 rounded-[3rem] shadow-2xl text-center space-y-8 max-w-xl w-full border-4 border-indigo-100 animate-in zoom-in duration-300">
                 <div className="relative w-32 h-32 mx-auto">
                    <div className="absolute inset-0 border-8 border-indigo-50 rounded-full"></div>
                    <div className="absolute inset-0 border-8 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <span className="text-2xl font-black text-indigo-600">{Math.round((processingIndex/employees.length)*100)}%</span>
                    </div>
                 </div>
                 <div>
                    <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-2">Master Calculation</h3>
                    <p className="text-indigo-500 font-bold uppercase tracking-widest text-xs">Employee {processingIndex} of {employees.length}</p>
                 </div>
                 <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                   <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${(processingIndex / employees.length) * 100}%` }}></div>
                 </div>
              </div>
            </div>
          )}

          {bulkReport && !isBulkProcessing && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"><p className="text-[10px] font-black text-gray-400 uppercase mb-2">Net Salary Outflow</p><p className="text-3xl font-black text-gray-900">{formatCurrency(bulkReport.totalNetPayable)}</p></div>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"><p className="text-[10px] font-black text-gray-400 uppercase mb-2">Advances Recovered</p><p className="text-3xl font-black text-amber-600">{formatCurrency(bulkReport.totalAdvancePaid)}</p></div>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"><p className="text-[10px] font-black text-gray-400 uppercase mb-2">OT Expenditure</p><p className="text-3xl font-black text-indigo-600">{formatCurrency(bulkReport.totalOTPayable || 0)}</p></div>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm"><p className="text-[10px] font-black text-gray-400 uppercase mb-2">Company Liability</p><p className="text-3xl font-black text-gray-900">{formatCurrency(bulkReport.totalGross)}</p></div>
              </div>
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-8">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-50 pb-6 gap-4">
                  <h3 className="text-2xl font-black text-gray-900 italic uppercase">Staff Master Ledger ({getMonthNameFromYYMM(bulkReport.month)})</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <select 
                      value={bulkDeptFilter} 
                      onChange={(e) => setBulkDeptFilter(e.target.value)}
                      className="px-4 py-3 border-2 border-gray-100 rounded-2xl outline-none focus:border-indigo-500 font-bold text-xs uppercase"
                    >
                      <option value="ALL">All Departments</option>
                      {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <div className="flex items-center space-x-3 bg-gray-50 px-4 rounded-2xl border-2 border-gray-100 focus-within:border-indigo-500 transition-colors">
                      <i className="fas fa-search text-gray-300"></i>
                      <input placeholder="Search name/ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="py-3 bg-transparent outline-none font-bold text-sm w-36" />
                    </div>
                    <button onClick={exportBulkLedgerCSV} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-emerald-100 flex items-center space-x-2">
                      <i className="fas fa-file-csv"></i>
                      <span>Export Ledger</span>
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                      <tr><th className="px-8 py-4">Employee</th><th className="px-8 py-4">Dept</th><th className="px-8 py-4 text-center">Absent Days</th><th className="px-8 py-4 text-center">OT Amount</th><th className="px-8 py-4 text-right">Net Payable</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredBulkResults.map((r: any) => (
                        <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-5"><div className="flex flex-col"><span className="font-bold text-gray-900">{r.name}</span><span className="text-[10px] font-mono text-indigo-500 uppercase font-black">{r.id}</span></div></td>
                          <td className="px-8 py-5"><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-3 py-1 bg-gray-100 rounded-lg">{r.dept}</span></td>
                          <td className="px-8 py-5 text-center font-mono font-black text-rose-500">{r.absent}</td>
                          <td className="px-8 py-5 text-center font-black text-indigo-600">{formatCurrency(r.otAmount)}</td>
                          <td className="px-8 py-5 text-right font-black text-gray-900">{formatCurrency(r.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-indigo-50/50">
                      <tr className="border-t-2 border-indigo-100">
                        <td colSpan={4} className="px-8 py-5 text-right text-[10px] font-black uppercase text-indigo-400 tracking-widest">Sub-Total Net Payable ({filteredBulkResults.length} Staff)</td>
                        <td className="px-8 py-5 text-right font-black text-xl text-indigo-700">{formatCurrency(filteredTotalNet)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Month Selection Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="px-10 py-8 bg-indigo-600 text-white text-center">
                <i className="fas fa-calculator text-4xl mb-4 text-indigo-200"></i>
                <h2 className="text-2xl font-black uppercase tracking-tight">Master Calculation</h2>
                <p className="text-indigo-100 text-sm mt-1">Choose Month to process payroll ledger.</p>
             </div>
             <div className="p-10 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Target Month</label>
                  <select 
                    value={bulkMonthInput} 
                    onChange={e => setBulkMonthInput(e.target.value)} 
                    className="w-full px-6 py-4 rounded-2xl border-2 border-gray-100 outline-none focus:border-indigo-500 text-xl font-bold bg-white text-center appearance-none"
                  >
                    {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                   <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center space-x-3">
                         <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><i className="fas fa-users"></i></div>
                         <span className="text-xs font-black text-gray-500 uppercase">Active Staff Pool</span>
                      </div>
                      <span className="text-2xl font-black text-gray-900">{employees.length}</span>
                   </div>
                </div>
                <div className="flex space-x-3">
                   <button onClick={() => setShowBulkModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors">Cancel</button>
                   <button onClick={startMasterCalculation} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 hover:scale-105 transition-transform">Begin Calculation</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {salarySummary && (
        <div className="print-only fixed inset-0 bg-white p-6 z-[9999]">
          <div className="max-w-[800px] mx-auto bg-white text-black border-[1px] border-black p-8 font-sans">
            <div className="flex justify-between items-start border-b-[2px] border-black pb-4 mb-6"><div><h1 className="text-2xl font-black uppercase tracking-tight leading-none">Pooja Tekno Belt</h1><p className="text-[10px] text-gray-600 uppercase font-bold tracking-widest mt-2 leading-none">Industrial Area • Monthly Earnings Statement</p></div><div className="text-right"><h2 className="text-xl font-black uppercase border-b-2 border-black inline-block mb-2">Pay Slip</h2><p className="text-xs font-bold text-gray-700">Month: <span className="uppercase">{getMonthNameFromYYMM(salarySummary.month)}</span></p></div></div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-3 mb-6 bg-gray-50 p-6 border border-gray-200 rounded-xl"><div className="flex justify-between text-xs uppercase font-bold text-gray-500">Employee ID<span className="text-black font-black">{salarySummary.empId}</span></div><div className="flex justify-between text-xs uppercase font-bold text-gray-500">Department<span className="text-black font-black">{salarySummary.department}</span></div><div className="flex justify-between text-xs uppercase font-bold text-gray-500">Full Name<span className="text-black font-black uppercase">{salarySummary.empName}</span></div></div>
            <div className="border-[1px] border-black mb-6"><div className="bg-gray-100 border-b-[1px] border-black px-3 py-1 text-[10px] font-black uppercase tracking-widest">Attendance Summary</div><div className="grid grid-cols-4 divide-x-[1px] divide-black text-center"><div className="p-3"><p className="text-[9px] font-bold text-gray-400 uppercase">Total Days</p><p className="text-lg font-black">{salarySummary.days.length}</p></div><div className="p-3"><p className="text-[9px] font-bold text-gray-400 uppercase">Present</p><p className="text-lg font-black text-green-700">{salarySummary.presentDays}</p></div><div className="p-3"><p className="text-[9px] font-bold text-gray-400 uppercase">Absent</p><p className="text-lg font-black text-red-600">{salarySummary.absentDays}</p></div><div className="p-3"><p className="text-[9px] font-bold text-gray-400 uppercase">OT Amount</p><p className="text-lg font-black text-blue-600">{formatCurrency(salarySummary.overtimePay)}</p></div></div></div>
            <div className="grid grid-cols-2 border-[1px] border-black divide-x-[1px] divide-black mb-6"><div><div className="bg-gray-100 border-b-[1px] border-black px-3 py-1 text-[10px] font-black uppercase tracking-widest">Earnings</div><div className="p-4 space-y-2 h-[100px] text-xs font-bold"><div className="flex justify-between"><span>Basic Wage (Days)</span><span className="font-black">{formatCurrency(salarySummary.earnings.baseSalary)}</span></div><div className="flex justify-between"><span>Overtime Pay</span><span className="font-black">{formatCurrency(salarySummary.earnings.overtime)}</span></div></div></div><div><div className="bg-gray-100 border-b-[1px] border-black px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-600">Deductions</div><div className="p-4 space-y-2 h-[100px] text-xs font-bold"><div className="flex justify-between"><span>Advance Recovery</span><span className="font-black text-red-600">-{formatCurrency(salarySummary.deductions.advance)}</span></div><div className="flex justify-between"><span>Penalty / Fine</span><span className="font-black text-red-600">-{formatCurrency(salarySummary.deductions.latePenalty)}</span></div></div></div></div>
            <div className="border-[2px] border-black p-10 flex flex-col items-center justify-center bg-gray-50 mb-8"><p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Total Net Payable Amount</p><h3 className="text-5xl font-black text-black">{formatCurrency(salarySummary.netPayable)}</h3><p className="text-[10px] font-black text-gray-700 mt-4 border-t border-gray-200 pt-3 w-full text-center uppercase tracking-wider italic">In Words: {numberToWords(salarySummary.netPayable)}</p></div>
            <div className="flex justify-between pt-10"><div className="text-center w-[200px] border-t border-black pt-2"><p className="text-[10px] font-black uppercase">Authorized Signatory</p></div><div className="text-center w-[200px] border-t border-black pt-2"><p className="text-[10px] font-black uppercase">Employee Signature</p></div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
