
import React from 'react';

interface NavItemProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <i className={`fas ${icon} w-5 text-center ${active ? 'text-white' : 'text-indigo-400'}`}></i>
    <span className="font-semibold text-sm">{label}</span>
  </button>
);

interface SidebarProps {
  currentTab: string;
  setTab: (tab: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setTab, onLogout }) => {
  return (
    <div className="w-64 h-screen bg-[#0f172a] border-r border-slate-800 flex flex-col fixed left-0 top-0 z-40">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20">P</div>
          <div className="flex flex-col">
            <span className="text-xl font-black text-white leading-none tracking-tight">PTB HRMS</span>
            <span className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-1">Management</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto pb-4 custom-scrollbar">
        <NavItem
          icon="fa-th-large"
          label="Dashboard"
          active={currentTab === 'dashboard'}
          onClick={() => setTab('dashboard')}
        />
        <NavItem
          icon="fa-fingerprint"
          label="Attendance Logs"
          active={currentTab === 'attendance'}
          onClick={() => setTab('attendance')}
        />
        <NavItem
          icon="fa-users"
          label="Employee Registry"
          active={currentTab === 'registry'}
          onClick={() => setTab('registry')}
        />
        <NavItem
          icon="fa-cog"
          label="Configuration"
          active={currentTab === 'config'}
          onClick={() => setTab('config')}
        />
        <NavItem
          icon="fa-hand-holding-usd"
          label="Salary Advances"
          active={currentTab === 'advances'}
          onClick={() => setTab('advances')}
        />
        <NavItem
          icon="fa-file-invoice-dollar"
          label="Payroll & Slips"
          active={currentTab === 'payroll'}
          onClick={() => setTab('payroll')}
        />
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all font-bold text-sm"
        >
          <i className="fas fa-sign-out-alt w-5"></i>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
