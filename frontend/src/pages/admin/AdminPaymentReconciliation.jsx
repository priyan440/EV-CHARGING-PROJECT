import { useState, useEffect, useCallback } from "react";
import {
  CreditCard, Search, RefreshCw, CheckCircle2, XCircle, AlertTriangle, 
  RotateCcw, DollarSign, ArrowUpRight, Check, X, Shield, FileText, User, Building2
} from "lucide-react";
import { adminService } from "../../services/adminService";
import Pagination from "../../components/Pagination";

export default function AdminPaymentReconciliation() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    totalPayments: 0,
    successfulAmount: 0,
    successfulCount: 0,
    refundedAmount: 0,
    refundedCount: 0,
    failedCount: 0,
    pendingCount: 0,
    disputedCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);

  // Refund Modal State
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await adminService.getPaymentReconciliation({ status: statusFilter });
      if (res?.success) {
        setPayments(res.payments || []);
        if (res.summary) setSummary(res.summary);
      } else {
        setPayments([]);
        if (res?.message) setErrorMsg(res.message);
      }
    } catch (err) {
      console.warn("Failed to load payment reconciliation:", err);
      setErrorMsg(err.message || "Failed to load payment records.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openRefundModal = (p) => {
    setSelectedPayment(p);
    setRefundAmount(p.amount || 0);
    setRefundReason("");
  };

  const handleExecuteRefund = async () => {
    if (!selectedPayment) return;
    if (!refundReason.trim()) {
      alert("Please provide a legitimate reason for issuing this refund.");
      return;
    }
    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0 || amt > parseFloat(selectedPayment.amount)) {
      alert("Please enter a valid refund amount up to original transaction value.");
      return;
    }

    setIsRefunding(true);
    try {
      const res = await adminService.refundPayment(selectedPayment.id, {
        amount: amt,
        reason: refundReason
      });

      if (res?.success) {
        setActionMsg(res.message || "Refund processed and logged to audit vault.");
        setTimeout(() => setActionMsg(""), 3500);
        setSelectedPayment(null);
        await loadData();
      } else {
        alert(res?.message || "Refund failed.");
      }
    } catch (err) {
      alert(err.message || "Network error while processing refund.");
    } finally {
      setIsRefunding(false);
    }
  };

  const filtered = payments.filter((p) => {
    const st = (p.reconciliation_status || p.status || "UNKNOWN").toUpperCase();
    if (statusFilter !== "ALL" && st !== statusFilter) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(p.id).includes(q) ||
      (p.transaction_id || "").toLowerCase().includes(q) ||
      (p.user_name || "").toLowerCase().includes(q) ||
      (p.user_email || "").toLowerCase().includes(q) ||
      (p.station_name || "").toLowerCase().includes(q) ||
      String(p.booking_id || "").includes(q) ||
      String(p.session_id || "").includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-mono font-bold border border-purple-500/20">
              MODULE D • PAYMENT RECONCILIATION
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <CreditCard size={28} className="text-emerald-500" /> Payment & Transaction Reconciliation Center
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Authoritative MySQL ledger cross-matching payments against booking slots, live charging kWh sessions, and authorized refund workflows.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {actionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
          <Check size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Gross Settled Revenue</span>
          <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{parseFloat(summary.successfulAmount || 0).toLocaleString()}</span>
          <span className="text-[10px] text-[var(--text-muted)] block font-mono mt-0.5">{summary.successfulCount} settled orders</span>
        </div>
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
          <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block">Authorized Refunds</span>
          <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">₹{parseFloat(summary.refundedAmount || 0).toLocaleString()}</span>
          <span className="text-[10px] text-[var(--text-muted)] block font-mono mt-0.5">{summary.refundedCount} transactions</span>
        </div>
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">Pending / Unsettled</span>
          <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{summary.pendingCount}</span>
          <span className="text-[10px] text-[var(--text-muted)] block font-mono mt-0.5">Awaiting gateway webhook</span>
        </div>
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
          <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 block">Failed / Disputed</span>
          <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{summary.failedCount + summary.disputedCount}</span>
          <span className="text-[10px] text-[var(--text-muted)] block font-mono mt-0.5">Rejected by provider</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl theme-card flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="theme-input font-bold text-xs cursor-pointer"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="SUCCESS">Settled & Successful</option>
            <option value="PENDING">Pending Settlement</option>
            <option value="REFUNDED">Refunded</option>
            <option value="FAILED">Failed</option>
            <option value="DISPUTED">Disputed</option>
          </select>
        </div>

        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search txn ID, driver, station..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full theme-input pl-8 text-xs"
          />
        </div>
      </div>

      {/* Reconciliation Table */}
      <div className="theme-card p-6 overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
              <th className="py-3 px-3 rounded-l-xl">Txn ID / Payment</th>
              <th className="py-3 px-3">Driver / Customer</th>
              <th className="py-3 px-3">Linked Station & Bay</th>
              <th className="py-3 px-3">Cross-Match Linkage</th>
              <th className="py-3 px-3">Amount & Method</th>
              <th className="py-3 px-3">Reconciliation Status</th>
              <th className="py-3 px-3 text-right rounded-r-xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)] font-medium">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                  Loading verified ledger records from MySQL...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                  No payment records found matching filters.
                </td>
              </tr>
            ) : (
              filtered.slice((page - 1) * limit, page * limit).map((p) => {
                const status = (p.reconciliation_status || p.status || "UNKNOWN").toUpperCase();
                const isSuccess = status === "SUCCESS" || status === "COMPLETED";
                const isRefunded = status === "REFUNDED";
                const isPending = status === "PENDING";
                const isFailed = status === "FAILED";

                const badgeClass = isSuccess
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : isRefunded
                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                  : isPending
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";

                return (
                  <tr key={p.id} className="hover:bg-[var(--bg-surface-raised)]/60 transition">
                    <td className="py-4 px-3">
                      <span className="font-mono font-bold text-[var(--accent-primary)] block">
                        {p.transaction_id || `TXN#${p.id}`}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        {new Date(p.created_at || Date.now()).toLocaleString()}
                      </span>
                    </td>

                    <td className="py-4 px-3">
                      <span className="font-semibold text-[var(--text-primary)] block">{p.user_name || "Driver"}</span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">{p.user_email || `User #${p.user_id}`}</span>
                    </td>

                    <td className="py-4 px-3">
                      <span className="font-bold text-[var(--text-primary)] block">{p.station_name || "Station"}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{p.city || "Tamil Nadu"}</span>
                    </td>

                    <td className="py-4 px-3 font-mono text-xs">
                      {p.booking_id && (
                        <span className="text-blue-500 font-bold block">Booking #{p.booking_id}</span>
                      )}
                      {p.session_id && (
                        <span className="text-emerald-500 font-bold block">Session #{p.session_id}</span>
                      )}
                      {!p.booking_id && !p.session_id && (
                        <span className="text-[var(--text-muted)] italic">Direct Gateway Payment</span>
                      )}
                    </td>

                    <td className="py-4 px-3 font-mono">
                      <span className="text-sm font-extrabold text-[var(--text-primary)] block">₹{parseFloat(p.amount || 0).toFixed(2)}</span>
                      <span className="text-[10px] text-[var(--text-muted)] uppercase">{p.payment_method || "RAZORPAY"}</span>
                    </td>

                    <td className="py-4 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border ${badgeClass}`}>
                        {status}
                      </span>
                      {p.refund_amount && (
                        <span className="text-[10px] font-mono text-purple-500 font-bold block mt-1">
                          Ref: ₹{p.refund_amount}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-3 text-right">
                      <div className="flex gap-1.5 justify-end items-center">
                        {isSuccess && (
                          <button
                            onClick={() => openRefundModal(p)}
                            className="px-2.5 py-1.5 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-bold text-[11px] cursor-pointer flex items-center gap-1"
                          >
                            <RotateCcw size={12} /> Issue Refund
                          </button>
                        )}
                        {isRefunded && (
                          <span className="text-[10px] font-mono text-purple-500 font-bold">Refund Settled</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <Pagination
          page={Math.min(page, Math.ceil(filtered.length / limit) || 1)}
          totalPages={Math.ceil(filtered.length / limit) || 1}
          totalItems={filtered.length}
          limit={limit}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          limitOptions={[5, 8, 15, 30]}
        />
      </div>

      {/* REFUND MODAL */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-bold text-base text-[var(--text-primary)] flex items-center gap-2">
                <RotateCcw size={18} className="text-purple-500" /> Authorized Refund Review
              </h3>
              <button onClick={() => setSelectedPayment(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-1">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Payment ID:</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">#{selectedPayment.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Transaction Ref:</span>
                  <span className="font-mono text-[var(--text-primary)]">{selectedPayment.transaction_id || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Settled Amount:</span>
                  <span className="font-bold text-emerald-500 font-mono">₹{selectedPayment.amount}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-[var(--text-muted)] uppercase block mb-1">Refund Amount (INR) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedPayment.amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full theme-input p-2.5 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-muted)] uppercase block mb-1">Refund Authorization Reason *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="E.g. Charger failed to deliver full kWh charge due to power grid outage."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full theme-input p-2.5 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)] text-xs">
              <button
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 rounded-xl text-[var(--text-muted)]"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRefund}
                disabled={isRefunding}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
              >
                {isRefunding ? "Authorizing..." : "Confirm Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
