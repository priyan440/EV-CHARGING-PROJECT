import { useState } from "react";
import { TrendingUp, DollarSign, CreditCard, ArrowDownRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useSystemState } from "../../contexts/SystemStateContext";

export default function OwnerRevenue() {
  const { currentUser } = useAuth();
  const { payments, settlements } = useSystemState();

  const ownerCounterId = currentUser?.counterId || "OWNER0001";
  const mySettlements = settlements.filter(
    (s) => !s.ownerCounterId || s.ownerCounterId.toUpperCase() === ownerCounterId.toUpperCase()
  );

  const grossRevenue = 82500;
  const platformFee = 4125;
  const taxesDeducted = 7425;
  const refundsDeducted = 1500;
  const netRevenue = grossRevenue - platformFee - taxesDeducted - refundsDeducted;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded border border-amber-500/30">
              SETTLEMENT SIMULATION MODE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <TrendingUp size={28} className="text-emerald-400" /> Station Owner Payouts & Revenue
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gross station revenue, platform commission (5%), GST tax deductions, refunds, and net bank settlements.
          </p>
        </div>

        <div className="px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Net Bank Settlement</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">₹{netRevenue.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Station Revenue</span>
          <h3 className="text-2xl font-black text-white font-mono mt-1">₹{grossRevenue.toLocaleString("en-IN")}</h3>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Platform Fee (5%)</span>
          <h3 className="text-2xl font-black text-amber-400 font-mono mt-1">₹{platformFee.toLocaleString("en-IN")}</h3>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Taxes & Refunds</span>
          <h3 className="text-2xl font-black text-rose-400 font-mono mt-1">₹{(taxesDeducted + refundsDeducted).toLocaleString("en-IN")}</h3>
        </div>

        <div className="p-5 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-xl">
          <span className="text-[10px] text-slate-400 uppercase font-bold block">Settlement Status</span>
          <h3 className="text-xl font-black text-emerald-400 font-mono mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-5 h-5" /> PAID TO BANK
          </h3>
        </div>
      </div>

      {/* Payout Settlements Ledger */}
      <div className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white">Settlement Payout Records</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3 rounded-l-xl">Settlement ID</th>
                <th className="py-3 px-3">Gross Revenue</th>
                <th className="py-3 px-3">Commission (5%)</th>
                <th className="py-3 px-3">Taxes & Refunds</th>
                <th className="py-3 px-3">Net Payout</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 rounded-r-xl">Payout Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200 font-medium">
              {mySettlements.map((s) => (
                <tr key={s.settlementId} className="hover:bg-slate-900/60 transition">
                  <td className="py-4 px-3 font-bold text-cyan-400">{s.settlementId}</td>
                  <td className="py-4 px-3 text-white">₹{s.grossRevenue.toLocaleString("en-IN")}</td>
                  <td className="py-4 px-3 text-amber-400">₹{s.platformCommission.toLocaleString("en-IN")}</td>
                  <td className="py-4 px-3 text-rose-400">₹{(s.taxesDeducted + s.refundsDeducted).toLocaleString("en-IN")}</td>
                  <td className="py-4 px-3 font-bold text-emerald-400 text-sm">₹{s.netPayout.toLocaleString("en-IN")}</td>
                  <td className="py-4 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        s.status === "PAID"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-slate-400">{new Date(s.payoutDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
