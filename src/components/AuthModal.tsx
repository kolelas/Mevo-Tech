import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, User, Phone, MapPin, ArrowRight, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalTab,
    setAuthModalTab,
    customerLogin,
    customerRegister,
  } = useAuth();

  const [loginEmail, setLoginEmail] = useState('blacquebeat@gmail.com');
  const [loginPassword, setLoginPassword] = useState('Password@2026');

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('+27 ');
  const [regStreet, setRegStreet] = useState('');
  const [regCity, setRegCity] = useState('Johannesburg');
  const [regProvince, setRegProvince] = useState('Gauteng');
  const [regPostal, setRegPostal] = useState('2196');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await customerLogin(loginEmail, loginPassword);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await customerRegister({
        name: regName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        address: regStreet
          ? {
              fullName: regName,
              email: regEmail,
              phone: regPhone,
              streetAddress: regStreet,
              suburb: 'Central',
              city: regCity,
              province: regProvince,
              postalCode: regPostal,
            }
          : undefined,
      });
      setSuccessMessage('Account created successfully! Welcome to Mevo Tech.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoCustomer = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await customerLogin('blacquebeat@gmail.com', 'Password@2026');
    } catch (err: any) {
      setErrorMessage(err.message || 'Quick login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-neutral-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-purple-950 p-6 text-white relative">
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-widest mb-1.5">
            <Sparkles className="w-4 h-4" />
            <span>Mevo Tech Customer Portal</span>
          </div>
          <h2 className="text-xl font-black tracking-tight">
            {authModalTab === 'login' ? 'Sign in to Your Account' : 'Create Customer Account'}
          </h2>
          <p className="text-xs text-neutral-300 mt-1">
            Access order delivery tracking, post hardware reviews, and manage your wishlist.
          </p>

          {/* Tab Switcher */}
          <div className="mt-5 grid grid-cols-2 p-1 bg-neutral-800/80 rounded-xl text-xs font-bold">
            <button
              onClick={() => {
                setAuthModalTab('login');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                authModalTab === 'login'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthModalTab('register');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                authModalTab === 'register'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* Quick Demo One-Click Login */}
          {authModalTab === 'login' && (
            <div className="mb-5 p-3.5 bg-purple-50 rounded-xl border border-purple-200/80 text-xs text-purple-900 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold">Instant Demo Login</p>
                <p className="text-[11px] text-purple-700">Preloaded with purchased items &amp; tracking: <strong>blacquebeat@gmail.com</strong></p>
              </div>
              <button
                type="button"
                onClick={handleQuickDemoCustomer}
                disabled={isLoading}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shrink-0 transition-colors cursor-pointer text-xs"
              >
                1-Click Login
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {authModalTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. blacquebeat@gmail.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-neutral-700">Password</label>
                  <span className="text-[11px] text-neutral-500">Default: Password@2026</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Signing in...' : 'Sign In to Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <span className="text-neutral-500">Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => setAuthModalTab('register')}
                  className="font-bold text-purple-600 hover:underline cursor-pointer"
                >
                  Create one now
                </button>
              </div>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Sipho Ndlovu"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. sipho@example.co.za"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">SA Mobile (+27)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+27 82 123 4567"
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Delivery Address */}
              <div className="pt-2 border-t border-neutral-200">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-2">
                  Default Delivery Address (Optional)
                </span>
                <div className="space-y-2">
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={regStreet}
                      onChange={(e) => setRegStreet(e.target.value)}
                      placeholder="Street Address (e.g. 14 Rivonia Road)"
                      className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      placeholder="City"
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                    />
                    <select
                      value={regProvince}
                      onChange={(e) => setRegProvince(e.target.value)}
                      className="w-full px-2 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                    >
                      <option value="Gauteng">Gauteng</option>
                      <option value="Western Cape">Western Cape</option>
                      <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                      <option value="Eastern Cape">Eastern Cape</option>
                      <option value="Free State">Free State</option>
                      <option value="Mpumalanga">Mpumalanga</option>
                      <option value="Limpopo">Limpopo</option>
                      <option value="North West">North West</option>
                      <option value="Northern Cape">Northern Cape</option>
                    </select>
                    <input
                      type="text"
                      value={regPostal}
                      onChange={(e) => setRegPostal(e.target.value)}
                      placeholder="Postal Code"
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
              >
                <span>{isLoading ? 'Creating Account...' : 'Complete Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-1">
                <span className="text-neutral-500">Already registered? </span>
                <button
                  type="button"
                  onClick={() => setAuthModalTab('login')}
                  className="font-bold text-purple-600 hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
