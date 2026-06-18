import React, { useState } from 'react';
import axios from 'axios';

interface ProjectSaveProps {
  userId: string;
  onSaveSuccess?: () => void;
}

export const ProjectSave: React.FC<ProjectSaveProps> = ({ userId, onSaveSuccess }) => {
  const [projectName, setProjectName] = useState('');
  const [percentageValue, setPercentageValue] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsSaving(true);
    setError('');
    try {
      await axios.post('/api/present-pro/save', {
        userId,
        projectName: projectName.trim(),
        percentageValue,
      });
      setProjectName('');
      setPercentageValue(0);
      if (onSaveSuccess) onSaveSuccess();
    } catch (err: any) {
      console.error('Failed to save project:', err);
      setError(err.response?.data?.message || err.message || 'Error occurred while saving project.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl max-w-md w-full">
      <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tight italic">
        Create New Project
      </h3>
      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
            Project Name
          </label>
          <input
            type="text"
            required
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. Website Redesign"
            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 focus:border-indigo-600 outline-none transition-all font-bold"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
            Completion Percentage
          </label>
          <input
            type="number"
            required
            min="0"
            max="100"
            value={percentageValue}
            onChange={(e) => setPercentageValue(Number(e.target.value))}
            placeholder="0"
            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 focus:border-indigo-600 outline-none transition-all font-bold"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
            <div className="text-red-600 text-sm font-medium">{error}</div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-indigo-100 transition-all disabled:opacity-50"
        >
          {isSaving ? 'Saving to Cloud...' : 'Save Project'}
        </button>
      </form>
    </div>
  );
};
