
import React, { useState } from 'react';
import { LoadingButton } from '../components/LoadingButton.tsx';
import { APP_EMAILS } from '../constants.tsx';
import axios from 'axios';

interface LoginProps {
  onLogin: (email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode | string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const trimmedEmail = email.trim();
      await axios.post('/api/auth/login', { email: trimmedEmail, password });
      onLogin(trimmedEmail);
    } catch (err: any) {
      console.error("Login attempt failed:", err);
      
      const errorMessage = err.response?.data?.message || err.message || 'System error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      <div className="hidden md:flex md:w-1/2 bg-indigo-600 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-8">
            <i className="fas fa-shield-alt text-3xl"></i>
          </div>
          <h1 className="text-5xl font-extrabold mb-6 leading-tight tracking-tight italic">Pooja Tekno Belt</h1>
          <p className="text-xl text-indigo-100 opacity-90 leading-relaxed font-medium">Enterprise HRMS & Payroll Intelligence</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 md:bg-white">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tight italic">Admin Portal</h2>
          <p className="text-gray-500 mb-8 font-medium">Enter your secure credentials to manage the workforce.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Authorized Email</label>
              <input
                type="email"
                required
                placeholder="staff@ptb.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 focus:border-indigo-600 outline-none transition-all font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Secure Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 focus:border-indigo-600 outline-none transition-all font-bold"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="text-red-600 text-sm font-medium">{error}</div>
              </div>
            )}

            <LoadingButton
              type="submit"
              isLoading={isLoading}
              className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-indigo-100 transition-all hover:-translate-y-0.5"
            >
              Log in to System
            </LoadingButton>
          </form>
          
          <div className="mt-8 pt-8 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">Authorized Access Only</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
