
import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { QuoteFrame } from './components/QuoteFrame.tsx';
import Registry from './views/Registry.tsx';
import Configuration from './views/Configuration.tsx';
import Advances from './views/Advances.tsx';
import Payroll from './views/Payroll.tsx';
import Attendance from './views/Attendance.tsx';
import Login from './views/Login.tsx';
import { User } from './types.ts';
import { APP_EMAILS } from './constants.tsx';
import { hrmsService } from './services/hrmsService.ts';
import axios from 'axios';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isInitialized, setIsInitialized] = useState(false);
  const [stats, setStats] = useState({
    activeEmployees: 0,
    totalDepartments: 0,
    upcomingHolidays: 0
  });

  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await axios.get('/api/auth/me');
        if (res.data && res.data.email) {
          const email = res.data.email.trim();
          const upperEmail = email.toUpperCase();
          const domain = upperEmail.split('@')[1];
          
          const isAuthorized = domain === 'PTB.COM' || domain === 'INTERMESH.COM' || domain === '123456';
          
          if (isAuthorized) {
            const role = upperEmail === APP_EMAILS.ACCOUNTANT.toUpperCase() ? 'ACCOUNTANT' : 'ADMIN';
            setCurrentUser({ email: email, role });
          } else {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        setCurrentUser(null);
      } finally {
        setIsInitialized(true);
      }
    };

    checkUser();
  }, []);

  useEffect(() => {
    if (currentUser && currentTab === 'dashboard') {
      hrmsService.getDashboardStats()
        .then(s => setStats(s))
        .catch(err => console.error("Permission error fetching dashboard stats:", err));
    }
  }, [currentUser, currentTab]);

  const handleLogin = (email: string) => {
    const upperEmail = email.toUpperCase();
    const role = upperEmail === APP_EMAILS.ACCOUNTANT.toUpperCase() ? 'ACCOUNTANT' : 'ADMIN';
    setCurrentUser({ email, role });
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.error("Logout failed", err);
    }
    setCurrentUser(null);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500 font-medium tracking-wide">Syncing Security Credentials...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <div className="space-y-8 p-8 max-w-7xl mx-auto animate-in fade-in duration-500 no-print">
            <header className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Welcome back, {currentUser.role}!</h1>
                <p className="text-gray-500 mt-1 text-sm">Here's a real-time snapshot of PTB Workforce.</p>
              </div>
            </header>

            <QuoteFrame />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Active Staff', value: stats.activeEmployees, icon: 'fa-users', color: 'indigo' },
                { label: 'Departments', value: stats.totalDepartments, icon: 'fa-building', color: 'blue' },
                { label: 'Current Month Holidays', value: stats.upcomingHolidays, icon: 'fa-calendar-check', color: 'green' },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4 group hover:border-indigo-200 transition-all cursor-default">
                  <div className={`w-14 h-14 bg-${stat.color}-50 rounded-2xl flex items-center justify-center text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                    <i className={`fas ${stat.icon} text-2xl`}></i>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-xl font-bold mb-6 text-gray-900 flex items-center">
                  <i className="fas fa-rocket mr-2 text-indigo-500"></i>
                  Quick Operations
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { tab: 'attendance', icon: 'fa-fingerprint', label: 'Attendance Log', color: 'emerald' },
                    { tab: 'registry', icon: 'fa-user-plus', label: 'Add Staff', color: 'indigo' },
                    { tab: 'payroll', icon: 'fa-file-invoice', label: 'Salary Calculation', color: 'blue' },
                    { tab: 'advances', icon: 'fa-hand-holding-usd', label: 'Issue Advance', color: 'rose' },
                  ].map((btn) => (
                    <button 
                      key={btn.tab}
                      onClick={() => setCurrentTab(btn.tab)} 
                      className="flex flex-col items-center p-6 rounded-2xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group"
                    >
                      <div className={`w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3 text-${btn.color}-500 group-hover:bg-indigo-600 group-hover:text-white transition-all`}>
                        <i className={`fas ${btn.icon} text-lg`}></i>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{btn.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl"></div>
            </div>
          </div>
        );
      case 'attendance': return <Attendance currentUser={currentUser} />;
      case 'registry': return <Registry />;
      case 'config': return <Configuration />;
      case 'advances': return <Advances adminEmail={currentUser.email} />;
      case 'payroll': return <Payroll />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar currentTab={currentTab} setTab={setCurrentTab} onLogout={handleLogout} />
      <main className="pl-64 min-h-screen print:pl-0">
        <div className="p-4 h-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
