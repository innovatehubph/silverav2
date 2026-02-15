import { useEffect, useState, useRef, useCallback } from 'react';
import { adminApi } from '../../utils/api';
import { toast } from 'sonner';
// jsPDF + autotable are dynamically imported in exportToPDF() to avoid
// loading ~360 KB (jspdf 159 KB + html2canvas 201 KB) on page mount.
import {
  ShoppingCart,
  Eye,
  Truck,
  StickyNote,
  Printer,
  X,
  Save,
  Clock,
  Package,
  CreditCard,
  MapPin,
  User,
  Phone,
  Mail,
  ChevronDown,
  Search,
  CalendarDays,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer,
  Download,
  FileText,
} from 'lucide-react';

interface OrderItem {
  id: number;
  product_id: number;
  name: string;
  price: number;
  sale_price?: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
}

interface OrderNote {
  id: number;
  note: string;
  admin_name: string;
  created_at: string;
}

interface StatusHistory {
  id: number;
  status: string;
  changed_by_name?: string;
  created_at: string;
}

interface OrderDetails {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  total: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  payment_ref?: string;
  shipping_address?: string;
  tracking_number?: string;
  carrier?: string;
  shipped_at?: string;
  delivered_at?: string;
  created_at: string;
  items: OrderItem[];
  notes: OrderNote[];
  status_history: StatusHistory[];
}

const carriers = [
  'J&T Express',
  'LBC',
  'JRS Express',
  'Ninja Van',
  'Grab Express',
  'Lalamove',
  'Other',
];

interface Order {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  total: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  tracking_number?: string;
  carrier?: string;
  shipping_address?: string;
  created_at: string;
  items_count?: number;
}

const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-400',
  processing: 'bg-blue-900/30 text-blue-400',
  shipped: 'bg-purple-900/30 text-purple-400',
  delivered: 'bg-green-900/30 text-green-400',
  cancelled: 'bg-red-900/30 text-red-400',
};

