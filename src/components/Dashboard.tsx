import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Invoice } from '../types';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  FileText, 
  DollarSign, 
  Clock, 
  Calendar, 
  ChevronRight, 
  ArrowUpRight,
  User,
  ShoppingBag,
  Bell
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

interface DashboardProps {
  userId: string;
  companyName: string;
  onNavigate: (view: 'dashboard' | 'create' | 'list' | 'settings' | 'detail', invoiceId?: string) => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

type PeriodFilter = 'today' | '7days' | '30days' | 'month' | 'year';

export default function Dashboard({ userId, companyName, onNavigate, showToast }: DashboardProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('30days');

  // Load all invoices for the authenticated user to calculate aggregates and show graphs
  useEffect(() => {
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
        console.error('Error fetching invoices for dashboard:', error);
        showToast('Gagal memuat data dashboard', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [userId]);

  // Filter invoices based on selected period
  const getFilteredInvoices = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return invoices.filter((inv) => {
      const invDate = new Date(inv.invoice_date);
      if (isNaN(invDate.getTime())) return false;

      const diffTime = Math.abs(now.getTime() - invDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (period) {
        case 'today':
          return inv.invoice_date === todayStr;
        case '7days':
          return diffDays <= 7;
        case '30days':
          return diffDays <= 30;
        case 'month':
          return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
        case 'year':
          return invDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  };

  const filteredInvoices = getFilteredInvoices();

  // Calculate aggregates
  const totalSales = filteredInvoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
  const invoiceCount = filteredInvoices.length;
  const totalRemaining = filteredInvoices.reduce((sum, inv) => sum + (inv.remaining || 0), 0);
  const unpaidCount = filteredInvoices.filter((inv) => inv.status === 'belum_lunas').length;

  // Helper function to format IDR Currency
  const formatIDR = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Prepare chart data (Sales grouped by Date or Month depending on period)
  const getChartData = () => {
    const dataMap: { [key: string]: number } = {};

    filteredInvoices.forEach((inv) => {
      let label = '';
      const date = new Date(inv.invoice_date);
      if (isNaN(date.getTime())) return;

      if (period === 'today') {
        label = 'Hari Ini';
      } else if (period === '7days' || period === '30days') {
        // e.g. "04 Jul"
        label = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      } else if (period === 'month') {
        // Group by weeks or date
        label = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      } else if (period === 'year') {
        // Group by month name
        label = date.toLocaleDateString('id-ID', { month: 'short' });
      }

      dataMap[label] = (dataMap[label] || 0) + inv.grand_total;
    });

    // Sort or map into array
    const chartArray = Object.keys(dataMap).map((key) => ({
      name: key,
      Penjualan: dataMap[key]
    }));

    // If empty, put default data
    if (chartArray.length === 0) {
      return [{ name: 'Belum Ada Data', Penjualan: 0 }];
    }

    // Limit elements to fit comfortably in mobile-first screen
    return chartArray.slice(-7); // take last 7 items
  };

  const chartData = getChartData();

  // Get recent 5 invoices
  const recentInvoices = invoices.slice(0, 5);

  return (
    <div className="container pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
            I
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">InvoiceKu</h1>
            <p className="text-xs text-gray-500 font-medium truncate max-w-[180px]">
              {companyName || 'Profil Perusahaan'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl bg-gray-50 text-gray-500 hover:text-gray-700">
            <Bell className="w-5 h-5" />
          </button>
          <div 
            onClick={() => onNavigate('settings')} 
            className="h-9 w-9 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-sm cursor-pointer"
          >
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter Dropdown */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase text-gray-400 tracking-wider">
          Ringkasan Keuangan
        </h2>
        <div className="relative">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
            className="appearance-none bg-white border border-gray-200 text-gray-700 py-1.5 pl-3 pr-8 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="today">Hari Ini</option>
            <option value="7days">7 Hari Terakhir</option>
            <option value="30days">30 Hari Terakhir</option>
            <option value="month">Bulan Ini</option>
            <option value="year">Tahun Ini</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {loading ? (
        /* Loading skeleton state */
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white p-4 rounded-2xl h-24 border border-gray-100"></div>
            ))}
          </div>
          <div className="animate-pulse bg-white p-4 rounded-2xl h-48 border border-gray-100"></div>
          <div className="animate-pulse bg-white p-4 rounded-2xl h-32 border border-gray-100"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Cards Grid (2x2) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Penjualan */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase text-blue-600 tracking-wider bg-blue-50 px-1.5 py-0.5 rounded">
                  Penjualan
                </span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-tight">
                  {formatIDR(totalSales)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Total omset kotor</p>
              </div>
            </div>

            {/* Total Invoice */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase text-amber-600 tracking-wider bg-amber-50 px-1.5 py-0.5 rounded">
                  Invoices
                </span>
                <FileText className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-gray-900 leading-tight">
                  {invoiceCount} <span className="text-xs font-normal text-gray-400">faktur</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Sudah diterbitkan</p>
              </div>
            </div>

            {/* Sisa Pembayaran */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded">
                  Piutang
                </span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-tight">
                  {formatIDR(totalRemaining)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Sisa pembayaran</p>
              </div>
            </div>

            {/* Invoice Belum Lunas */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase text-rose-600 tracking-wider bg-rose-50 px-1.5 py-0.5 rounded">
                  Belum Lunas
                </span>
                <Clock className="w-4 h-4 text-rose-500" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-gray-900 leading-tight">
                  {unpaidCount} <span className="text-xs font-normal text-gray-400">faktur</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Perlu ditindaklanjuti</p>
              </div>
            </div>
          </div>

          {/* Sales Chart with Recharts */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Tren Penjualan</h3>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9CA3AF" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#9CA3AF" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatIDR(Number(value)), 'Penjualan']}
                    contentStyle={{ background: '#111827', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="Penjualan" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.Penjualan > 0 ? '#3B82F6' : '#E5E7EB'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Invoices List */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Invoice Terbaru</h3>
              <button 
                onClick={() => onNavigate('list')}
                className="text-xs font-bold text-blue-600 flex items-center gap-0.5 hover:text-blue-500 cursor-pointer"
              >
                Lihat Semua
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentInvoices.length === 0 ? (
              <div className="py-6 text-center text-gray-400 text-xs">
                Belum ada invoice diterbitkan. Yuk buat pertama kali!
              </div>
            ) : (
              <div className="space-y-3">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    onClick={() => onNavigate('detail', invoice.id)}
                    className="p-3.5 rounded-xl border border-gray-100 hover:border-blue-100 bg-gray-50/50 hover:bg-blue-50/10 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-gray-900">
                          {invoice.invoice_number}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          invoice.status === 'lunas' 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : 'bg-rose-50 text-rose-600'
                        }`}>
                          {invoice.status === 'lunas' ? 'Lunas' : 'Belum Lunas'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-semibold">{invoice.customer_name}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(invoice.invoice_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-extrabold text-gray-900">
                        {formatIDR(invoice.grand_total)}
                      </p>
                      <button className="inline-flex items-center text-[10px] font-bold text-blue-600 mt-1">
                        Detail <ArrowUpRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
