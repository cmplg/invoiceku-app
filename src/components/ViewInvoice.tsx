import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, deleteDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { Invoice, InvoiceItem } from '../types';
import { 
  ArrowLeft, 
  Download, 
  Edit, 
  Trash2, 
  Building2, 
  User, 
  Calendar, 
  CreditCard, 
  AlertTriangle,
  Receipt,
  CheckCircle,
  Clock,
  Printer
} from 'lucide-react';
import { jsPDF } from 'jspdf';

interface ViewInvoiceProps {
  userId: string;
  invoiceId: string;
  onNavigate: (view: 'dashboard' | 'create' | 'list' | 'edit', invoiceId?: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function ViewInvoice({ userId, invoiceId, onNavigate, showToast }: ViewInvoiceProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const fetchInvoiceDetails = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'invoices', invoiceId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const invData = docSnap.data() as Invoice;
          
          // Fetch invoice items from the separate collection as requested
          const itemsQ = query(
            collection(db, 'invoice_items'),
            where('invoice_id', '==', invoiceId)
          );
          const itemsSnap = await getDocs(itemsQ);
          const itemsList: InvoiceItem[] = [];
          itemsSnap.forEach((itemDoc) => {
            itemsList.push({ id: itemDoc.id, ...itemDoc.data() } as InvoiceItem);
          });
          
          setInvoice({
            id: docSnap.id,
            ...invData,
            items: itemsList.length > 0 ? itemsList : (invData.items || [])
          });
        } else {
          showToast('Invoice tidak ditemukan', 'error');
          onNavigate('list');
        }
      } catch (error) {
        console.error('Error fetching invoice details:', error);
        showToast('Gagal memuat detail invoice', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceDetails();
  }, [invoiceId]);