const statusIcon: Record<string, React.ElementType> = {
  pending: Timer,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

const paymentColor: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-400',
  paid: 'bg-green-900/30 text-green-400',
  failed: 'bg-red-900/30 text-red-400',
  refunded: 'bg-purple-900/30 text-purple-400',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Tracking modal state
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<number | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('');
  const [savingTracking, setSavingTracking] = useState(false);
  const [shippingMode, setShippingMode] = useState(false); // true = opened from status change to "shipped"
  
  // Notes modal state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesOrderId, setNotesOrderId] = useState<number | null>(null);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [orderNotes, setOrderNotes] = useState<OrderNote[]>([]);
  
  const printRef = useRef<HTMLDivElement>(null);

  const loadOrders = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await adminApi.getOrders(params);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    // Intercept "shipped" → open tracking modal first
    if (newStatus === 'shipped') {
      setTrackingOrderId(orderId);
      setTrackingNumber('');
      setTrackingCarrier('');
      setShippingMode(true);
      setShowTrackingModal(true);
      return;
    }
    try {
      await adminApi.updateOrder(orderId, { status: newStatus });
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      toast.success(`Order #${orderId} updated to ${newStatus}`);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update order');
    }
  };

  const handleViewDetails = async (orderId: number) => {
    setShowDetailModal(true);
    setLoadingDetails(true);
    try {
      const res = await adminApi.getOrder(orderId);
      setSelectedOrder(res.data);
    } catch (error) {
      console.error('Failed to load order details:', error);
      toast.error('Failed to load order details');
      setShowDetailModal(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openTrackingModal = (order: Order) => {
    setTrackingOrderId(order.id);
    setTrackingNumber(order.tracking_number || '');
    setTrackingCarrier(order.carrier || '');
    setShippingMode(false);
    setShowTrackingModal(true);
  };

  const handleSaveTracking = async () => {
    if (!trackingOrderId) return;
    setSavingTracking(true);
    try {
      if (shippingMode) {
        // Update status to shipped with tracking + carrier
        await adminApi.updateOrder(trackingOrderId, {
          status: 'shipped',
          tracking_number: trackingNumber.trim() || undefined,
          carrier: trackingCarrier.trim() || undefined,
        });
        setOrders(orders.map(o => o.id === trackingOrderId
          ? { ...o, status: 'shipped', tracking_number: trackingNumber.trim(), carrier: trackingCarrier.trim() }
          : o
        ));
        toast.success(`Order #${trackingOrderId} marked as shipped`);
      } else {
        await adminApi.updateOrderTracking(trackingOrderId, trackingNumber.trim(), trackingCarrier.trim() || undefined);
        setOrders(orders.map(o => o.id === trackingOrderId
          ? { ...o, tracking_number: trackingNumber.trim(), carrier: trackingCarrier.trim() }
          : o
        ));
        toast.success('Tracking info updated');
      }
      setShowTrackingModal(false);
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save tracking info');
    } finally {
      setSavingTracking(false);
    }
  };

  const openNotesModal = async (orderId: number) => {
    setNotesOrderId(orderId);
    setNewNote('');
    setShowNotesModal(true);
    try {
      const res = await adminApi.getOrder(orderId);
      setOrderNotes(res.data.notes || []);
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (!notesOrderId || !newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await adminApi.addOrderNote(notesOrderId, newNote.trim());
      setOrderNotes([res.data, ...orderNotes]);
      setNewNote('');
      toast.success('Note added');
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  const handlePrintInvoice = () => {
    if (!selectedOrder) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print invoice');
      return;
    }

    const items = selectedOrder.items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.sale_price || item.price) * item.quantity, 0);
    
    let address = 'N/A';
    try {
      const addr = typeof selectedOrder.shipping_address === 'string' 
        ? JSON.parse(selectedOrder.shipping_address)
        : selectedOrder.shipping_address;
      if (addr) {
        address = [addr.street_address, addr.barangay, addr.municipality, addr.province, addr.region]
          .filter(Boolean)
          .join(', ');
        if (addr.zip_code) address += ` ${addr.zip_code}`;
      }
    } catch { /* expected */ }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice #${selectedOrder.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #D4AF37; padding-bottom: 20px; }
          .header h1 { color: #D4AF37; margin: 0; font-size: 28px; }
          .header p { margin: 5px 0; color: #666; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .info-box h3 { margin: 0 0 10px; color: #333; font-size: 14px; text-transform: uppercase; }
          .info-box p { margin: 3px 0; color: #666; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f5f5f5; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; border-bottom: 2px solid #ddd; }
          td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
          .text-right { text-align: right; }
          .totals { margin-top: 30px; text-align: right; }
          .totals .row { display: flex; justify-content: flex-end; gap: 40px; padding: 5px 0; }
          .totals .row.total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
          .footer { margin-top: 50px; text-align: center; color: #999; font-size: 12px; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; text-transform: uppercase; }
          .status-paid { background: #dcfce7; color: #16a34a; }
          .status-pending { background: #fef9c3; color: #ca8a04; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SILVERA</h1>
          <p>Invoice #${selectedOrder.id}</p>
          <p>Date: ${new Date(selectedOrder.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Customer</h3>
            <p><strong>${selectedOrder.user_name || 'Guest'}</strong></p>
            <p>${selectedOrder.user_email || ''}</p>
            <p>${selectedOrder.user_phone || ''}</p>
          </div>
          <div class="info-box">
            <h3>Shipping Address</h3>
            <p>${address}</p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>Payment</h3>
            <p>Method: ${selectedOrder.payment_method || 'N/A'}</p>
            <p>Status: <span class="status ${selectedOrder.payment_status === 'paid' ? 'status-paid' : 'status-pending'}">${selectedOrder.payment_status}</span></p>
            ${selectedOrder.payment_ref ? `<p>Ref: ${selectedOrder.payment_ref}</p>` : ''}
          </div>
          <div class="info-box">
            <h3>Order Status</h3>
            <p>${selectedOrder.status.toUpperCase()}</p>
            ${selectedOrder.tracking_number ? `<p>Tracking: ${selectedOrder.tracking_number}</p>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="text-right">Price</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.name}${item.size ? ` (${item.size})` : ''}${item.color ? ` - ${item.color}` : ''}</td>
                <td class="text-right">₱${(item.sale_price || item.price).toLocaleString()}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">₱${((item.sale_price || item.price) * item.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="row"><span>Subtotal:</span><span>₱${subtotal.toLocaleString()}</span></div>
          <div class="row"><span>Shipping:</span><span>₱${(selectedOrder.total - subtotal > 0 ? selectedOrder.total - subtotal : 0).toLocaleString()}</span></div>
          <div class="row total"><span>Total:</span><span>₱${selectedOrder.total.toLocaleString()}</span></div>
        </div>

        <div class="footer">
          <p>Thank you for shopping with Silvera!</p>
          <p>Questions? Contact us at support@silveraph.shop</p>
        </div>

        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filtered = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || o.payment_status === paymentFilter;
    const matchesSearch = !search || 
      o.id.toString().includes(search) ||
      o.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      o.tracking_number?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesPayment && matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number) => `₱${amount?.toLocaleString() || '0'}`;

  const parseAddress = (addressStr?: string) => {
    if (!addressStr) return null;
    try {
      return typeof addressStr === 'string' ? JSON.parse(addressStr) : addressStr;
    } catch {
      return null;
    }
  };

  const exportToCSV = () => {
    if (filtered.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const headers = ['Order #', 'Customer Name', 'Email', 'Status', 'Payment Status', 'Payment Method', 'Total', 'Tracking #', 'Carrier', 'Shipping Address', 'Created At'];
    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const rows = filtered.map(o => {
      let address = '';
      try {
        const addr = typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : o.shipping_address;
        if (addr) {
          address = [addr.street_address, addr.barangay, addr.municipality, addr.province, addr.region]
            .filter(Boolean).join(', ');
          if (addr.zip_code) address += ` ${addr.zip_code}`;
        }
      } catch { /* ignore */ }
      return [
        `#${o.id}`,
        o.user_name || `User #${o.user_id}`,
        o.user_email || '',
        o.status,
        o.payment_status,
        o.payment_method || '',
        o.total?.toString() || '0',
        o.tracking_number || '',
        o.carrier || '',
        address,
        o.created_at,
      ].map(v => escapeCSV(v));
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `silvera-orders-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} orders to CSV`);
  };

  const exportToPDF = async () => {
    if (filtered.length === 0) {
      toast.error('No orders to export');
      return;
    }

    toast.loading('Generating PDF...', { id: 'pdf-gen' });

    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(212, 175, 55); // gold
    doc.text('SILVERA', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text('Orders Report', pageWidth / 2, 28, { align: 'center' });

    // Date range + generated timestamp
    doc.setFontSize(9);
    doc.setTextColor(130);
    const rangeText = startDate || endDate
      ? `Period: ${startDate || 'start'} to ${endDate || 'present'}`
      : 'All time';
    doc.text(rangeText, pageWidth / 2, 34, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, pageWidth / 2, 39, { align: 'center' });

    // Summary stats
    const totalRevenue = filtered.reduce((sum, o) => sum + (o.total || 0), 0);
    const statusCounts: Record<string, number> = {};
    const paymentCounts: Record<string, number> = {};
    filtered.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
      paymentCounts[o.payment_status] = (paymentCounts[o.payment_status] || 0) + 1;
    });

    let y = 48;
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text('Summary', 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Total Orders: ${filtered.length}`, 14, y);
    doc.text(`Total Revenue: PHP ${totalRevenue.toLocaleString()}`, 100, y);
    y += 5;
    doc.text(`By Status: ${Object.entries(statusCounts).map(([k, v]) => `${k} (${v})`).join(', ')}`, 14, y);
    y += 5;
    doc.text(`By Payment: ${Object.entries(paymentCounts).map(([k, v]) => `${k} (${v})`).join(', ')}`, 14, y);
    y += 8;

    // Orders table
    autoTable(doc, {
      startY: y,
      head: [['Order #', 'Customer', 'Total (PHP)', 'Status', 'Payment', 'Date']],
      body: filtered.map(o => [
        `#${o.id}`,
        o.user_name || `User #${o.user_id}`,
        o.total?.toLocaleString() || '0',
        o.status,
        o.payment_status,
        formatDate(o.created_at),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    });

    // Footer on last page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('Generated by Silvera Admin', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    }

    doc.save(`silvera-orders-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.dismiss('pdf-gen');
    toast.success(`PDF report generated with ${filtered.length} orders`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-txt-secondary">Loading orders...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingCart className="text-accent-gold" size={28} />
          <h1 className="text-2xl font-bold">
            <span className="text-gradient-gold">Orders</span>
          </h1>
          <span className="text-sm text-txt-tertiary">({orders.length})</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-tertiary" />
          <input
            type="text"
            placeholder="Search by order #, customer, tracking..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-full pl-9 py-2 text-sm"
          />
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field py-2 pl-3 pr-8 text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              {orderStatuses.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-txt-tertiary pointer-events-none" />
          </div>
          
          <div className="relative">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="input-field py-2 pl-3 pr-8 text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Payments</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-txt-tertiary pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-txt-tertiary" />
          <span className="text-sm text-txt-secondary">From</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-field py-1.5 px-2 text-sm"
          />
          <span className="text-sm text-txt-secondary">To</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-field py-1.5 px-2 text-sm"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs text-txt-tertiary hover:text-txt-primary transition-colors px-2 py-1"
            >
              Clear dates
            </button>
          )}
        </div>
      </div>

      {/* Export Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-txt-tertiary">
          Showing {filtered.length} order{filtered.length !== 1 ? 's' : ''}
          {(statusFilter !== 'all' || paymentFilter !== 'all' || search || startDate || endDate) && ' (filtered)'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm"
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={exportToPDF}
            className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm"
          >
            <FileText size={15} /> PDF Report
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-secondary border-b border-bdr">
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Order</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Customer</th>
                <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Total</th>
                <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Status</th>
                <th className="text-center py-3 px-4 text-txt-tertiary font-medium">Payment</th>
                <th className="text-left py-3 px-4 text-txt-tertiary font-medium">Date</th>
                <th className="text-right py-3 px-4 text-txt-tertiary font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-b border-bdr-subtle hover:bg-bg-hover transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="font-mono text-txt-primary">#{order.id}</div>
                    {order.tracking_number && (
                      <div className="text-xs text-txt-tertiary flex items-center gap-1">
                        <Truck size={10} /> {order.tracking_number}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="text-txt-primary text-sm">{order.user_name || `User #${order.user_id}`}</div>
                    {order.user_email && (
                      <div className="text-txt-tertiary text-xs">{order.user_email}</div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right text-txt-primary font-medium">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColor[order.status] || 'bg-zinc-800 text-zinc-400'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${paymentColor[order.payment_status] || 'bg-zinc-800 text-zinc-400'}`}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-txt-secondary text-sm">{formatDate(order.created_at)}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleViewDetails(order.id)}
                        className="p-1.5 rounded hover:bg-bg-hover text-txt-secondary hover:text-accent-gold transition-colors"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => openTrackingModal(order)}
                        className="p-1.5 rounded hover:bg-bg-hover text-txt-secondary hover:text-purple-400 transition-colors"
                        title="Tracking Number"
                      >
                        <Truck size={15} />
                      </button>
                      <button
                        onClick={() => openNotesModal(order.id)}
                        className="p-1.5 rounded hover:bg-bg-hover text-txt-secondary hover:text-blue-400 transition-colors"
                        title="Notes"
                      >
                        <StickyNote size={15} />
                      </button>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="input-field py-1 px-2 text-xs ml-1"
                      >
                        {orderStatuses.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-txt-secondary text-sm py-8 text-center">
              {search || statusFilter !== 'all' || paymentFilter !== 'all' || startDate || endDate
                ? 'No orders match your filters'
                : 'No orders yet'}
            </p>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowDetailModal(false)}>
          <div className="card p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-txt-primary">
                Order #{selectedOrder?.id}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-sm"
                >
                  <Printer size={16} /> Print Invoice
                </button>
                <button onClick={() => setShowDetailModal(false)} className="text-txt-tertiary hover:text-txt-primary">
                  <X size={20} />
                </button>
              </div>
            </div>

            {loadingDetails ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <span className="text-txt-secondary">Loading order details...</span>
              </div>
            ) : selectedOrder ? (
              <div className="space-y-6" ref={printRef}>
                {/* Status badges row */}
                <div className="flex flex-wrap gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm ${statusColor[selectedOrder.status]}`}>
                    {selectedOrder.status.toUpperCase()}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${paymentColor[selectedOrder.payment_status]}`}>
                    Payment: {selectedOrder.payment_status}
                  </span>
                  {selectedOrder.tracking_number && (
                    <span className="px-3 py-1 rounded-full text-sm bg-purple-900/30 text-purple-400 flex items-center gap-1">
                      <Truck size={14} /> {selectedOrder.tracking_number}
                    </span>
                  )}
                </div>

                {/* Info Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Customer Info */}
                  <div className="bg-bg-secondary rounded-lg p-4">
                    <h3 className="text-sm font-medium text-txt-primary flex items-center gap-2 mb-3">
                      <User size={16} className="text-accent-gold" /> Customer
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p className="text-txt-primary font-medium">{selectedOrder.user_name || 'Guest'}</p>
                      {selectedOrder.user_email && (
                        <p className="text-txt-secondary flex items-center gap-2">
                          <Mail size={14} /> {selectedOrder.user_email}
                        </p>
                      )}
                      {selectedOrder.user_phone && (
                        <p className="text-txt-secondary flex items-center gap-2">
                          <Phone size={14} /> {selectedOrder.user_phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="bg-bg-secondary rounded-lg p-4">
                    <h3 className="text-sm font-medium text-txt-primary flex items-center gap-2 mb-3">
                      <MapPin size={16} className="text-accent-gold" /> Shipping Address
                    </h3>
                    {(() => {
                      const addr = parseAddress(selectedOrder.shipping_address);
                      if (!addr) return <p className="text-txt-tertiary text-sm">No address provided</p>;
                      return (
                        <div className="space-y-1 text-sm">
                          <p className="text-txt-primary font-medium">{addr.name}</p>
                          <p className="text-txt-secondary">{addr.phone}</p>
                          <p className="text-txt-tertiary">
                            {[addr.street_address, addr.barangay, addr.municipality, addr.province, addr.region]
                              .filter(Boolean)
                              .join(', ')}
                            {addr.zip_code && ` ${addr.zip_code}`}
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Payment Info */}
                  <div className="bg-bg-secondary rounded-lg p-4">
                    <h3 className="text-sm font-medium text-txt-primary flex items-center gap-2 mb-3">
                      <CreditCard size={16} className="text-accent-gold" /> Payment
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p className="text-txt-secondary">
                        Method: <span className="text-txt-primary">{selectedOrder.payment_method || 'N/A'}</span>
                      </p>
                      {selectedOrder.payment_ref && (
                        <p className="text-txt-secondary">
                          Reference: <span className="text-txt-primary font-mono">{selectedOrder.payment_ref}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="bg-bg-secondary rounded-lg p-4">
                    <h3 className="text-sm font-medium text-txt-primary flex items-center gap-2 mb-3">
                      <CalendarDays size={16} className="text-accent-gold" /> Order Info
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p className="text-txt-secondary">
                        Created: <span className="text-txt-primary">{formatDateTime(selectedOrder.created_at)}</span>
                      </p>
                      {selectedOrder.shipped_at && (
                        <p className="text-txt-secondary">
                          Shipped: <span className="text-txt-primary">{formatDateTime(selectedOrder.shipped_at)}</span>
                        </p>
                      )}
                      {selectedOrder.delivered_at && (
                        <p className="text-txt-secondary">
                          Delivered: <span className="text-txt-primary">{formatDateTime(selectedOrder.delivered_at)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="text-sm font-medium text-txt-primary flex items-center gap-2 mb-3">
                    <Package size={16} className="text-accent-gold" /> Order Items
                  </h3>
                  <div className="bg-bg-secondary rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-bdr">
                          <th className="text-left py-2 px-3 text-txt-tertiary font-medium">Item</th>
                          <th className="text-right py-2 px-3 text-txt-tertiary font-medium">Price</th>
                          <th className="text-right py-2 px-3 text-txt-tertiary font-medium">Qty</th>
                          <th className="text-right py-2 px-3 text-txt-tertiary font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items?.map((item, i) => (
                          <tr key={i} className="border-b border-bdr-subtle">
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-3">
                                {item.image && (
                                  <img src={item.image} alt={item.name} className="w-10 h-10 rounded object-cover" width={40} height={40} />
                                )}
                                <div>
                                  <span className="text-txt-primary">{item.name}</span>
                                  {(item.size || item.color) && (
                                    <span className="text-txt-tertiary text-xs block">
                                      {[item.size, item.color].filter(Boolean).join(' / ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right text-txt-secondary">
                              {formatCurrency(item.sale_price || item.price)}
                            </td>
                            <td className="py-2 px-3 text-right text-txt-secondary">{item.quantity}</td>
                            <td className="py-2 px-3 text-right text-txt-primary font-medium">
                              {formatCurrency((item.sale_price || item.price) * item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-bg-tertiary">
                          <td colSpan={3} className="py-3 px-3 text-right text-txt-secondary font-medium">
                            Total:
                          </td>
                          <td className="py-3 px-3 text-right text-accent-gold font-bold text-lg">
                            {formatCurrency(selectedOrder.total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Status Timeline */}
                {selectedOrder.status_history && selectedOrder.status_history.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-txt-primary flex items-center gap-2 mb-3">
                      <Clock size={16} className="text-accent-gold" /> Order Timeline
                    </h3>
                    <div className="relative pl-6 border-l-2 border-bdr-subtle space-y-4">
                      {selectedOrder.status_history.map((hist, i) => {
                        const StatusIcon = statusIcon[hist.status] || AlertCircle;
                        return (
                          <div key={hist.id || i} className="relative">
                            <div className={`absolute -left-[25px] w-4 h-4 rounded-full flex items-center justify-center ${statusColor[hist.status] || 'bg-zinc-800'}`}>
                              <StatusIcon size={10} />
                            </div>
                            <div className="bg-bg-secondary rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-medium ${statusColor[hist.status]?.split(' ')[1] || 'text-txt-primary'}`}>
                                  {hist.status.charAt(0).toUpperCase() + hist.status.slice(1)}
                                </span>
                                <span className="text-xs text-txt-tertiary">{formatDateTime(hist.created_at)}</span>
                              </div>
                              {hist.changed_by_name && (
                                <p className="text-xs text-txt-tertiary mt-1">by {hist.changed_by_name}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Order Notes */}
                {selectedOrder.notes && selectedOrder.notes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-txt-primary flex items-center gap-2 mb-3">
                      <StickyNote size={16} className="text-accent-gold" /> Admin Notes
                    </h3>
                    <div className="space-y-2">
                      {selectedOrder.notes.map((note) => (
                        <div key={note.id} className="bg-bg-secondary rounded-lg p-3">
                          <p className="text-txt-primary text-sm">{note.note}</p>
                          <p className="text-xs text-txt-tertiary mt-1">
                            {note.admin_name} • {formatDateTime(note.created_at)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Tracking Number Modal */}
      {showTrackingModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowTrackingModal(false)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-txt-primary flex items-center gap-2">
                <Truck size={20} className="text-accent-gold" /> Tracking Number
              </h2>
              <button onClick={() => setShowTrackingModal(false)} className="text-txt-tertiary hover:text-txt-primary">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-txt-secondary">
                {shippingMode
                  ? `Ship Order #${trackingOrderId} — enter tracking details`
                  : `Update tracking info for Order #${trackingOrderId}`
                }
              </p>
              <div>
                <label className="block text-sm text-txt-secondary mb-1">Carrier</label>
                <select
                  value={trackingCarrier}
                  onChange={(e) => setTrackingCarrier(e.target.value)}
                  className="input-field w-full py-2"
                >
                  <option value="">Select carrier...</option>
                  {carriers.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-txt-secondary mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g., LBC123456789"
                  className="input-field w-full py-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowTrackingModal(false)} className="btn-ghost px-4 py-2 rounded-lg text-sm">
                Cancel
              </button>
              <button
                onClick={handleSaveTracking}
                disabled={savingTracking || (shippingMode && !trackingNumber.trim())}
                className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
              >
                <Save size={16} /> {savingTracking ? 'Saving...' : shippingMode ? 'Ship Order' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowNotesModal(false)}>
          <div className="card p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-txt-primary flex items-center gap-2">
                <StickyNote size={20} className="text-accent-gold" /> Order Notes
              </h2>
              <button onClick={() => setShowNotesModal(false)} className="text-txt-tertiary hover:text-txt-primary">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Add note form */}
              <div className="space-y-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this order..."
                  className="input-field w-full py-2 min-h-[80px] resize-none text-sm"
                />
                <button
                  onClick={handleAddNote}
                  disabled={savingNote || !newNote.trim()}
                  className="btn-primary px-4 py-2 rounded-lg text-sm w-full"
                >
                  {savingNote ? 'Adding...' : 'Add Note'}
                </button>
              </div>

              {/* Notes list */}
              {orderNotes.length > 0 ? (
                <div className="space-y-2 pt-4 border-t border-bdr-subtle">
                  {orderNotes.map((note) => (
                    <div key={note.id} className="bg-bg-secondary rounded-lg p-3">
                      <p className="text-txt-primary text-sm whitespace-pre-wrap">{note.note}</p>
                      <p className="text-xs text-txt-tertiary mt-2">
                        {note.admin_name} • {formatDateTime(note.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-txt-tertiary text-sm text-center py-4">No notes yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
