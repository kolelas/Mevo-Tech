import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CustomerAccount, CustomerAuthProvider, ShippingAddress, User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: User;

  // Customer Account
  customer: CustomerAccount | null;
  isCustomerLoggedIn: boolean;
  customerLogin: (email: string, password: string) => Promise<CustomerAccount>;
  customerRegister: (params: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: ShippingAddress;
  }) => Promise<{ requiresEmailVerification?: boolean; verificationCode?: string; customer?: CustomerAccount; message?: string }>;
  verifyCustomerEmail: (email: string, code: string) => Promise<CustomerAccount>;
  resendVerificationCode: (email: string) => Promise<string | undefined>;
  customerSocialLogin: (params: {
    provider: CustomerAuthProvider;
    email: string;
    name: string;
    avatar?: string;
    phone?: string;
  }) => Promise<CustomerAccount>;
  customerLogout: () => void;
  updateCustomerProfile: (updates: Partial<CustomerAccount>) => Promise<CustomerAccount>;

  // Customer Auth Modal State
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'register';
  setAuthModalTab: (tab: 'login' | 'register') => void;
  openAuthModal: (tab?: 'login' | 'register', forCheckout?: boolean) => void;
  checkoutIntent: boolean;
  setCheckoutIntent: (intent: boolean) => void;
}

const DEFAULT_CUSTOMER_USER: User = {
  id: 'usr_customer_default',
  email: 'guest@mevotech.co.za',
  name: 'Store Guest',
  role: 'customer',
  phone: '+27 11 884 9200',
  createdAt: '2026-03-01T08:00:00Z',
};

const CUSTOMER_SESSION_KEY = 'mevo_tech_customer_session_v2';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_CUSTOMER_USER);

  // Customer Account State: Defaults strictly to null when no active session exists
  const [customer, setCustomer] = useState<CustomerAccount | null>(() => {
    try {
      const stored = localStorage.getItem(CUSTOMER_SESSION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [checkoutIntent, setCheckoutIntent] = useState<boolean>(false);

  const openAuthModal = useCallback((tab: 'login' | 'register' = 'login', forCheckout: boolean = false) => {
    setAuthModalTab(tab);
    setCheckoutIntent(forCheckout);
    setIsAuthModalOpen(true);
  }, []);

  // Save customer session to localStorage
  useEffect(() => {
    if (customer) {
      try {
        localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(customer));
      } catch {
        // ignore storage errors
      }
      setCurrentUser({
        id: customer.id,
        email: customer.email,
        name: customer.name,
        role: 'customer',
        phone: customer.phone,
        createdAt: customer.createdAt,
      });
    } else {
      try {
        localStorage.removeItem(CUSTOMER_SESSION_KEY);
      } catch {
        // ignore
      }
      setCurrentUser(DEFAULT_CUSTOMER_USER);
    }
  }, [customer]);

  const customerLogin = useCallback(async (email: string, password: string): Promise<CustomerAccount> => {
    const res = await api.loginCustomer(email, password);
    setCustomer(res.customer);
    setIsAuthModalOpen(false);
    return res.customer;
  }, []);

  const customerRegister = useCallback(async (params: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: ShippingAddress;
  }): Promise<{ requiresEmailVerification?: boolean; verificationCode?: string; customer?: CustomerAccount; message?: string }> => {
    const res = await api.registerCustomer(params);
    if (!res.requiresEmailVerification && res.customer) {
      setCustomer(res.customer);
      setIsAuthModalOpen(false);
    }
    return res;
  }, []);

  const verifyCustomerEmail = useCallback(async (email: string, code: string): Promise<CustomerAccount> => {
    const res = await api.verifyCustomerEmail(email, code);
    setCustomer(res.customer);
    setIsAuthModalOpen(false);
    return res.customer;
  }, []);

  const resendVerificationCode = useCallback(async (email: string): Promise<string | undefined> => {
    const res = await api.resendVerificationCode(email);
    return res.verificationCode;
  }, []);

  const customerSocialLogin = useCallback(async (params: {
    provider: CustomerAuthProvider;
    email: string;
    name: string;
    avatar?: string;
    phone?: string;
  }): Promise<CustomerAccount> => {
    const res = await api.socialLoginCustomer(params);
    setCustomer(res.customer);
    setIsAuthModalOpen(false);
    return res.customer;
  }, []);

  const customerLogout = useCallback(() => {
    api.setCustomerToken(null);
    setCustomer(null);
  }, []);

  const updateCustomerProfile = useCallback(async (updates: Partial<CustomerAccount>): Promise<CustomerAccount> => {
    if (!customer) throw new Error('No customer is currently logged in');
    const updated = await api.updateCustomerProfile(customer.id, updates);
    setCustomer(updated);
    return updated;
  }, [customer]);

  const isCustomerLoggedIn = !!customer;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        customer,
        isCustomerLoggedIn,
        customerLogin,
        customerRegister,
        verifyCustomerEmail,
        resendVerificationCode,
        customerSocialLogin,
        customerLogout,
        updateCustomerProfile,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalTab,
        setAuthModalTab,
        openAuthModal,
        checkoutIntent,
        setCheckoutIntent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
