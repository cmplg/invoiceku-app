import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { FileText, Mail, Lock, UserPlus, ArrowLeft } from 'lucide-react';

interface RegisterProps {
  onNavigate: (view: 'login' | 'dashboard') => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function Register({ onNavigate, showToast }: RegisterProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !companyName || !companyAddress) {
      showToast('Harap isi semua kolom', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password minimal 6 karakter', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok', 'error');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        company_name: companyName,
        company_address: companyAddress,
        company_logo_url: '', // blank by default
        created_at: new Date()
      });

      // Create default cash payment method
      await setDoc(doc(db, 'payment_methods', user.uid + '_cash_default'), {
        name: 'Tunai / Cash',
        details: 'Pembayaran secara tunai langsung.',
        is_active: true,
        created_at: new Date(),
        user_id: user.uid
      });

      showToast('Registrasi berhasil! Profil perusahaan telah dibuat.', 'success');
      onNavigate('dashboard');
    } catch (error: any) {
      console.error(error);
      let errMsg = 'Gagal melakukan registrasi';
      if (error.code === 'auth/email-already-in-use') {
        errMsg = 'Email sudah terdaftar';
      } else if (error.code === 'auth/invalid-email') {
        errMsg = 'Format email tidak valid';
      } else if (error.code === 'auth/weak-password') {
        errMsg = 'Password terlalu lemah';
      }
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 px-6 py-12">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <motion.img
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            src="https://ik.imagekit.io/5iflbbg7x/login_img.png?updatedAt=1754964772385"
            alt="InvoiceKu Logo"
            style={{ width: '215px', height: '45px' }}
            className="object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Daftar Akun Baru
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Buat profil perusahaan & mulailah kelola invoice Anda
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-gray-100">
          <form className="space-y-5" onSubmit={handleRegister}>
            {/* Account Info */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    placeholder="Min 6 karakter"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Konfirmasi
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                    placeholder="Ulangi"
                  />
                </div>
              </div>
            </div>

            <hr className="border-gray-200 my-4" />

            {/* Company Info */}
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Profil Perusahaan
            </h3>

            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                Nama Perusahaan
              </label>
              <input
                id="companyName"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="Contoh: CV. Berkah Abadi"
              />
            </div>

            <div>
              <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">
                Alamat Perusahaan
              </label>
              <textarea
                id="companyAddress"
                required
                rows={2}
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="Alamat lengkap, no telepon perusahaan, dsb."
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Daftarkan Akun
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center text-sm font-semibold text-gray-600 hover:text-blue-500"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Kembali ke Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
