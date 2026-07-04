import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { PaymentMethod } from '../types';
import { 
  User, 
  Building2, 
  CreditCard, 
  Lock, 
  LogOut, 
  Upload, 
  Plus, 
  Trash2, 
  Check, 
  ToggleLeft, 
  ToggleRight,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface SettingsProps {
  userId: string;
  companyName: string;
  companyAddress: string;
  companyLogoUrl: string;
  onProfileUpdated: () => void;
  onNavigate: (view: 'dashboard' | 'create' | 'list' | 'settings') => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function Settings({ 
  userId, 
  companyName, 
  companyAddress, 
  companyLogoUrl, 
  onProfileUpdated, 
  onNavigate, 
  showToast 
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'payment' | 'account'>('profile');
  const [loading, setLoading] = useState(false);

  // Profile Form States
  const [localCompanyName, setLocalCompanyName] = useState(companyName);
  const [localCompanyAddress, setLocalCompanyAddress] = useState(companyAddress);
  const [localCompanyLogoUrl, setLocalCompanyLogoUrl] = useState(companyLogoUrl);

  // Payment Methods States
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [newPayName, setNewPayName] = useState('');
  const [newPayDetails, setNewPayDetails] = useState('');

  // Account Settings States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch Payment Methods
  const fetchPaymentMethods = async () => {
    try {
      const q = query(
        collection(db, 'payment_methods'),
        where('user_id', '==', userId)
      );
      const snap = await getDocs(q);
      const methods: PaymentMethod[] = [];
      snap.forEach((d) => {
        methods.push({ id: d.id, ...d.data() } as PaymentMethod);
      });
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error fetching payment methods in settings:', error);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [userId]);

  // Handle Logo Upload via FileReader
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // Limit to 1MB
      showToast('Logo tidak boleh lebih dari 1MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLocalCompanyLogoUrl(reader.result as string);
      showToast('Logo berhasil diunggah ke pratinjau! Klik Simpan.', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Update Profile
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const docRef = doc(db, 'users', userId);
      await setDoc(docRef, {
        email: auth.currentUser?.email || '',
        company_name: localCompanyName,
        company_address: localCompanyAddress,
        company_logo_url: localCompanyLogoUrl || '',
        updated_at: new Date()
      }, { merge: true });

      onProfileUpdated();
      showToast('Profil Perusahaan berhasil diperbarui!', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Gagal memperbarui profil', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add Payment Method
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayName || !newPayDetails) {
      showToast('Harap isi nama dan rincian bank', 'error');
      return;
    }

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'payment_methods'), {
        name: newPayName,
        details: newPayDetails,
        is_active: true,
        created_at: new Date(),
        user_id: userId
      });

      const newMethod: PaymentMethod = {
        id: docRef.id,
        name: newPayName,
        details: newPayDetails,
        is_active: true,
        created_at: new Date(),
        user_id: userId
      };

      setPaymentMethods([newMethod, ...paymentMethods]);
      setNewPayName('');
      setNewPayDetails('');
      showToast('Metode pembayaran ditambahkan!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Gagal menyimpan metode pembayaran', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle Payment Status (Active/Inactive)
  const handleTogglePayment = async (methodId: string, currentStatus: boolean) => {
    try {
      const ref = doc(db, 'payment_methods', methodId);
      await updateDoc(ref, { is_active: !currentStatus });

      setPaymentMethods(paymentMethods.map(m => 
        m.id === methodId ? { ...m, is_active: !currentStatus } : m
      ));
      showToast('Status metode diperbarui', 'success');
    } catch (error) {
      console.error(error);
      showToast('Gagal memperbarui status metode', 'error');
    }
  };

  // Delete Payment Method
  const handleDeletePayment = async (methodId: string) => {
    try {
      await deleteDoc(doc(db, 'payment_methods', methodId));
      setPaymentMethods(paymentMethods.filter(m => m.id !== methodId));
      showToast('Metode pembayaran berhasil dihapus', 'success');
    } catch (error) {
      console.error(error);
      showToast('Gagal menghapus metode', 'error');
    }
  };

  // Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      showToast('Harap isi password baru dan konfirmasi', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password minimal 6 karakter', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Password konfirmasi tidak cocok', 'error');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, newPassword);
        setNewPassword('');
        setConfirmPassword('');
        showToast('Password berhasil diperbarui!', 'success');
      } else {
        showToast('Sesi kedaluwarsa, silakan masuk kembali', 'error');
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        showToast('Silakan login ulang untuk melakukan aksi keamanan ini', 'error');
      } else {
        showToast('Gagal memperbarui password: ' + error.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Header navigation tabs list
  const tabs = [
    { id: 'profile', label: 'Profil', icon: <Building2 className="w-4 h-4" /> },
    { id: 'payment', label: 'Metode Bayar', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'account', label: 'Keamanan', icon: <Lock className="w-4 h-4" /> }
  ];

  return (
    <div className="container pb-28">
      {/* Settings Navigation Menu */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 mb-4">
        <h1 className="text-lg font-bold text-gray-900 leading-tight">Pengaturan</h1>
        
        {/* Horizontal Navigation Tabs */}
        <div className="flex border-b border-gray-100 pt-1 text-xs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1 pb-2.5 font-bold cursor-pointer transition-colors relative ${
                  isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.icon}
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="space-y-4">
        {/* Tab 1: Profil Perusahaan */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-5 animate-fade-in">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">Profil Perusahaan</h2>
            
            {/* Logo Upload Box */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-500">Logo Perusahaan</label>
              <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                <div className="h-16 w-16 rounded-xl border border-gray-100 bg-white flex items-center justify-center text-gray-400 font-bold overflow-hidden shadow-sm">
                  {localCompanyLogoUrl ? (
                    <img 
                      src={localCompanyLogoUrl} 
                      alt="Logo Perusahaan" 
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="inline-flex items-center justify-center py-2 px-3 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 cursor-pointer shadow-sm">
                    <Upload className="w-3.5 h-3.5 mr-1 text-gray-500" />
                    Pilih Logo Baru
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload} 
                      className="hidden" 
                    />
                  </label>
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Format JPG, PNG. Maksimal ukuran file 1MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="compName" className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Nama Perusahaan</label>
              <input
                id="compName"
                type="text"
                required
                value={localCompanyName}
                onChange={(e) => setLocalCompanyName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                placeholder="Contoh: CV. Maju Jaya"
              />
            </div>

            {/* Company Address */}
            <div>
              <label htmlFor="compAddress" className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Alamat Lengkap Perusahaan</label>
              <textarea
                id="compAddress"
                required
                rows={3}
                value={localCompanyAddress}
                onChange={(e) => setLocalCompanyAddress(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold leading-relaxed"
                placeholder="Alamat kantor, nomor kontak, website, dsb."
              />
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3.5 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-700 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  Simpan Perubahan Profil
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Metode Pembayaran */}
        {activeTab === 'payment' && (
          <div className="space-y-4 animate-fade-in">
            {/* Add Payment Method Form Card */}
            <form onSubmit={handleAddPayment} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">Tambah Rekening Baru</h2>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Nama Bank / Kas</label>
                  <input
                    type="text"
                    required
                    value={newPayName}
                    onChange={(e) => setNewPayName(e.target.value)}
                    placeholder="BCA, Mandiri, Cash"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Detail No Rekening / Nama</label>
                  <input
                    type="text"
                    required
                    value={newPayDetails}
                    onChange={(e) => setNewPayDetails(e.target.value)}
                    placeholder="1234567 a/n Budi"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-gray-50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambahkan Rekening
              </button>
            </form>

            {/* Saved Payment Methods List Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">Metode Tersimpan</h2>
              
              {paymentMethods.length === 0 ? (
                <p className="text-xs text-gray-400 font-semibold text-center py-4">Belum ada metode pembayaran disimpan.</p>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div 
                      key={method.id} 
                      className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between"
                    >
                      <div className="space-y-0.5 pr-2">
                        <span className="font-bold text-xs text-gray-900">{method.name}</span>
                        <p className="text-[10px] text-gray-500 leading-tight whitespace-pre-wrap">{method.details}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Active status Toggle */}
                        <button
                          type="button"
                          onClick={() => handleTogglePayment(method.id!, method.is_active)}
                          className={`p-1 rounded hover:bg-gray-100 cursor-pointer ${method.is_active ? 'text-blue-600' : 'text-gray-400'}`}
                        >
                          {method.is_active ? (
                            <ToggleRight className="w-8 h-8" />
                          ) : (
                            <ToggleLeft className="w-8 h-8" />
                          )}
                        </button>
                        
                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(method.id!)}
                          className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Akun & Keamanan */}
        {activeTab === 'account' && (
          <form onSubmit={handleUpdatePassword} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-5 animate-fade-in">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">Keamanan & Password</h2>
            
            <div>
              <label htmlFor="newPass" className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Password Baru</label>
              <input
                id="newPass"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                placeholder="Minimal 6 karakter"
              />
            </div>

            <div>
              <label htmlFor="confirmPass" className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Konfirmasi Password Baru</label>
              <input
                id="confirmPass"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                placeholder="Ulangi password baru"
              />
            </div>

            {/* Reset Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3.5 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-700 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-1.5" />
                  Ganti Password
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
