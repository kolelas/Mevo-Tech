import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CustomerAccount, ShippingAddress, User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: User;
  switchRole: (role: UserRole) => void;
  isAdmin: boolean;
  isFulfilment: boolean;

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
  }) => Promise<CustomerAccount>;
  customerLogout: () => void;
  updateCustomerProfile: (updates: Partial<CustomerAccount>) => Promise<CustomerAccount>;

  // Customer Auth Modal State
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'register';
  setAuthModalTab: (tab: 'login' | 'register') => void;
  openAuthModal: (tab?: 'login' | 'register') => void;

  // Admin Portal Secure Authentication
  adminUser: User | null;
  isAdminLoggedIn: boolean;
  isCheckingAdminSession: boolean;
  adminLogin: (username: string, password: string) => Promise<User>;
  adminLogout: () => Promise<void>;
}

const DEFAULT_CUSTOMER_USER: User = {
  id: 'usr_customer_default',
  email: 'blacquebeat@gmail.com',
  name: 'Blacque Beat',
  role: 'customer',
  phone: '+27 83 456 7890',
  createdAt: '2026-03-01T08:00:00Z',
};

const CUSTOMER_SESSION_KEY = 'mevo_tech_customer_session_v2';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_CUSTOMER_USER);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isCheckingAdminSession, setIsCheckingAdminSession] = useState<boolean>(true);

  // Customer Account State
  const [customer, setCustomer] = useState<CustomerAccount | null>(() => {
    try {
      const stored = localStorage.getItem(CUSTOMER_SESSION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    // Default pre-loaded session for convenience
    return {
      id: 'cust_blacquebeat',
      email: 'blacquebeat@gmail.com',
      name: 'Blacque Beat',
      phone: '+27 83 456 7890',
      role: 'customer',
      favourites: ['prod_lumina_34_oled', 'prod_aeon_elite_anc'],
      defaultAddress: {
        fullName: 'Blacque Beat',
        email: 'blacquebeat@gmail.com',
        phone: '+27 83 456 7890',
        streetAddress: '14 Rivonia Road',
        suburb: 'Sandhurst',
        city: 'Johannesburg',
        province: 'Gauteng',
        postalCode: '2196',
        deliveryNotes: 'Depot courier dispatch · Ring security buzzer at gate',
      },
      createdAt: '2026-01-15T08:00:00Z',
    };
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  const openAuthModal = useCallback((tab: 'login' | 'register' = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  // Save customer session to localStorage
  useEffect(() => {
    if (customer) {
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(customer));
      setCurrentUser({
        id: customer.id,
        email: customer.email,
        name: customer.name,
        role: 'customer',
        phone: customer.phone,
        createdAt: customer.createdAt,
      });
    } else {
      localStorage.removeItem(CUSTOMER_SESSION_KEY);
      setCurrentUser(DEFAULT_CUSTOMER_USER);
    }
  }, [customer]);

  // Check persistent admin session on mount
  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      try {
        const sessionUser = await api.getAdminSession();
        if (isMounted && sessionUser) {
          setAdminUser(sessionUser);
        }
      } catch (err) {
        console.warn('Admin session check failed', err);
      } finally {
        if (isMounted) {
          setIsCheckingAdminSession(false);
        }
      }
    };

    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

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
  }): Promise<CustomerAccount> => {
    const res = await api.registerCustomer(params);
    setCustomer(res.customer);
    setIsAuthModalOpen(false);
    return res.customer;
  }, []);

  const customerLogout = useCallback(() => {
    setCustomer(null);
  }, []);

  const updateCustomerProfile = useCallback(async (updates: Partial<CustomerAccount>): Promise<CustomerAccount> => {
    if (!customer) throw new Error('No customer is currently logged in');
    const updated = await api.updateCustomerProfile(customer.id, updates);
    setCustomer(updated);
    return updated;
  }, [customer]);

  const adminLogin = useCallback(async (username: string, password: string): Promise<User> => {
    const result = await api.adminLogin(username, password);
    setAdminUser(result.user);
    return result.user;
  }, []);

  const adminLogout = useCallback(async (): Promise<void> => {
    await api.adminLogout();
    setAdminUser(null);
  }, []);

  const switchRole = (role: UserRole) => {
    setCurrentUser({
      id: `usr_${role}`,
      email: `${role}@mevotech.co.za`,
      name: role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' '),
      role,
      phone: '+27 82 555 0100',
      createdAt: '2026-01-15T08:00:00Z',
    });
  };

  const isCustomerLoggedIn = !!customer;
  const isAdminLoggedIn = !!adminUser;
  const isAdmin = isAdminLoggedIn || currentUser.role === 'owner' || currentUser.role === 'admin';
  const isFulfilment = isAdmin || currentUser.role === 'fulfilment_manager' || currentUser.role === 'inventory_manager';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        switchRole,
        isAdmin,
        isFulfilment,
        customer,
        isCustomerLoggedIn,
        customerLogin,
        customerRegister,
        customerLogout,
        updateCustomerProfile,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalTab,
        setAuthModalTab,
        openAuthModal,
        adminUser,
        isAdminLoggedIn,
        isCheckingAdminSession,
        adminLogin,
        adminLogout,
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