  const handleDelete = async () => {
    if (!invoice) return;
    try {
      // 1. Delete associated items
      const itemsQ = query(
        collection(db, 'invoice_items'),
        where('invoice_id', '==', invoice.id)
      );
      const itemsSnap = await getDocs(itemsQ);
      const batch = writeBatch(db);
      itemsSnap.forEach((itemDoc) => {
        batch.delete(doc(db, 'invoice_items', itemDoc.id));
      });
      await batch.commit();

      // 2. Delete the invoice itself
      await deleteDoc(doc(db, 'invoices', invoice.id!));
      
      showToast('Invoice berhasil dihapus', 'success');
      onNavigate('list');
    } catch (error) {
      console.error('Error deleting invoice:', error);
      showToast('Gagal menghapus invoice', 'error');
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

  // PDF Export Engine with jsPDF
  const exportPDF = () => {
    if (!invoice) return;
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors
      const primaryColor = [59, 130, 246]; // Blue
      const darkColor = [17, 24, 39]; // Gray 900
      const lightGray = [156, 163, 175]; // Gray 400
      const borderLineColor = [229, 231, 235]; // Gray 200

      // Add Title
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(invoice.company_name_snapshot || 'INVOICE', 15, 20);

      // Subtitle (Company Address)
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      
      const companyAddressText = invoice.company_address_snapshot || '';
      const companyAddressLines = doc.splitTextToSize(companyAddressText, 100);
      doc.text(companyAddressLines, 15, 26);

      // Invoice Details Block (Top-Right aligned)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text('FAKTUR / INVOICE', 130, 20);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(`No. Invoice :`, 130, 27);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(invoice.invoice_number, 155, 27);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(`Tanggal     :`, 130, 32);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(invoice.invoice_date, 155, 32);

      if (invoice.event_date) {
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(`Tgl. Acara  :`, 130, 37);
        doc.setFont('Helvetica', 'bold');
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.text(invoice.event_date, 155, 37);
      }

      // Horizontal Divider
      doc.setDrawColor(borderLineColor[0], borderLineColor[1], borderLineColor[2]);
      doc.line(15, 45, 195, 45);

      // Customer Info
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('DITAGIHKAN KEPADA:', 15, 52);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      doc.text(invoice.customer_name, 15, 58);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      if (invoice.customer_phone) {
        doc.text(`HP: ${invoice.customer_phone}`, 15, 63);
      }
      
      const customerAddressLines = doc.splitTextToSize(invoice.customer_address, 120);
      doc.text(customerAddressLines, 15, 68);

      // Table Header
      let currentY = 85;
      doc.setFillColor(243, 244, 246);
      doc.rect(15, currentY, 180, 8, 'F');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      doc.text('Deskripsi Item', 18, currentY + 5.5);
      doc.text('Qty', 115, currentY + 5.5, { align: 'right' });
      doc.text('Harga Satuan', 150, currentY + 5.5, { align: 'right' });
      doc.text('Total', 190, currentY + 5.5, { align: 'right' });

      // Table Rows
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(17, 24, 39);
      
      const items = invoice.items || [];
      items.forEach((item) => {
        currentY += 8;
        
        // Split description if it overflows
        const descLines = doc.splitTextToSize(item.description, 90);
        const textHeight = descLines.length * 4.5;
        
        // Item Details
        doc.text(descLines, 18, currentY + 5);
        doc.text(String(item.quantity), 115, currentY + 5, { align: 'right' });
        doc.text(formatIDR(item.price), 150, currentY + 5, { align: 'right' });
        doc.text(formatIDR(item.total), 190, currentY + 5, { align: 'right' });

        // Draw Row Bottom Border
        doc.setDrawColor(243, 244, 246);
        doc.line(15, currentY + 7.5, 195, currentY + 7.5);
        
        // Adjust currentY for multiline descriptions
        if (textHeight > 8) {
          currentY += (textHeight - 6);
        }
      });

      // Calculations Box
      currentY += 14;
      doc.setFont('Helvetica', 'bold');
      doc.text('Metode Pembayaran:', 15, currentY);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(invoice.payment_method_name || 'Cash', 15, currentY + 5);
      if (invoice.payment_method_details) {
        doc.text(invoice.payment_method_details, 15, currentY + 10);
      }

      // Totals
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      doc.text('Grand Total:', 130, currentY);
      doc.text(formatIDR(invoice.grand_total), 190, currentY, { align: 'right' });

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text('Uang Muka (DP):', 130, currentY + 5);
      doc.text(formatIDR(invoice.paid_dp), 190, currentY + 5, { align: 'right' });

      // Draw thick separator line
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(125, currentY + 8, 195, currentY + 8);

      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Sisa Pembayaran:', 130, currentY + 13);
      doc.text(formatIDR(invoice.remaining), 190, currentY + 13, { align: 'right' });

      // Footer Note
      currentY += 35;
      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text('Terima kasih atas kepercayaan Anda bekerja sama dengan kami.', 105, currentY, { align: 'center' });

      // Save PDF
      doc.save(`Invoice-${invoice.invoice_number}.pdf`);
      showToast('PDF berhasil diekspor!', 'success');
    } catch (error: any) {
      console.error(error);
      showToast('Gagal mengekspor PDF: ' + error.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="container py-20 text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 font-medium">Memuat rincian invoice...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container py-20 text-center">
        <p className="text-gray-500">Invoice tidak ditemukan.</p>
        <button 
          onClick={() => onNavigate('list')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="container pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-5 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <button 
          onClick={() => onNavigate('list')}
          className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold text-gray-800">Detail Invoice</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => onNavigate('edit', invoice.id)}
            className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 cursor-pointer"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setConfirmDelete(true)}
            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
            title="Hapus"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Invoice Card (Struk-style) */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-md p-6 space-y-6 relative overflow-hidden">
        {/* Status Badge Watermark at Corner */}
        <div className="absolute top-4 right-4">
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
            invoice.status === 'lunas' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
              : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
            {invoice.status === 'lunas' ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                LUNAS
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                BELUM LUNAS
              </>
            )}
          </span>
        </div>

        {/* Company Logo and Info Header */}
        <div className="space-y-3 pt-4">
          {invoice.company_logo_snapshot ? (
            <img 
              src={invoice.company_logo_snapshot} 
              alt="Logo Perusahaan" 
              className="h-12 object-contain rounded"
            />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl">
              {invoice.company_name_snapshot?.charAt(0) || 'I'}
            </div>
          )}
          <div>
            <h2 className="text-base font-extrabold text-gray-900 uppercase">
              {invoice.company_name_snapshot || 'Nama Perusahaan'}
            </h2>
            <p className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed mt-0.5 max-w-[280px]">
              {invoice.company_address_snapshot || 'Alamat Perusahaan'}
            </p>
          </div>
        </div>

        <hr className="border-dashed border-gray-200" />

        {/* Invoice Metadata & Customer Information */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Faktur Untuk:</span>
            <span className="font-extrabold text-gray-800 block text-sm">{invoice.customer_name}</span>
            {invoice.customer_phone && <span className="text-gray-500 block">HP: {invoice.customer_phone}</span>}
            <span className="text-gray-500 block leading-relaxed whitespace-pre-wrap mt-1">{invoice.customer_address}</span>
          </div>

          <div className="space-y-1.5 text-right">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Nomor Faktur:</span>
              <span className="font-extrabold text-blue-600 text-sm">{invoice.invoice_number}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tanggal Terbit:</span>
              <span className="font-semibold text-gray-700">{invoice.invoice_date}</span>
            </div>
            {invoice.event_date && (
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tanggal Acara:</span>
                <span className="font-semibold text-gray-700">{invoice.event_date}</span>
              </div>
            )}
          </div>
        </div>

        <hr className="border-dashed border-gray-200" />

        {/* Item Table Lists (Responsive design) */}
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-3">Item Pembelian:</span>
          <div className="space-y-3">
            {invoice.items && invoice.items.map((item, index) => (
              <div key={index} className="flex justify-between items-start text-xs text-gray-800">
                <div className="flex-1 pr-3 space-y-0.5">
                  <span className="font-bold text-gray-900">{item.description}</span>
                  <span className="text-gray-400 block text-[10px]">
                    {item.quantity} x {formatIDR(item.price)}
                  </span>
                </div>
                <span className="font-extrabold text-gray-900 text-right min-w-[80px]">
                  {formatIDR(item.total)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-dashed border-gray-200" />

        {/* Payment Summary */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between font-bold text-gray-500">
            <span>Grand Total:</span>
            <span className="text-gray-900 font-extrabold text-sm">{formatIDR(invoice.grand_total)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Uang Muka (DP):</span>
            <span className="text-gray-800 font-bold">{formatIDR(invoice.paid_dp)}</span>
          </div>
          <div className="flex justify-between font-extrabold pt-2 border-t border-dashed border-gray-200">
            <span className="text-gray-900">Sisa Pembayaran:</span>
            <span className={`text-sm ${invoice.remaining <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatIDR(invoice.remaining)}
            </span>
          </div>
        </div>

        {/* Payment Transfer Instructions Info */}
        {(invoice.payment_method_name || invoice.payment_method_details) && (
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-50 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 text-blue-700 font-bold mb-1">
              <CreditCard className="w-4 h-4" />
              <span>Instruksi Pembayaran</span>
            </div>
            <p className="font-bold text-gray-800">{invoice.payment_method_name}</p>
            {invoice.payment_method_details && (
              <p className="text-gray-600 font-medium whitespace-pre-wrap leading-relaxed">{invoice.payment_method_details}</p>
            )}
          </div>
        )}
      </div>

      {/* Floating Main Actions */}
      <div className="grid grid-cols-2 gap-3 mt-6">
        <button
          type="button"
          onClick={() => onNavigate('list')}
          className="flex items-center justify-center py-3.5 px-4 border border-gray-200 bg-white rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
        >
          Kembali
        </button>
        <button
          type="button"
          onClick={exportPDF}
          className="flex items-center justify-center py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md cursor-pointer"
        >
          <Download className="w-4 h-4 mr-1.5" />
          Ekspor PDF
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-[340px] w-full p-5 space-y-4 shadow-xl text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900 text-base">Hapus Invoice ini?</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Semua item terkait invoice ini juga akan terhapus secara permanen.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
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
