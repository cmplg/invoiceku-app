import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { FileText, Mail, Lock, LogIn, Sparkles } from 'lucide-react';

interface LoginProps {
  onNavigate: (view: 'dashboard' | 'register') => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function Login({ onNavigate, showToast }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Harap isi semua kolom', 'error');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast('Login berhasil!', 'success');
      onNavigate('dashboard');
    } catch (error: any) {
      console.error(error);
      let errMsg = 'Terjadi kesalahan saat login';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errMsg = 'Email atau password salah';
      } else if (error.code === 'auth/invalid-email') {
        errMsg = 'Format email tidak valid';
      }
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;
      
      // Seed default user profile if not exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: 'demo@invoice.com',
          company_name: 'CV. Maju Bersama',
          company_address: 'Jl. Jenderal Sudirman No. 45, Jakarta',
          company_logo_url: '',
          created_at: new Date()
        });

        // Also seed some default payment methods for demo user
        const cashRef = doc(db, 'payment_methods', user.uid + '_cash');
        await setDoc(cashRef, {
          name: 'Cash / Tunai',
          details: 'Bayar tunai di kasir / COD',
          is_active: true,
          created_at: new Date(),
          user_id: user.uid
        });

        const bcaRef = doc(db, 'payment_methods', user.uid + '_bca');
        await setDoc(bcaRef, {
          name: 'Bank BCA',
          details: 'No. Rekening: 8012-345-678 a.n. CV Maju Bersama',
          is_active: true,
          created_at: new Date(),
          user_id: user.uid
        });
      }

      showToast('Masuk dengan Akun Demo!', 'success');
      onNavigate('dashboard');
    } catch (error: any) {
      console.error(error);
      showToast('Gagal masuk sebagai demo: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12" style={{ backgroundColor: '#1c1515' }}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <motion.img
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            src="https://ik.imagekit.io/5iflbbg7x/login_img.png?updatedAt=1754964772385"
            alt="InvoiceKu Logo"
            style={{ width: '215px', height: '45px' }}
            className="object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="py-8 px-6 shadow-xl rounded-2xl border border-neutral-800" style={{ backgroundColor: '#211d1d' }}>
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full px-4 py-3 border border-neutral-700 rounded-xl bg-[#2a2424] placeholder-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full px-4 py-3 border border-neutral-700 rounded-xl bg-[#2a2424] placeholder-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: '#2c2727' }}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-neutral-700 hover:border-neutral-600 rounded-xl shadow-sm text-base font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Masuk
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
