import React, { useState, useEffect } from 'react';
import { hrmsService } from '../services/hrmsService.ts';
import { Employee, SalaryAdvance, AdvanceEntry } from '../types.ts';
import { formatCurrency, getYYMM } from '../constants.tsx';
import { LoadingButton } from '../components/LoadingButton.tsx';
import { SearchableSelect } from '../components/SearchableSelect.tsx';

interface AdvancesProps {
  adminEmail: string;
}

const Advances: React.FC<AdvancesProps> = ({ adminEmail }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<string>('');
  const [deductionMonth, setDeductionMonth] = useState<string>(getYYMM());
  const [history, setHistory] = useState<SalaryAdvance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    amount: '',
    remark: ''
  });

  const monthOptions = React.useMemo(() => {
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

  const getMonthNameFromYYMM = (yymm: string) => {
    const month = parseInt(yymm.slice(2));
    const year = 2000 + parseInt(yymm.slice(0, 2));
    return new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const loadRegistry = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const emps = await hrmsService.getEmployees();
      console.log("HRMS Advances loaded emps:", emps);
      setEmployees(emps || []);
      if (emps && emps.length > 0) {
        setSelectedEmp(emps[0].id);
      } else {
        setErrorMsg("API returned 0 employees");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to load employees: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRegistry();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (selectedEmp) {
        try {
          const h = await hrmsService.getAdvance(selectedEmp, 'ALL');
          setHistory(h);
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchHistory();
  }, [selectedEmp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp || !formData.amount) return;
    setIsSaving(true);
    try {
      await hrmsService.addAdvance(selectedEmp, parseFloat(formData.amount), formData.remark, adminEmail, deductionMonth);
      setFormData({ amount: '', remark: '' });
      const h = await hrmsService.getAdvance(selectedEmp, 'ALL');
      setHistory(h);
    } catch (err) {
      alert("Release failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance & Advances</h1>
          <p className="text-gray-500">Track and manage employee salary advances.</p>
          {errorMsg && (
            <p className="text-red-500 mt-2 bg-red-50 p-2 rounded-lg text-sm border border-red-100 font-bold">
              Debug Error: {errorMsg}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Employee</label>
              <SearchableSelect
                options={employees.map(e => ({ value: e.id, label: `${e.id} - ${e.name}` }))}
                value={selectedEmp}
                onChange={setSelectedEmp}
              />
            </div>

            <div className="pt-6 border-t border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Payment</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount (INR)</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Deduction Month (Katoti Month)</label>
                  <select
                    value={deductionMonth}
                    onChange={(e) => setDeductionMonth(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Remark</label>
                  <input
                    required
                    value={formData.remark}
                    onChange={(e) => setFormData({...formData, remark: e.target.value})}
                    placeholder="e.g. Personal emergency"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <LoadingButton isLoading={isSaving} className="w-full py-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 font-bold">
                  Release Advance
                </LoadingButton>
              </form>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-900">Payment Audit Log</h2>
            <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold">
              GRAND TOTAL: {formatCurrency(history?.totalAdvance || 0)}
            </div>
          </div>

          {!history || !history.entries || Object.keys(history.entries).length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
              <i className="fas fa-history text-4xl mb-4 opacity-20"></i>
              <p>No salary advances recorded for this employee yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date Released</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Deduction Month</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Remark</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Auth By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(Object.values(history.entries) as AdvanceEntry[]).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-indigo-600">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-indigo-500 uppercase tracking-wide">
                        {(entry as any).yymm ? getMonthNameFromYYMM((entry as any).yymm) : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {entry.remark}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-400">
                        {(entry.addedBy || 'ADMIN').split('@')[0].toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Advances;
