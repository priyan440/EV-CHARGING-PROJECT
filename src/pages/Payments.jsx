import { useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  Wallet as WalletIcon,
  Tag,
  Gift,
  AlertCircle,
  PlusCircle,
  FileText,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSystemState } from "../contexts/SystemStateContext";
import InvoiceModal from "../components/InvoiceModal";

export default function Payments() {
  const { currentUser } = useAuth();
  const { payments, wallet, topUpWallet, loyaltyPoints, coupons, disputes, setDisputes } = useSystemState();

  const [activeTab, setActiveTab] = useState("History");
  const [topUpAmount, setTopUpAmount] = useState("500");
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeMsg, setDisputeMsg] = useState("");

  const userCounterId = currentUser?.counterId || "CUS0001";
  const myPayments = payments.filter(
    (p) => !p.counterId || p.counterId.toUpperCase() === userCounterId.toUpperCase()
  );

  const totalSpent = myPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const handleTopUp = (e) => {
    e.preventDefault();
    topUpWallet(topUpAmount);
  };

  const handleRaiseDispute = (e) => {
    e.preventDefault();
    if (!disputeReason) return;
    const newDispute = {
      disputeId: `DISPUTE${Date.now().toString().slice(-6)}`,
      paymentId: myPayments[0]?.paymentId || "PAY000001",
      bookingId: myPayments[0]?.bookingId || "BK000001",
      counterId: userCounterId,
      reason: disputeReason,
      status: "OPEN",
      createdAt: new Date().toISOString(),
    };
    setDisputes((prev) => [newDispute, ...prev]);
    setDisputeMsg(`Dispute ${newDispute.disputeId} submitted successfully. Support team will review.`);
    setDisputeReason("");
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded border border-cyan-500/30">
              RAZORPAY TEST MODE ARCHITECTURE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <CreditCard size={28} className="text-cyan-400" /> Payments, Wallet & Financial Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Server-verified Razorpay payments, EV customer wallet balance, tax invoices, promo coupons, and loyalty points.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-center">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Wallet Balance</span>
            <span className="text-xl font-black text-cyan-400 font-mono">₹{wallet.balance}</span>
          </div>
          <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase block">EV Points</span>
            <span className="text-xl font-black text-emerald-400 font-mono">{loyaltyPoints} pts</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {["History", "Wallet & Top-up", "Coupons & Rewards", "Payment Disputes"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === tab
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB 1: PAYMENT HISTORY */}
      {activeTab === "History" && (
        <div className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl overflow-x-auto space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">Verified Razorpay Payments Ledger</h3>
            <span className="text-xs text-slate-400">Total Spent: <span className="text-emerald-400 font-mono font-bold">₹{totalSpent.toFixed(2)}</span></span>
          </div>

          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider font-mono">
                <th className="py-3 px-3 rounded-l-xl">Payment ID</th>
                <th className="py-3 px-3">Booking ID</th>
                <th className="py-3 px-3">Razorpay Order ID</th>
                <th className="py-3 px-3">Razorpay Payment ID</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right rounded-r-xl">Tax Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium font-mono">
              {myPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No payment transactions logged.
                  </td>
                </tr>
              ) : (
                myPayments.map((p) => (
                  <tr key={p.paymentId} className="hover:bg-slate-900/60 transition">
                    <td className="py-4 px-3 font-bold text-cyan-400">{p.paymentId}</td>
                    <td className="py-4 px-3 text-emerald-400">{p.bookingId}</td>
                    <td className="py-4 px-3 text-slate-400">{p.razorpayOrderId || "order_test_01"}</td>
                    <td className="py-4 px-3 text-slate-300">{p.razorpayPaymentId || p.transactionId}</td>
                    <td className="py-4 px-3 font-sans font-bold text-white">{p.paymentMethod}</td>
                    <td className="py-4 px-3 font-bold text-white">₹{p.amount}</td>
                    <td className="py-4 px-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {p.status || "CAPTURED"}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right font-sans">
                      <button
                        onClick={() =>
                          setSelectedInvoiceBooking({
                            bookingId: p.bookingId,
                            invoiceId: p.invoiceId || "INV000001",
                            customerName: p.customerName || "Priyan",
                            counterId: p.counterId || "CUS0001",
                            stationName: p.stationName || "EV Power Hub",
                            connectorType: "CCS2",
                            vehicleNumber: "TN58AB1234",
                            estimatedKwh: 18.5,
                            chargingCost: (p.amount || 416) - 50,
                            serviceFee: 20,
                            tax: 30,
                            totalAmount: p.amount || 416,
                            date: p.date ? new Date(p.date).toLocaleDateString() : new Date().toLocaleDateString(),
                            time: "10:00 AM",
                          })
                        }
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-semibold border border-slate-700 inline-flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" /> Invoice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: WALLET & TOP-UP */}
      {activeTab === "Wallet & Top-up" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <WalletIcon className="text-cyan-400" /> EV Wallet Top-Up
            </h3>
            <p className="text-xs text-slate-400">
              Add funds to your customer wallet for instant one-click charging station payments.
            </p>

            <form onSubmit={handleTopUp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Select or Enter Amount (₹)</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {["200", "500", "1000"].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopUpAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold border ${
                        topUpAmount === amt
                          ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                          : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-sm font-mono font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/50"
              >
                <PlusCircle className="w-4 h-4" /> Top-Up Wallet via Razorpay Test Mode
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Wallet Transaction Ledger</h3>
            <div className="space-y-2">
              {wallet.transactions.map((t) => (
                <div key={t.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-white block">{t.description}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{t.id} • {new Date(t.date).toLocaleDateString()}</span>
                  </div>
                  <span className={`font-mono font-bold text-sm ${t.type === "CREDIT" ? "text-emerald-400" : "text-rose-400"}`}>
                    {t.type === "CREDIT" ? "+" : "-"}₹{t.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COUPONS & REWARDS */}
      {activeTab === "Coupons & Rewards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coupons.map((c) => (
            <div key={c.code} className="p-5 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs border border-cyan-500/30">
                  {c.code}
                </span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {c.discountType === "FLAT" ? `₹${c.discountValue} OFF` : `${c.discountValue}% OFF`}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">{c.description}</p>
              <p className="text-[11px] text-slate-500 font-mono">Min Booking Amount: ₹{c.minAmount}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: PAYMENT DISPUTES */}
      {activeTab === "Payment Disputes" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Raise Payment Dispute</h3>
            <p className="text-xs text-slate-400">
              Dispute a double deduction or transaction issue for administrative review.
            </p>

            {disputeMsg && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300">
                {disputeMsg}
              </div>
            )}

            <form onSubmit={handleRaiseDispute} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Dispute Description</label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Describe payment issue (e.g. Charged twice during network delay)..."
                  rows={4}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
              >
                Submit Dispute DISPUTE000001
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white">Active & Past Payment Disputes</h3>
            <div className="space-y-3">
              {disputes.map((d) => (
                <div key={d.disputeId} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-rose-400">{d.disputeId}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {d.status}
                    </span>
                  </div>
                  <p className="text-slate-300">{d.reason}</p>
                  {d.adminNotes && (
                    <p className="text-[11px] text-emerald-400 bg-slate-950 p-2 rounded border border-slate-800 font-mono">
                      Admin Notes: {d.adminNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tax Invoice Modal */}
      {selectedInvoiceBooking && (
        <InvoiceModal
          booking={selectedInvoiceBooking}
          onClose={() => setSelectedInvoiceBooking(null)}
        />
      )}
    </div>
  );
}
