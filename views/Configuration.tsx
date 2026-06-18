import React, { useState } from 'react';
import Departments from './Departments.tsx';
import Shifts from './Shifts.tsx';
import Holidays from './Holidays.tsx';

const Configuration: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'departments' | 'shifts' | 'holidays'>('departments');

  const subTabs = [
    { id: 'departments', label: 'Departments', icon: 'fa-building' },
    { id: 'shifts', label: 'Work Shifts', icon: 'fa-clock' },
    { id: 'holidays', label: 'Holiday Calendar', icon: 'fa-calendar-alt' }
  ];

  return (
    <div className="space-y-8 p-2 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header Section */}
      <div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase leading-none">
          System Configuration
        </h1>
        <p className="text-slate-500 font-medium mt-2">Manage company departments, operational shifts, and holiday schedules.</p>
      </div>

      {/* Tab Switcher Bar */}
      <div className="flex border-b border-slate-200 gap-6">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 pb-4 px-2 text-sm font-black uppercase tracking-wider transition-all border-b-2 outline-none ${
                isActive 
                  ? 'border-indigo-600 text-indigo-600 scale-[1.02]' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <i className={`fas ${tab.icon} ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}></i>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Subtab Content */}
      <div className="animate-in fade-in duration-300">
        {activeSubTab === 'departments' && <Departments />}
        {activeSubTab === 'shifts' && <Shifts />}
        {activeSubTab === 'holidays' && <Holidays />}
      </div>
    </div>
  );
};

export default Configuration;
