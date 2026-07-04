import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  writeBatch 
} from 'firebase/firestore';
import { Invoice, InvoiceItem, PaymentMethod } from '../types';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  CreditCard, 
  PlusCircle, 
  User, 
  Building2, 
  FileText 
} from 'lucide-react';

interface InvoiceFormProps {
  userId: string;
  companyName: string;
  companyAddress: string;
  companyLogoUrl: string;
  editInvoiceId?: string; // If provided, we are in Edit mode
  onNavigate: (view: 'dashboard' | 'list' | 'detail', invoiceId?: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function InvoiceForm({ 
  userId, 
  companyName, 
  companyAddress, 
  companyLogoUrl, 
  editInvoiceId, 
  onNavigate, 
  showToast 
}: InvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(!!editInvoiceId);

  // Form Fields
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventDate, setEventDate] = useState('');
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Payment choice
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  
  // New Payment Method Form
  const [newPayName, setNewPayName] = useState('');
  const [newPayDetails, setNewPayDetails] = useState('');

  // Items List
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, price: 0, total: 0 }
  ]);

  // Payment summary
  const [paidDp, setPaidDp] = useState<number>(0);

  // Load payment methods
  const fetchPaymentMethods = async () => {
    try {
      const q = query(
        collection(db, 'payment_methods'),
        where('user_id', '==', userId),
        where('is_active', '==', true)
      );
      const snap = await getDocs(q);
      const methods: PaymentMethod[] = [];
      snap.forEach((d) => {
        methods.push({ id: d.id, ...d.data() } as PaymentMethod);
      });
      setPaymentMethods(methods);
      if (methods.length > 0 && !paymentMethodId) {
        setPaymentMethodId(methods[0].id || '');
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [userId]);

  // Handle Edit Mode: Load Invoice
  useEffect(() => {
    if (!editInvoiceId) {
      generateInvoiceNumber();
      return;
    }

    const loadInvoiceData = async () => {
      setFetchingData(true);
      try {
        const docRef = doc(db, 'invoices', editInvoiceId);
        const querySnapshot = await getDocs(query(
          collection(db, 'invoice_items'),
          where('invoice_id', '==', editInvoiceId)
        ));
        
        // Fetch original invoice details
        const invoiceSnap = await getDocs(query(collection(db, 'invoices')));
        const originalInvoiceDoc = invoiceSnap.docs.find(d => d.id === editInvoiceId);
        
        if (originalInvoiceDoc && originalInvoiceDoc.exists()) {
          const inv = originalInvoiceDoc.data() as Invoice;
          setInvoiceNumber(inv.invoice_number);
          setInvoiceDate(inv.invoice_date);
          setEventDate(inv.event_date || '');
          setCustomerName(inv.customer_name);
          setCustomerAddress(inv.customer_address);
          setCustomerPhone(inv.customer_phone);
          setPaymentMethodId(inv.payment_method_id);
          setPaidDp(inv.paid_dp || 0);

          // Items load
          const invoiceItems: InvoiceItem[] = [];
          querySnapshot.forEach((itemDoc) => {
            invoiceItems.push({ id: itemDoc.id, ...itemDoc.data() } as InvoiceItem);
          });
          if (invoiceItems.length > 0) {
            setItems(invoiceItems);
          } else if (inv.items && inv.items.length > 0) {
            setItems(inv.items);
          }
        }
      } catch (error) {
        console.error('Error loading invoice for editing:', error);
        showToast('Gagal memuat detail invoice', 'error');
      } finally {
        setFetchingData(false);
      }
    };

    loadInvoiceData();
  }, [editInvoiceId]);

  // Auto-generate Invoice Number
  const generateInvoiceNumber = async () => {
    try {
      const q = query(collection(db, 'invoices'), where('user_id', '==', userId));
      const snap = await getDocs(q);
      const count = snap.size + 1;
      const serial = String(count).padStart(3, '0');
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      setInvoiceNumber(`INV-${year}${month}-${serial}`);
    } catch (e) {
      const randomSerial = String(Math.floor(Math.random() * 900) + 100);
      const now = new Date();
      setInvoiceNumber(`INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${randomSerial}`);
    }
  };

  // Add Item
  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0, total: 0 }]);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      showToast('Minimal harus ada 1 item', 'error');
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  // Update Item Fields
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = items.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'price') {
          const qty = field === 'quantity' ? Number(value) : updatedItem.quantity;
          const prc = field === 'price' ? Number(value) : updatedItem.price;
          updatedItem.total = qty * prc;
        }
        return updatedItem;
      }
      return item;
    });
    setItems(updated);
  };

  // Calculations
  const grandTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const remaining = grandTotal - paidDp;

  // Save new payment method direct from form
  const handleAddPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayName || !newPayDetails) {
      showToast('Harap isi nama dan detail bank', 'error');
      return;
    }

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

      setPaymentMethods([...paymentMethods, newMethod]);
      setPaymentMethodId(docRef.id);
      setNewPayName('');
      setNewPayDetails('');
      setShowAddPaymentModal(false);
      showToast('Metode pembayaran berhasil ditambahkan!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Gagal menambahkan metode pembayaran', 'error');
    }
  };

  // Form Submission
  const handleSubmit = async (viewPDFAfterSave: boolean) => {
    if (!customerName || !customerAddress) {
      showToast('Harap isi nama dan alamat customer', 'error');
      return;
    }

    // Verify items are not empty
    const invalidItem = items.find(it => !it.description || it.price < 0 || it.quantity <= 0);
    if (invalidItem) {
      showToast('Harap pastikan semua item terisi dengan deskripsi dan jumlah/harga valid', 'error');
      return;
    }

    setLoading(true);
    try {
      const selectedMethod = paymentMethods.find(m => m.id === paymentMethodId);
      const isPaidFull = remaining <= 0;
      const status = isPaidFull ? 'lunas' : 'belum_lunas';

      const invoiceData = {
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        event_date: eventDate || null,
        customer_name: customerName,
        customer_address: customerAddress,
        customer_phone: customerPhone,
        company_name_snapshot: companyName,
        company_address_snapshot: companyAddress,
        company_logo_snapshot: companyLogoUrl || '',
        grand_total: grandTotal,
        paid_dp: paidDp,
        remaining: remaining,
        payment_method_id: paymentMethodId,
        payment_method_name: selectedMethod?.name || 'Cash',
        payment_method_details: selectedMethod?.details || '',
        status: status,
        updated_at: new Date(),
        user_id: userId,
        items: items // embedded for quick loads
      };

      let finalInvoiceId = editInvoiceId;

      if (editInvoiceId) {
        // Update existing invoice
        const docRef = doc(db, 'invoices', editInvoiceId);
        await updateDoc(docRef, invoiceData);

        // Delete old invoice items in firebase
        const batch = writeBatch(db);
        const oldItemsQ = query(
          collection(db, 'invoice_items'),
          where('invoice_id', '==', editInvoiceId)
        );
        const oldItemsSnap = await getDocs(oldItemsQ);
        oldItemsSnap.forEach((oldItemDoc) => {
          batch.delete(doc(db, 'invoice_items', oldItemDoc.id));
        });
        await batch.commit();

        // Write new items
        for (const item of items) {
          await addDoc(collection(db, 'invoice_items'), {
            invoice_id: editInvoiceId,
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            total: item.total
          });
        }

        showToast('Invoice berhasil diperbarui!', 'success');
      } else {
        // Create new invoice
        const docRef = await addDoc(collection(db, 'invoices'), {
          ...invoiceData,
          created_at: new Date()
        });
        finalInvoiceId = docRef.id;

        // Save items
        for (const item of items) {
          await addDoc(collection(db, 'invoice_items'), {
            invoice_id: finalInvoiceId,
            description: item.description,
            quantity: item.quantity,
            price: item.price,
            total: item.total
          });
        }

        showToast('Invoice berhasil disimpan!', 'success');
      }

      if (viewPDFAfterSave && finalInvoiceId) {
        onNavigate('detail', finalInvoiceId);
      } else {
        onNavigate('list');
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      showToast('Gagal menyimpan invoice', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className="container py-20 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 font-medium">Memuat data invoice...</p>
      </div>
    );
  }

  return (
    <div className="container pb-28">
      {/* Top Header Navigation */}
      <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <button 
          onClick={() => onNavigate(editInvoiceId ? 'detail' : 'list', editInvoiceId)}
          className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 leading-tight">
          {editInvoiceId ? 'Edit Invoice' : 'Buat Invoice Baru'}
        </h1>
      </div>

      <div className="space-y-4">
        {/* Bagian 1: Data Perusahaan */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-blue-600">
            <Building2 className="w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Profil Penerbit (Anda)</h2>
          </div>
          <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            {companyLogoUrl && (
              <div className="mb-2">
                <img 
                  src={companyLogoUrl} 
                  alt="Logo Perusahaan" 
                  className="h-12 object-contain rounded border bg-white p-1"
                />
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 font-bold">Nama Perusahaan</p>
              <p className="text-sm font-bold text-gray-800">{companyName || 'CV. Contoh Perusahaan'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold">Alamat Perusahaan</p>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                {companyAddress || 'Jl. Contoh Alamat No. 123'}
              </p>
            </div>
          </div>
        </div>

        {/* Bagian 2: Data Customer */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-blue-600">
            <User className="w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Data Customer</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Nama Customer <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                placeholder="Masukkan nama lengkap customer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Alamat Customer <span className="text-rose-500">*</span></label>
              <textarea
                required
                rows={2}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                placeholder="Alamat lengkap pengiriman / penagihan"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Nomor HP Customer</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                placeholder="Contoh: 081234567890"
              />
            </div>
          </div>
        </div>

        {/* Bagian 3: Data Invoice */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-blue-600">
            <FileText className="w-5 h-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Rincian Faktur</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Nomor Invoice</label>
              <input
                type="text"
                disabled
                value={invoiceNumber}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 focus:outline-none text-sm font-semibold cursor-not-allowed"
                placeholder="Auto-generated"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Tanggal Invoice</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">Tanggal Acara <span className="text-gray-400 font-normal">(opsional)</span></label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bagian 4: Metode Pembayaran */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-blue-600">
              <CreditCard className="w-5 h-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Metode Pembayaran</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAddPaymentModal(true)}
              className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-500 gap-1 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Tambah Baru
            </button>
          </div>

          <div>
            <select
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
            >
              <option value="">-- Pilih Rekening / Tunai --</option>
              {paymentMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name} ({method.details})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bagian 5: Item Invoice (Dinamis) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">Item Tagihan</h2>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1.5 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Tambah Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div 
                key={index} 
                className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-3 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400">Item #{index + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-rose-500 hover:text-rose-600 p-1.5 bg-rose-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white placeholder-gray-400 text-gray-900 focus:outline-none text-xs font-medium"
                    placeholder="Deskripsi jasa / barang yang dibeli"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">JUMLAH (QTY)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none text-xs font-semibold"
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1">HARGA SATUAN (RP)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none text-xs font-semibold"
                        placeholder="Harga Satuan"
                      />
                    </div>
                  </div>
                  <div className="text-right pt-2 border-t border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-400">Total: </span>
                    <span className="text-xs font-bold text-gray-800">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.total || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bagian 6: Ringkasan Pembayaran & Actions */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">Ringkasan Biaya</h2>

          <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
              <span>Grand Total</span>
              <span className="text-sm font-extrabold text-gray-900">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(grandTotal)}
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-500">UANG MUKA (DP) / JUMLAH DIBAYAR</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Rp</span>
                <input
                  type="number"
                  min="0"
                  max={grandTotal}
                  value={paidDp}
                  onChange={(e) => setPaidDp(Number(e.target.value))}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none text-xs font-extrabold"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-semibold text-gray-500 pt-2 border-t border-gray-200">
              <span>Sisa Pembayaran</span>
              <span className={`text-sm font-extrabold ${remaining <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(remaining)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(false)}
              className="flex items-center justify-center py-3.5 px-4 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-1.5 text-gray-500" />
              Simpan Saja
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(true)}
              className="flex items-center justify-center py-3.5 px-4 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-700 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Eye className="w-4 h-4 mr-1.5" />
              Simpan & PDF
            </button>
          </div>
        </div>
      </div>

      {/* Add Payment Method Modal */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-[400px] w-full p-5 space-y-4 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Tambah Rekening Baru</h3>
              <button 
                onClick={() => setShowAddPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPaymentMethod} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Nama Bank / Metode</label>
                <input
                  type="text"
                  required
                  value={newPayName}
                  onChange={(e) => setNewPayName(e.target.value)}
                  placeholder="Contoh: Bank Mandiri, Cash"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Nomor Rekening / Keterangan</label>
                <input
                  type="text"
                  required
                  value={newPayDetails}
                  onChange={(e) => setNewPayDetails(e.target.value)}
                  placeholder="No. Rek: 123456789 a.n. CV. Maju"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Metode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
