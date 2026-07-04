import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, deleteDoc, writeBatch, orderBy } from 'firebase/firestore';
import { Invoice } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Eye, 
  Calendar, 
  X, 
  CheckCircle, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';

interface ListInvoicesProps {
  userId: string;
  onNavigate: (view: 'dashboard' | 'create' | 'list' | 'detail' | 'edit', invoiceId?: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function ListInvoices({ userId, onNavigate, showToast }: ListInvoicesProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'lunas' | 'belum_lunas'>('semua');
  
  // Deletion Confirmation Modal State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'invoices'),
        where('user_id', '==', userId),
        orderBy('invoice_date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const fetchedInvoices: Invoice[] = [];
      querySnapshot.forEach((doc) => {
        fetchedInvoices.push({ id: doc.id, ...doc.data() } as Invoice);
      });
      setInvoices(fetchedInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      showToast('Gagal memuat daftar invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [userId]);

  const handleDelete = async (invoiceId: string) => {
    try {
      // 1. Delete matching invoice items in a batch or loop
      const itemsQ = query(
        collection(db, 'invoice_items'),
        where('invoice_id', '==', invoiceId)
      );
      const itemsSnap = await getDocs(itemsQ);
      const batch = writeBatch(db);
      itemsSnap.forEach((itemDoc) => {
        batch.delete(doc(db, 'invoice_items', itemDoc.id));
      });
      await batch.commit();

      // 2. Delete the invoice itself
      await deleteDoc(doc(db, 'invoices', invoiceId));

      setInvoices(invoices.filter((inv) => inv.id !== invoiceId));
      showToast('Invoice berhasil dihapus', 'success');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      showToast('Gagal menghapus invoice', 'error');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const formatIDR = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Filter & Search Logic
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'semua') return matchesSearch;
    return matchesSearch && inv.status === statusFilter;
  });

  return (
    <div className="container pb-28">
      {/* Search Header */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 mb-4">
        <h1 className="text-lg font-bold text-gray-900 leading-tight">Daftar Invoice</h1>
        
        {/* Search Bar */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari No. Invoice / Nama Customer..."
            className="w-full pl-10 pr-9 py-2.5 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filters Tab */}
        <div className="flex border-b border-gray-100 pt-1 text-xs">
          {(['semua', 'lunas', 'belum_lunas'] as const).map((status) => {
            const isActive = statusFilter === status;
            const labels = {
              semua: 'Semua',
              lunas: 'Lunas',
              belum_lunas: 'Belum Lunas'
            };
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex-1 text-center pb-2.5 font-bold cursor-pointer transition-colors relative ${
                  isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {labels[status]}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        /* Skeletons */
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white p-4 rounded-2xl h-36 border border-gray-100"></div>
          ))}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
          <p className="text-gray-400 text-sm font-semibold mb-2">Tidak ada invoice ditemukan</p>
          <p className="text-gray-400 text-xs">Coba cari kata kunci lain atau buat invoice baru.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-blue-100 transition-all flex flex-col justify-between space-y-3"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-bold text-sm text-gray-900 leading-tight">
                    {invoice.invoice_number}
                  </span>
                  <p className="text-xs text-gray-500 font-semibold mt-0.5">
                    {invoice.customer_name}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  invoice.status === 'lunas'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}>
                  {invoice.status === 'lunas' ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Lunas
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 text-rose-600" />
                      Belum Lunas
                    </>
                  )}
                </span>
              </div>

              {/* Card Mid: Dates */}
              <div className="flex items-center gap-4 text-[10px] text-gray-400 font-medium">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Inv: {new Date(invoice.invoice_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {invoice.event_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Acara: {new Date(invoice.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Card Bottom: Total & Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <div>
                  <span className="text-[10px] text-gray-400 block">Grand Total</span>
                  <span className="text-base font-extrabold text-gray-900">
                    {formatIDR(invoice.grand_total)}
                  </span>
                </div>

                {/* Inline Quick Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onNavigate('detail', invoice.id)}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl cursor-pointer transition-colors"
                    title="Lihat Detail"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onNavigate('edit', invoice.id)}
                    className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-xl cursor-pointer transition-colors"
                    title="Edit Invoice"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(invoice.id || null)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl cursor-pointer transition-colors"
                    title="Hapus Invoice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button (FAB) for new invoice */}
      <button
        onClick={() => onNavigate('create')}
        className="fixed bottom-[88px] right-6 bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 active:scale-95 transition-all cursor-pointer z-[99]"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-[340px] w-full p-5 space-y-4 shadow-xl text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900 text-base">Hapus Invoice ini?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Semua item terkait invoice ini juga akan dihapus.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="py-2.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
