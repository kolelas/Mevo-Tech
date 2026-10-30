import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminDashboard } from './AdminDashboard';
import {
  Lock,
  ShieldCheck,
  KeyRound,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  Server,
  LogOut,
  Building2,
} from 'lucide-react';

interface AdminPortalProps {
  onBackToStore?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onBackToStore }) => {
  const { adminUser, isAdminLoggedIn, isCheckingAdminSession, adminLogin, adminLogout } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await adminLogin(username.trim(), password.trim());
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemoCredentials = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMessage(null);
  };

  // 1. Initial session checking state
  if (isCheckingAdminSession) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-md animate-bounce mb-4">
          <Lock className="w-6 h-6 text-purple-400" />
        </div>
        <h2 className="text-base font-bold text-neutral-900">Verifying Security Session</h2>
        <p className="text-xs text-neutral-500 mt-1">Connecting to Sandton Depot administrative gateway...</p>
      </div>
    );
  }

  // 2. Unauthenticated: Full-stack Secured Admin Login Screen
  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-neutral-100">
        <div className="max-w-md w-full space-y-6">
          {/* Header Card */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center p-1.5 rounded-2xl bg-neutral-950 shadow-2xl border border-neutral-800 mb-1">
              <img
                src="/assets/aistudio/Generated_Image_October_29__2026_-_8_40PM_f8f1a10b.png"
                alt="MEVO TECH Logo"
                className="w-28 h-auto max-h-16 object-cover rounded-xl"
              />
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Sandton Depot Security Gateway
              </span>
            </div>
            <div className="flex flex-col items-center justify-center">
              <img
                src="/assets/aistudio/mevo_wordmark_light.png"
                alt="MEVO TECH"
                className="h-14 w-auto object-contain mx-auto"
              />
              <p className="font-['Rajdhani',sans-serif] text-[10px] font-bold text-neutral-500 uppercase tracking-[0.18em] mt-1.5">
                ADMINISTRATIVE OPERATIONS CONSOLE
              </p>
            </div>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              Restricted management console for South African inventory, payment gateways, and order dispatch.
            </p>
          </div>

          {/* Login Form Box */}
          <div className="bg-white rounded-2xl shadow-xl border border-neutral-200/80 p-6 sm:p-8 space-y-5">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Authentication Refused</p>
                  <p className="text-[11px] text-rose-700 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-username-input"
                  className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5"
                >
                  Username or Corporate Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-username-input"
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin or admin@mevotech.co.za"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-neutral-900 font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-password-input"
                  className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="admin-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-neutral-900 font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-neutral-900 hover:bg-purple-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>{isSubmitting ? 'Authenticating Gateway...' : 'Sign In to Admin Portal'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>

            {/* Quick Demo Credentials Card */}
            <div className="pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Authorized Credentials</span>
                </span>
                <span className="text-[10px] text-neutral-400">Click to auto-fill</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleFillDemoCredentials('admin', 'MevoTech@2026!')}
                  className="w-full text-left p-2.5 rounded-xl border border-neutral-200 hover:border-purple-500 hover:bg-purple-50/60 transition-colors flex items-center justify-between group"
                >
                  <div>
                    <p className="font-bold text-neutral-900 group-hover:text-purple-700">Executive Administrator (Owner)</p>
                    <p className="text-[11px] text-neutral-500 font-mono">
                      User: <strong>admin</strong> · Pass: <strong>MevoTech@2026!</strong>
                    </p>
                  </div>
                  <span className="text-[10px] font-bold bg-neutral-100 group-hover:bg-purple-600 group-hover:text-white px-2 py-1 rounded-md transition-colors">
                    Fill
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleFillDemoCredentials('inventory', 'DepotStock@2026!')}
                    className="text-left p-2 rounded-xl border border-neutral-200 hover:border-purple-500 hover:bg-purple-50/60 transition-colors"
                  >
                    <p className="font-bold text-[11px] text-neutral-900">Depot Stock</p>
                    <p className="text-[10px] text-neutral-500 font-mono">inventory / DepotStock@2026!</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFillDemoCredentials('fulfilment', 'Logistics@2026!')}
                    className="text-left p-2 rounded-xl border border-neutral-200 hover:border-purple-500 hover:bg-purple-50/60 transition-colors"
                  >
                    <p className="font-bold text-[11px] text-neutral-900">Logistics Officer</p>
                    <p className="text-[10px] text-neutral-500 font-mono">fulfilment / Logistics@2026!</p>
                  </button>
                </div>
              </div>
            </div>

            {/* Back to Storefront Link */}
            {onBackToStore && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onBackToStore}
                  className="text-xs text-neutral-500 hover:text-neutral-900 hover:underline transition-colors font-medium"
                >
                  ← Return to Public Customer Storefront
                </button>
              </div>
            )}
          </div>

          {/* Security Footer Note */}
          <div className="text-center text-[11px] text-neutral-400 space-y-1">
            <p className="flex items-center justify-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-500" />
              <span>All administrative sessions are cryptographically signed & audited</span>
            </p>
            <p>Mevo Tech (Pty) Ltd · Sandton City Office Tower, Johannesburg</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated: Render Full Admin Console with persistent session header
  return (
    <div className="bg-neutral-50 min-h-screen">
      {/* Top Security & Session Header */}
      <div className="bg-neutral-950 text-neutral-300 border-b border-neutral-800 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/Generated_Image_October_29__2026_-_8_40PM_f8f1a10b.png"
              alt="MEVO TECH"
              className="w-10 h-7 object-cover rounded-md bg-neutral-900 border border-neutral-700 p-0.5 shrink-0"
            />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white uppercase tracking-wider font-mono text-[11px]">
                Secured Session Active
              </span>
            </div>
            <span aria-hidden="true" className="text-neutral-700">|</span>
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Johannesburg Depot Gateway</span>
            </div>
            <span aria-hidden="true" className="text-neutral-700 hidden md:inline">|</span>
            <span className="hidden md:inline text-neutral-400">
              User: <strong className="text-white">{adminUser?.name}</strong> (<span className="capitalize">{adminUser?.role.replace('_', ' ')}</span>)
            </span>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {onBackToStore && (
              <button
                onClick={onBackToStore}
                className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium transition-colors"
              >
                Storefront Preview
              </button>
            )}

            <button
              onClick={adminLogout}
              className="px-3 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Admin Dashboard */}
      <AdminDashboard />
    </div>
  );
};
