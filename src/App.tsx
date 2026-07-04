import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

// Subcomponents
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import InvoiceForm from './components/InvoiceForm';
import ListInvoices from './components/ListInvoices';
import ViewInvoice from './components/ViewInvoice';
import Settings from './components/Settings';
import BottomNav, { NavView } from './components/BottomNav';
import Toast, { ToastType } from './components/Toast';

// CSS classes
import './index.css';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{
    company_name: string;
    company_address: string;
    company_logo_url: string;
  } | null>(null);
  
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Navigation View State
  const [view, setView] = useState<NavView | 'login' | 'register' | 'detail' | 'edit'>('login');
  
  // Selected Invoice IDs for detail/edit views
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | undefined>(undefined);

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // PWA Registration
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
          .catch((err) => console.warn('Service Worker registration failed:', err));
      });
    }
  }, []);

  // Monitor Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setProfileLoading(true);
        await fetchUserProfile(currentUser.uid);
        setView('dashboard');
      } else {
        setProfile(null);
        setView('login');
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Company Profile from Firestore
  const fetchUserProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          company_name: data.company_name || '',
          company_address: data.company_address || '',
          company_logo_url: data.company_logo_url || '',
        });
      } else {
        setProfile({
          company_name: '',
          company_address: '',
          company_logo_url: '',
        });
      }
    } catch (error) {
      console.error('Error loading company profile:', error);
      triggerToast('Gagal memuat profil perusahaan', 'error');
    } finally {
      setProfileLoading(false);
    }
  };

  // Safe wrapper to re-fetch when profile is updated in Settings
  const handleProfileUpdated = () => {
    if (user) {
      fetchUserProfile(user.uid);
    }
  };

  // Helper to show custom dynamic toasts
  const triggerToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  // Handle Bottom Nav or general view switches
  const handleNavigation = (nextView: NavView | 'detail' | 'edit', invoiceId?: string) => {
    if (invoiceId) {
      setSelectedInvoiceId(invoiceId);
    }
    setView(nextView);
  };

  // Logout Handler
  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin keluar?')) {
      try {
        await signOut(auth);
        triggerToast('Anda telah keluar dari aplikasi', 'info');
        setView('login');
      } catch (error) {
        console.error('Error during logout:', error);
        triggerToast('Gagal melakukan logout', 'error');
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold text-gray-500">Menyiapkan Aplikasi...</p>
      </div>
    );
  }

  // Choose component to render based on State
  const renderViewContent = () => {
    switch (view) {
      case 'login':
        return <Login onNavigate={(v) => setView(v)} showToast={triggerToast} />;
      case 'register':
        return <Register onNavigate={(v) => setView(v)} showToast={triggerToast} />;
      case 'dashboard':
        return (
          <Dashboard 
            userId={user?.uid} 
            companyName={profile?.company_name || ''} 
            onNavigate={handleNavigation} 
            showToast={triggerToast} 
          />
        );
      case 'create':
        return (
          <InvoiceForm 
            userId={user?.uid}
            companyName={profile?.company_name || ''}
            companyAddress={profile?.company_address || ''}
            companyLogoUrl={profile?.company_logo_url || ''}
            onNavigate={handleNavigation}
            showToast={triggerToast}
          />
        );
      case 'edit':
        return (
          <InvoiceForm 
            userId={user?.uid}
            companyName={profile?.company_name || ''}
            companyAddress={profile?.company_address || ''}
            companyLogoUrl={profile?.company_logo_url || ''}
            editInvoiceId={selectedInvoiceId}
            onNavigate={handleNavigation}
            showToast={triggerToast}
          />
        );
      case 'list':
        return (
          <ListInvoices 
            userId={user?.uid} 
            onNavigate={handleNavigation} 
            showToast={triggerToast} 
          />
        );
      case 'detail':
        return (
          <ViewInvoice 
            userId={user?.uid} 
            invoiceId={selectedInvoiceId || ''} 
            onNavigate={handleNavigation} 
            showToast={triggerToast} 
          />
        );
      case 'settings':
        return (
          <Settings 
            userId={user?.uid}
            companyName={profile?.company_name || ''}
            companyAddress={profile?.company_address || ''}
            companyLogoUrl={profile?.company_logo_url || ''}
            onProfileUpdated={handleProfileUpdated}
            onNavigate={handleNavigation}
            showToast={triggerToast}
          />
        );
      default:
        return <Login onNavigate={(v) => setView(v)} showToast={triggerToast} />;
    }
  };

  const isAuthView = view === 'login' || view === 'register';

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      {/* Centered Desktop Wrapper mimicking Mobile Native Viewport */}
      <div className="w-full max-w-[480px] bg-gray-50 min-h-screen relative shadow-2xl flex flex-col overflow-x-hidden border-x border-gray-200/50">
        
        {/* Dynamic Screen View Content with AnimatePresence */}
        <div className="flex-1 w-full">
          {renderViewContent()}
        </div>

        {/* Bottom Menu Navigation for logged-in screens */}
        {!isAuthView && user && (
          <BottomNav 
            currentView={view} 
            onNavigate={handleNavigation} 
            onLogout={handleLogout} 
          />
        )}

        {/* Custom Toast Alerts Notifications */}
        <AnimatePresence>
          {toast && (
            <Toast 
              message={toast.message} 
              type={toast.type} 
              onClose={() => setToast(null)} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
