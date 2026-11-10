import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  KeyRound,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import { CustomerAuthProvider } from '../types';

interface AuthModalProps {
  onAuthSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onAuthSuccess }) => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalTab,
    setAuthModalTab,
    checkoutIntent,
    setCheckoutIntent,
    customerLogin,
    customerRegister,
    verifyCustomerEmail,
    resendVerificationCode,
    customerSocialLogin,
  } = useAuth();

  // Active view: 'login' | 'register' | 'confirm_email'
  const [activeStep, setActiveStep] = useState<'login' | 'register' | 'confirm_email'>('login');

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

  // Email Confirmation State
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [suggestedVerificationCode, setSuggestedVerificationCode] = useState<string | null>(null);

  // Social Auth Modal for custom Google / Facebook input
  const [socialPromptProvider, setSocialPromptProvider] = useState<CustomerAuthProvider | null>(null);
  const [socialCustomEmail, setSocialCustomEmail] = useState('');
  const [socialCustomName, setSocialCustomName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync tab from AuthContext
  useEffect(() => {
    if (authModalTab === 'register') {
      setActiveStep('register');
    } else {
      setActiveStep('login');
    }
  }, [authModalTab]);

  // Listen for OAuth popup completion
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        handleSocialAuthenticate('google', 'blacquebeat@gmail.com', 'Blacque Beat');
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setIsAuthModalOpen(false);
    setCheckoutIntent(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handlePostAuthSuccess = () => {
    if (checkoutIntent && onAuthSuccess) {
      onAuthSuccess();
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await customerLogin(loginEmail, loginPassword);
      setSuccessMessage('Successfully signed in!');
      handlePostAuthSuccess();
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
      const res = await customerRegister({
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

      if (res.requiresEmailVerification) {
        setVerificationEmail(regEmail);
        setSuggestedVerificationCode(res.verificationCode || null);
        setActiveStep('confirm_email');
        setSuccessMessage('Registration successful! Please confirm your email address below.');
      } else {
        setSuccessMessage('Account created successfully! Welcome to Mevo Tech.');
        handlePostAuthSuccess();
      }
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please check your details.';
      setErrorMessage(msg);
      if (msg.includes('already exists')) {
        setLoginEmail(regEmail);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCodeInput.trim()) {
      setErrorMessage('Please enter the 6-digit confirmation code.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      await verifyCustomerEmail(verificationEmail, verificationCodeInput.trim());
      setSuccessMessage('Email verified successfully! Redirecting to payment...');
      setTimeout(() => {
        handlePostAuthSuccess();
      }, 400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!verificationEmail) return;
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const newCode = await resendVerificationCode(verificationEmail);
      if (newCode) {
        setSuggestedVerificationCode(newCode);
      }
      setSuccessMessage(`New 6-digit confirmation code sent to ${verificationEmail}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend confirmation code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuthenticate = async (
    provider: CustomerAuthProvider,
    email: string,
    name: string,
    avatar?: string
  ) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await customerSocialLogin({
        provider,
        email,
        name,
        avatar,
        phone: '+27 83 456 7890',
      });
      setSocialPromptProvider(null);
      setSuccessMessage('Authenticated successfully!');
      handlePostAuthSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || `${provider === 'google' ? 'Google' : 'Facebook'} authentication failed.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialPromptProvider || !socialCustomEmail.trim()) return;

    handleSocialAuthenticate(
      socialPromptProvider,
      socialCustomEmail.trim(),
      socialCustomName.trim() || (socialPromptProvider === 'google' ? 'Gmail User' : 'Facebook User'),
      socialPromptProvider === 'google'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        : undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-neutral-200">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-orange-950 p-6 text-white relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-widest mb-1.5">
            <Sparkles className="w-4 h-4" />
            <span>Mevo Tech Customer Portal</span>
          </div>

          <h2 className="text-xl font-black tracking-tight">
            {activeStep === 'confirm_email'
              ? 'Confirm Your Email'
              : activeStep === 'login'
              ? 'Sign in to Your Account'
              : 'Create Customer Account'}
          </h2>

          <p className="text-xs text-neutral-300 mt-1">
            {activeStep === 'confirm_email'
              ? 'Enter the 6-digit verification code to confirm your email and proceed to payment.'
              : checkoutIntent
              ? 'Account required: Please sign in or register before completing your checkout.'
              : 'Access order delivery tracking, post hardware reviews, and manage your wishlist.'}
          </p>

          {/* Checkout Continuation Notice Badge */}
          {checkoutIntent && (
            <div className="mt-3 py-1.5 px-3 rounded-lg bg-orange-500/20 border border-orange-400/40 text-[11px] font-semibold text-orange-200 flex items-center gap-2">
              <ShoppingBag className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>Checkout pending: Complete login or registration to proceed directly to payment.</span>
            </div>
          )}

          {/* Tab Switcher (Visible on login & register) */}
          {activeStep !== 'confirm_email' && (
            <div className="mt-4 grid grid-cols-2 p-1 bg-neutral-800/80 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveStep('register');
                  setAuthModalTab('register');
                  setErrorMessage(null);
                  setSocialPromptProvider(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  activeStep === 'register'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                1. Register New Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveStep('login');
                  setAuthModalTab('login');
                  setErrorMessage(null);
                  setSocialPromptProvider(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  activeStep === 'login'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                2. Sign In (Existing)
              </button>
            </div>
          )}
        </div>

        {/* Form Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Access Alert</p>
                <p className="mt-0.5 text-rose-700 leading-relaxed">{errorMessage}</p>
                {errorMessage.includes('already exists') && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStep('login');
                      setAuthModalTab('login');
                      setErrorMessage(null);
                    }}
                    className="mt-2 text-xs font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 px-3 py-1 rounded-lg transition-colors cursor-pointer inline-block"
                  >
                    Click to Sign In with {regEmail} →
                  </button>
                )}
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* STEP 3: CONFIRM EMAIL ADDRESS */}
          {activeStep === 'confirm_email' ? (
            <form onSubmit={handleVerifyEmailSubmit} className="space-y-4 text-xs">
              <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-orange-900 font-bold text-xs">
                  <Mail className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>Verification Email Dispatched</span>
                </div>
                <p className="text-[11px] text-neutral-600">
                  We've sent a 6-digit confirmation code to: <strong className="text-neutral-900">{verificationEmail}</strong>
                </p>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1.5">
                  Enter 6-Digit Confirmation Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCodeInput}
                    onChange={(e) => setVerificationCodeInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 123456"
                    className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-center tracking-widest text-base font-bold text-neutral-900"
                  />
                </div>
              </div>

              {/* Development Convenience: Auto-fill Demo Verification Code */}
              {suggestedVerificationCode && (
                <div className="p-2.5 bg-neutral-100 rounded-xl border border-neutral-200 flex items-center justify-between">
                  <span className="text-[11px] text-neutral-500">
                    Test Code: <strong className="font-mono text-neutral-800">{suggestedVerificationCode}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setVerificationCodeInput(suggestedVerificationCode)}
                    className="text-[11px] font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
                  >
                    Auto-Fill Code
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                <span>{isLoading ? 'Confirming Code...' : 'Confirm Email & Proceed to Payment'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between pt-2 text-[11px]">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleResendCode}
                  className="text-neutral-500 hover:text-neutral-800 flex items-center gap-1 font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Resend Confirmation Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveStep('register');
                    setAuthModalTab('register');
                  }}
                  className="text-orange-600 font-bold hover:underline cursor-pointer"
                >
                  Back to Registration
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* SOCIAL SINGLE SIGN-ON (GOOGLE / GMAIL & FACEBOOK) */}
              {!socialPromptProvider ? (
                <div className="space-y-3 mb-5">
                  {/* Google / Gmail Button */}
                  <button
                    type="button"
                    onClick={() => handleSocialAuthenticate('google', 'blacquebeat@gmail.com', 'Blacque Beat')}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 text-neutral-800 font-bold border border-neutral-300 rounded-xl shadow-xs transition-all flex items-center justify-center gap-3 text-xs cursor-pointer disabled:opacity-50 group hover:border-orange-300"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google / Gmail</span>
                  </button>

                  {/* Facebook Button */}
                  <button
                    type="button"
                    onClick={() => handleSocialAuthenticate('facebook', 'sipho.dlm@facebook-login.co.za', 'Sipho Dlamini')}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-3 text-xs cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>Continue with Facebook</span>
                  </button>

                  {/* Custom Social Login option */}
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5 px-1">
                    <span>Use another Google or Facebook account:</span>
                    <button
                      type="button"
                      onClick={() => setSocialPromptProvider('google')}
                      className="text-orange-600 font-bold hover:underline cursor-pointer"
                    >
                      Choose account
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-neutral-200"></div>
                    <span className="flex-shrink mx-3 text-neutral-400 text-[11px] font-semibold uppercase tracking-wider">
                      Or with email &amp; password
                    </span>
                    <div className="flex-grow border-t border-neutral-200"></div>
                  </div>
                </div>
              ) : (
                /* Custom Social Account Input Modal */
                <form onSubmit={handleSocialPromptSubmit} className="mb-5 p-4 bg-neutral-50 rounded-xl border border-neutral-300 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {socialPromptProvider === 'google' ? (
                        <span className="font-bold text-neutral-900">Sign in with custom Gmail</span>
                      ) : (
                        <span className="font-bold text-neutral-900">Sign in with custom Facebook</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSocialPromptProvider(null)}
                      className="text-neutral-400 hover:text-neutral-600 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      {socialPromptProvider === 'google' ? 'Google / Gmail Address' : 'Facebook Email / Username'}
                    </label>
                    <input
                      type="email"
                      required
                      value={socialCustomEmail}
                      onChange={(e) => setSocialCustomEmail(e.target.value)}
                      placeholder={socialPromptProvider === 'google' ? 'e.g. yourname@gmail.com' : 'e.g. user@facebook.com'}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={socialCustomName}
                      onChange={(e) => setSocialCustomName(e.target.value)}
                      placeholder="e.g. Sipho Ndlovu"
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? 'Authenticating...' : `Proceed with ${socialPromptProvider === 'google' ? 'Google' : 'Facebook'}`}
                  </button>
                </form>
              )}

              {/* SIGN IN FORM */}
              {activeStep === 'login' ? (
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
                        className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-neutral-700">Password</label>
                      <span className="text-[11px] text-orange-600 font-medium">Bcrypt Encrypted</span>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-9 pr-3 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    <span>
                      {isLoading
                        ? 'Authenticating...'
                        : checkoutIntent
                        ? 'Sign In & Proceed to Payment'
                        : 'Sign In with Email'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-2">
                    <span className="text-neutral-500">Need a new account? </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStep('register');
                        setAuthModalTab('register');
                        setErrorMessage(null);
                      }}
                      className="font-bold text-orange-600 hover:underline cursor-pointer"
                    >
                      Register here
                    </button>
                  </div>
                </form>
              ) : (
                /* REGISTER FORM */
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Sindi Molefe"
                        className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">Email Address (For Confirmation)</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="e.g. sindi@example.co.za"
                        className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">South African Phone</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="tel"
                          required
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="+27 82 123 4567"
                          className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address (Optional during registration) */}
                  <div className="pt-2 border-t border-neutral-200">
                    <span className="block font-bold text-neutral-800 mb-2">Default Delivery Address (Optional)</span>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={regStreet}
                        onChange={(e) => setRegStreet(e.target.value)}
                        placeholder="Street Address (e.g. 14 Rivonia Road)"
                        className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={regCity}
                          onChange={(e) => setRegCity(e.target.value)}
                          placeholder="City / Metro"
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                        />
                        <select
                          value={regProvince}
                          onChange={(e) => setRegProvince(e.target.value)}
                          className="w-full px-2 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
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
                          className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
                  >
                    <span>{isLoading ? 'Creating Account...' : 'Register & Confirm Email'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center pt-1">
                    <span className="text-neutral-500">Already have an account? </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStep('login');
                        setAuthModalTab('login');
                        setErrorMessage(null);
                      }}
                      className="font-bold text-orange-600 hover:underline cursor-pointer"
                    >
                      Sign in here
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
