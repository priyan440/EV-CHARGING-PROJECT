import { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, Zap, Wrench, CreditCard,
  Building2, Calendar, Filter, Plus, Download, RefreshCw, AlertTriangle,
  CheckCircle2, Info, ArrowUpRight, ArrowDownRight, Edit3, Trash2, X,
  FileText, ShieldAlert, Check, HelpCircle, BarChart3, PieChart
} from "lucide-react";
import {
  getProfitabilitySummary,
  getProfitabilityStations,
  getProfitabilityTrends,
  getStationExpenses,
  createStationExpense,
  updateStationExpense,
  deleteStationExpense,
  getOwnerStations,
} from "../../services/ownerService";
import Pagination from "../../components/Pagination";

const CATEGORY_COLORS = {
  ELECTRICITY: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  MAINTENANCE: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  PAYMENT_FEE: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  RENT_LEASE: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  INSURANCE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  INTERNET_TELECOM: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  EQUIPMENT: "bg-rose-500/10 text-rose-500 border-rose-500/20",
  OTHER: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function OwnerProfitabilityAdvisor() {
  // Filters state
  const [selectedStation, setSelectedStation] = useState("ALL");
  const [selectedPeriod, setSelectedPeriod] = useState("month"); // 'today' | 'week' | 'month' | 'year' | 'all'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Data state
  const [stationsList, setStationsList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [stationBreakdown, setStationBreakdown] = useState([]);
  const [trends, setTrends] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expensePagination, setExpensePagination] = useState({ page: 1, totalPages: 1, totalItems: 0, limit: 10 });

  // Expense table search & filter
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("ALL");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expensePage, setExpensePage] = useState(1);

  // Loading & notification states
  const [loading, setLoading] = useState(true);
  const [savingExpense, setSavingExpense] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Add / Edit Modal state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseFormData, setExpenseFormData] = useState({
    stationId: "",
    category: "MAINTENANCE",
    amount: "",
    currency: "INR",
    expenseDate: new Date().toISOString().split("T")[0],
    description: "",
    documentReference: "",
  });

  // Load Station options for owner
  useEffect(() => {
    getOwnerStations()
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        setStationsList(list);
        if (list.length > 0 && !expenseFormData.stationId) {
          setExpenseFormData((prev) => ({ ...prev, stationId: list[0].id }));
        }
      })
      .catch((err) => console.warn("Failed to load owner stations:", err));
  }, []);

  // Fetch all profitability data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");

    const params = {
      stationId: selectedStation,
      period: selectedPeriod,
    };
    if (startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }

    try {
      const [sumRes, stRes, trRes] = await Promise.all([
        getProfitabilitySummary(params),
        getProfitabilityStations(params),
        getProfitabilityTrends({ stationId: selectedStation, days: 14 }),
      ]);

      if (sumRes?.success) setSummary(sumRes.summary);
      if (stRes?.success) setStationBreakdown(stRes.stations || []);
      if (trRes?.success) setTrends(trRes.trends || []);
    } catch (err) {
      console.error("Profitability fetch error:", err);
      setErrorMsg(err.message || "Failed to load profitability calculations.");
    } finally {
      setLoading(false);
    }
  }, [selectedStation, selectedPeriod, startDate, endDate]);

  // Fetch expenses ledger
  const fetchExpensesLedger = useCallback(async () => {
    try {
      const params = {
        stationId: selectedStation,
        category: expenseCategoryFilter,
        page: expensePage,
        limit: 10,
        search: expenseSearch,
      };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const res = await getStationExpenses(params);
      if (res?.success) {
        setExpenses(res.data || []);
        if (res.pagination) {
          setExpensePagination(res.pagination);
        }
      }
    } catch (err) {
      console.warn("Expenses fetch error:", err);
    }
  }, [selectedStation, expenseCategoryFilter, expensePage, expenseSearch, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchExpensesLedger();
  }, [fetchExpensesLedger]);

  // Handle open expense modal
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpenseFormData({
      stationId: stationsList[0]?.id || "",
      category: "MAINTENANCE",
      amount: "",
      currency: "INR",
      expenseDate: new Date().toISOString().split("T")[0],
      description: "",
      documentReference: "",
    });
    setExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (exp) => {
    setEditingExpense(exp);
    setExpenseFormData({
      stationId: exp.station_id,
      category: exp.category,
      amount: exp.amount,
      currency: exp.currency || "INR",
      expenseDate: exp.expense_date ? exp.expense_date.split("T")[0] : new Date().toISOString().split("T")[0],
      description: exp.description || "",
      documentReference: exp.document_reference || "",
    });
    setExpenseModalOpen(true);
  };

  // Submit Expense (Create or Update)
  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    setSavingExpense(true);
    setErrorMsg("");

    try {
      if (editingExpense) {
        const res = await updateStationExpense(editingExpense.id, expenseFormData);
        if (res?.success) {
          setSuccessMsg("Expense record updated successfully.");
          setExpenseModalOpen(false);
          fetchData();
          fetchExpensesLedger();
        } else {
          setErrorMsg(res?.message || "Failed to update expense.");
        }
      } else {
        const res = await createStationExpense(expenseFormData);
        if (res?.success) {
          setSuccessMsg("Operating expense recorded successfully.");
          setExpenseModalOpen(false);
          fetchData();
          fetchExpensesLedger();
        } else {
          setErrorMsg(res?.message || "Failed to record expense.");
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Network error submitting expense.");
    } finally {
      setSavingExpense(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (expId) => {
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;
    try {
      const res = await deleteStationExpense(expId);
      if (res?.success) {
        setSuccessMsg("Expense record deleted.");
        fetchData();
        fetchExpensesLedger();
      } else {
        setErrorMsg(res?.message || "Failed to delete expense.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to delete expense.");
    } finally {
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  // Export CSV Report
  const handleExportCSV = () => {
    if (!summary) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "=== STATION PROFITABILITY ADVISOR REPORT ===\n";
    csvContent += `Generated At,${new Date().toLocaleString()}\n`;
    csvContent += `Filter Station,${selectedStation}\n`;
    csvContent += `Period,${selectedPeriod}\n\n`;

    csvContent += "SUMMARY METRIC,AMOUNT (INR) / VALUE\n";
    csvContent += `Gross Charging Revenue,${summary.grossRevenue}\n`;
    csvContent += `Refunds & Chargebacks,${summary.refunds}\n`;
    csvContent += `Net Collections,${summary.netCollections}\n`;
    csvContent += `Electricity Costs,${summary.electricityCosts}\n`;
    csvContent += `Payment Processing Fees,${summary.paymentFees}\n`;
    csvContent += `Maintenance Expenses,${summary.maintenanceExpenses}\n`;
    csvContent += `Other Operating Expenses,${summary.otherExpenses}\n`;
    csvContent += `Total Operating Expenses,${summary.totalExpenses}\n`;
    csvContent += `Estimated Operating Profit,${summary.operatingProfit}\n`;
    csvContent += `Profit Margin (%),${summary.profitMargin}%\n`;
    csvContent += `Energy Delivered (kWh),${summary.totalKwhDelivered}\n`;
    csvContent += `Revenue per kWh (INR),${summary.revenuePerKwh}\n`;
    csvContent += `Energy Cost per kWh (INR),${summary.energyCostPerKwh}\n\n`;

    csvContent += "=== STATION BREAKDOWN ===\n";
    csvContent += "Station Name,City,Chargers,Gross Rev,Net Rev,Energy (kWh),Electricity,Expenses,Profit,Margin %\n";
    stationBreakdown.forEach((st) => {
      csvContent += `"${st.stationName}","${st.city}",${st.chargerCount},${st.grossRevenue},${st.netCollections},${st.totalKwh},${st.electricityCosts},${st.totalExpenses},${st.operatingProfit},${st.profitMargin}%\n`;
    });

    csvContent += "\n=== RECORDED EXPENSES LEDGER ===\n";
    csvContent += "Expense ID,Station,Category,Amount,Currency,Date,Description,Reference\n";
    expenses.forEach((e) => {
      csvContent += `"${e.expense_id}","${e.station_name}","${e.category}",${e.amount},"${e.currency}","${e.expense_date ? e.expense_date.split("T")[0] : ""}","${(e.description || "").replace(/"/g, '""')}","${e.document_reference || ""}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Station_Profitability_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe formatting helpers
  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const isProfitPositive = (summary?.operatingProfit || 0) >= 0;

  // Max value in trends for SVG scaling
  const maxTrendVal = useMemo(() => {
    if (!trends || trends.length === 0) return 1000;
    const max = Math.max(...trends.map((t) => Math.max(t.grossRevenue, t.expenses, t.operatingProfit, 100)));
    return max * 1.15;
  }, [trends]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      {/* 1. Header Banner */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              AUTHORITATIVE FINANCIAL ADVISOR
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <TrendingUp size={28} className="text-[var(--accent-primary)]" /> Station Profitability Advisor
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-2xl">
            Real-time operating revenue, energy tariffs, payment processing fees, and operating expense ledger. Calculate authoritative operating profit and unit economics across your charging network.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={loading || !summary}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition cursor-pointer flex items-center gap-1.5"
            title="Download full profitability CSV report"
          >
            <Download size={14} /> Export Report
          </button>

          <button
            onClick={handleOpenAddExpense}
            className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
          >
            <Plus size={15} /> Record Expense
          </button>

          <button
            onClick={() => {
              fetchData();
              fetchExpensesLedger();
            }}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Refresh Financial Metrics"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check size={16} /> <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertTriangle size={16} /> <span>{errorMsg}</span>
        </div>
      )}

      {/* Incomplete Data Warning Callout if electricity cost is estimated */}
      {summary?.incompleteDataWarning && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Info size={18} className="shrink-0 text-amber-500" />
            <div>
              <span className="font-bold block">Estimated Electricity Tariffs In Effect:</span>
              <span>{summary.incompleteDataWarning}</span>
            </div>
          </div>
          <button
            onClick={handleOpenAddExpense}
            className="px-3 py-1 rounded-xl bg-amber-600 text-white font-bold text-[11px] shrink-0 cursor-pointer"
          >
            + Add Utility Bill
          </button>
        </div>
      )}

      {/* 2. Global Filter Controls Bar */}
      <div className="p-4 rounded-2xl theme-card flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Station Selector */}
          <div className="flex items-center gap-1.5">
            <Building2 size={15} className="text-[var(--text-muted)]" />
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="theme-input font-bold text-xs cursor-pointer"
            >
              <option value="ALL">All Stations ({stationsList.length})</option>
              {stationsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.station_name || `Station #${s.id}`} ({s.city})
                </option>
              ))}
            </select>
          </div>

          {/* Period Quick Selectors */}
          <div className="flex p-1 bg-[var(--bg-surface-raised)] rounded-xl border border-[var(--border-subtle)]">
            {[
              { id: "today", label: "Today" },
              { id: "week", label: "Last 7 Days" },
              { id: "month", label: "Last 30 Days" },
              { id: "year", label: "1 Year" },
              { id: "all", label: "All Time" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPeriod(p.id);
                  setStartDate("");
                  setEndDate("");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedPeriod === p.id && !startDate
                    ? "bg-[var(--accent-primary)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[var(--text-muted)]" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="theme-input text-xs py-1 px-2.5"
          />
          <span className="text-xs text-[var(--text-muted)]">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="theme-input text-xs py-1 px-2.5"
          />
        </div>
      </div>

      {/* 3. Primary KPI Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="p-5 rounded-2xl theme-card shadow-sm space-y-2 border border-emerald-500/20">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)]">
            <span className="uppercase tracking-wider">Gross Charging Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)]">
            {formatCurrency(summary?.grossRevenue)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
            <span>Net Collections:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(summary?.netCollections)}
            </span>
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="p-5 rounded-2xl theme-card shadow-sm space-y-2 border border-rose-500/20">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)]">
            <span className="uppercase tracking-wider">Total Operating Expenses</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {formatCurrency(summary?.totalExpenses)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
            <span>Power & Fees:</span>
            <span className="font-bold font-mono">
              {formatCurrency((summary?.electricityCosts || 0) + (summary?.paymentFees || 0))}
            </span>
          </div>
        </div>

        {/* Operating Profit */}
        <div className={`p-5 rounded-2xl theme-card shadow-sm space-y-2 border ${
          isProfitPositive ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)]">
            <span className="uppercase tracking-wider">Estimated Operating Profit</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isProfitPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            }`}>
              {isProfitPositive ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
            </div>
          </div>
          <div className={`text-2xl font-black ${
            isProfitPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}>
            {formatCurrency(summary?.operatingProfit)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
            <span>Profit Margin:</span>
            <span className={`font-bold font-mono ${isProfitPositive ? "text-emerald-500" : "text-rose-500"}`}>
              {summary?.profitMargin || 0}%
            </span>
          </div>
        </div>

        {/* Unit Economics: Revenue & Cost per kWh */}
        <div className="p-5 rounded-2xl theme-card shadow-sm space-y-2 border border-blue-500/20">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)]">
            <span className="uppercase tracking-wider">Unit Economics (per kWh)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Zap size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-[var(--text-primary)]">
            ₹{summary?.revenuePerKwh || 0} <span className="text-xs text-[var(--text-muted)] font-normal">/ kWh</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
            <span>Energy Cost / kWh:</span>
            <span className="font-bold text-amber-500 font-mono">
              ₹{summary?.energyCostPerKwh || 0} / kWh
            </span>
          </div>
        </div>
      </div>

      {/* 4. Detailed Cost Classification Breakdown */}
      <div className="theme-card p-6 space-y-4">
        <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
          <PieChart size={17} className="text-[var(--accent-primary)]" />
          Operating Profit Calculation & Cost Allocation Breakdown
        </h3>
        <p className="text-xs text-[var(--text-muted)] -mt-2">
          Formula: Operating Profit = Charging Revenue - Electricity Costs - Payment Processing Fees - Maintenance Expenses - Other Recorded Operating Expenses.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {/* Revenue */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
            <span className="text-[10px] uppercase font-bold text-emerald-500 block">Gross Revenue (+)</span>
            <span className="text-base font-extrabold text-[var(--text-primary)] mt-1 block">
              {formatCurrency(summary?.grossRevenue)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">Customer payments</span>
          </div>

          {/* Electricity */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
            <span className="text-[10px] uppercase font-bold text-amber-500 block">Electricity Costs (-)</span>
            <span className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-1 block">
              {formatCurrency(summary?.electricityCosts)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {summary?.isElectricityCostEstimated ? "(Estimated grid rate)" : "(Billed bills)"}
            </span>
          </div>

          {/* Payment Fees */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
            <span className="text-[10px] uppercase font-bold text-purple-500 block">Gateway Fees (-)</span>
            <span className="text-base font-extrabold text-purple-600 dark:text-purple-400 mt-1 block">
              {formatCurrency(summary?.paymentFees)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {summary?.isPaymentFeeEstimated ? "(Est. 2% gateway)" : "(Recorded fees)"}
            </span>
          </div>

          {/* Maintenance */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
            <span className="text-[10px] uppercase font-bold text-blue-500 block">Maintenance (-)</span>
            <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">
              {formatCurrency(summary?.maintenanceExpenses)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">Repairs & hardware</span>
          </div>

          {/* Other Expenses */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
            <span className="text-[10px] uppercase font-bold text-rose-500 block">Other Expenses (-)</span>
            <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 mt-1 block">
              {formatCurrency(summary?.otherExpenses)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">Rent, insurance, etc.</span>
          </div>

          {/* Net Operating Profit */}
          <div className={`p-3.5 rounded-xl border ${
            isProfitPositive ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"
          }`}>
            <span className="text-[10px] uppercase font-bold block opacity-80">Operating Profit (=)</span>
            <span className={`text-base font-black mt-1 block ${
              isProfitPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}>
              {formatCurrency(summary?.operatingProfit)}
            </span>
            <span className="text-[10px] font-mono font-bold">
              Margin: {summary?.profitMargin || 0}%
            </span>
          </div>
        </div>
      </div>

      {/* 5. Station Comparison Table */}
      <div className="theme-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Building2 size={17} className="text-[var(--accent-primary)]" />
              Station Comparative Performance
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Compare revenue, electricity tariffs, expenses, and profit margins across your network.
            </p>
          </div>
          <span className="text-xs font-mono text-[var(--text-muted)] font-bold">
            {stationBreakdown.length} Stations Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                <th className="py-3 px-3 rounded-l-xl">Station & Location</th>
                <th className="py-3 px-3">Chargers</th>
                <th className="py-3 px-3">Gross Revenue</th>
                <th className="py-3 px-3">Energy (kWh)</th>
                <th className="py-3 px-3">Electricity Cost</th>
                <th className="py-3 px-3">Total Expenses</th>
                <th className="py-3 px-3">Operating Profit</th>
                <th className="py-3 px-3 rounded-r-xl">Profit Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)] font-medium">
              {stationBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[var(--text-muted)]">
                    No stations found for authenticated owner.
                  </td>
                </tr>
              ) : (
                stationBreakdown.map((st) => {
                  const positive = st.operatingProfit >= 0;
                  return (
                    <tr key={st.id} className="hover:bg-[var(--bg-surface-raised)]/60 transition">
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-[var(--text-primary)] block">
                          {st.stationName}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          ID: {st.stationId} • {st.city}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono">
                        {st.chargerCount} Chargers
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(st.grossRevenue)}
                      </td>

                      <td className="py-3.5 px-3 font-mono">
                        {st.totalKwh} kWh
                      </td>

                      <td className="py-3.5 px-3 font-mono text-amber-500">
                        {formatCurrency(st.electricityCosts)}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-rose-500">
                        {formatCurrency(st.totalExpenses)}
                      </td>

                      <td className={`py-3.5 px-3 font-mono font-black ${positive ? "text-emerald-500" : "text-rose-500"}`}>
                        {formatCurrency(st.operatingProfit)}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                          positive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        }`}>
                          {st.profitMargin}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Daily / Weekly Profitability Trends Chart */}
      <div className="theme-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <BarChart3 size={17} className="text-[var(--accent-primary)]" />
              14-Day Revenue vs Operating Expenses Trajectory
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Daily trend sequence of verified charging receipts, power consumption, and recorded operational outlays.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Revenue
            </span>
            <span className="flex items-center gap-1.5 text-rose-500">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Expenses
            </span>
            <span className="flex items-center gap-1.5 text-[var(--accent-primary)]">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-primary)] inline-block"></span> Profit
            </span>
          </div>
        </div>

        {/* CSS/SVG Responsive Trends Bar Chart */}
        <div className="pt-4 pb-2">
          {trends.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              No trend records available for this period.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-48 border-b border-[var(--border-subtle)] pb-2">
                {trends.map((t, idx) => {
                  const revHeight = Math.min(100, (t.grossRevenue / maxTrendVal) * 100);
                  const expHeight = Math.min(100, (t.expenses / maxTrendVal) * 100);

                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-16 bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-2 rounded-xl shadow-xl text-[10px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                        <span className="font-bold block text-[var(--text-primary)]">{t.date}</span>
                        <span className="text-emerald-500 block">Rev: ₹{t.grossRevenue}</span>
                        <span className="text-rose-500 block">Exp: ₹{t.expenses}</span>
                        <span className="text-[var(--accent-primary)] block font-bold">Profit: ₹{t.operatingProfit}</span>
                      </div>

                      {/* Twin Bar */}
                      <div className="w-full flex items-end justify-center gap-1 h-36">
                        <div
                          style={{ height: `${Math.max(4, revHeight)}%` }}
                          className="w-2.5 rounded-t bg-emerald-500/80 group-hover:bg-emerald-400 transition"
                        />
                        <div
                          style={{ height: `${Math.max(4, expHeight)}%` }}
                          className="w-2.5 rounded-t bg-rose-500/80 group-hover:bg-rose-400 transition"
                        />
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono mt-1 text-center truncate w-full">
                        {t.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 7. Paginated Operating Expenses Ledger */}
      <div className="theme-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <FileText size={17} className="text-[var(--accent-primary)]" />
              Recorded Operating Expenses Ledger
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Verified outlays (Electricity bills, contractor maintenance, leases, telecom) persisting in MySQL.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <select
              value={expenseCategoryFilter}
              onChange={(e) => {
                setExpenseCategoryFilter(e.target.value);
                setExpensePage(1);
              }}
              className="theme-input font-bold text-xs cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="ELECTRICITY">Electricity Utility</option>
              <option value="MAINTENANCE">Maintenance & Repairs</option>
              <option value="PAYMENT_FEE">Payment Gateway Fees</option>
              <option value="RENT_LEASE">Rent & Space Lease</option>
              <option value="INSURANCE">Insurance & Compliance</option>
              <option value="INTERNET_TELECOM">Internet & Telematics</option>
              <option value="EQUIPMENT">Hardware & Spares</option>
              <option value="OTHER">Other Operating</option>
            </select>

            <button
              onClick={handleOpenAddExpense}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold cursor-pointer hover:opacity-90 transition flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Expense
            </button>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                <th className="py-3 px-3 rounded-l-xl">Expense ID</th>
                <th className="py-3 px-3">Station</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Description & Reference</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)] font-medium">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                    No recorded expenses matching your filter. Click "+ Add Expense" to record utility bills or repairs.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => {
                  const catClass = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.OTHER;
                  return (
                    <tr key={exp.id} className="hover:bg-[var(--bg-surface-raised)]/60 transition">
                      <td className="py-3.5 px-3 font-mono font-bold text-[var(--accent-primary)]">
                        {exp.expense_id}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-bold text-[var(--text-primary)] block">
                          {exp.station_name || `Station #${exp.station_id}`}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">{exp.city}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase ${catClass}`}>
                          {exp.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-mono">
                        {exp.expense_date ? exp.expense_date.split("T")[0] : "—"}
                      </td>

                      <td className="py-3.5 px-3 max-w-xs">
                        <span className="block truncate font-medium text-[var(--text-primary)]">
                          {exp.description || "—"}
                        </span>
                        {exp.document_reference && (
                          <span className="text-[10px] text-[var(--text-muted)] font-mono block">
                            Ref: {exp.document_reference}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 font-mono font-extrabold text-rose-600 dark:text-rose-400">
                        {formatCurrency(exp.amount)}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditExpense(exp)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] cursor-pointer"
                            title="Edit Expense"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            title="Delete Expense"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {expensePagination.totalPages > 1 && (
            <Pagination
              page={expensePage}
              totalPages={expensePagination.totalPages}
              totalItems={expensePagination.totalItems}
              limit={expensePagination.limit}
              onPageChange={(p) => setExpensePage(p)}
              onLimitChange={() => {}}
              limitOptions={[10]}
            />
          )}
        </div>
      </div>

      {/* 8. MODAL: ADD / EDIT EXPENSE */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--accent-primary)]">
                  Operating Ledger Entry
                </span>
                <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <CreditCard size={18} className="text-[var(--accent-primary)]" />
                  {editingExpense ? `Edit Expense ${editingExpense.expense_id}` : "Record Station Operating Expense"}
                </h2>
              </div>
              <button
                onClick={() => setExpenseModalOpen(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitExpense}>
              <div className="p-6 space-y-4">
                {/* Station Selection */}
                <div>
                  <label className="text-xs font-bold text-[var(--text-primary)] uppercase block mb-1">
                    Station *
                  </label>
                  <select
                    value={expenseFormData.stationId}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, stationId: e.target.value })}
                    required
                    className="w-full theme-input text-xs font-bold"
                  >
                    {stationsList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.station_name || `Station #${st.id}`} ({st.city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category & Amount in 2 cols */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)] uppercase block mb-1">
                      Expense Category *
                    </label>
                    <select
                      value={expenseFormData.category}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                      required
                      className="w-full theme-input text-xs"
                    >
                      <option value="ELECTRICITY">Electricity / Power Bill</option>
                      <option value="MAINTENANCE">Maintenance & Repairs</option>
                      <option value="PAYMENT_FEE">Payment Gateway Fee</option>
                      <option value="RENT_LEASE">Space Rent / Land Lease</option>
                      <option value="INSURANCE">Insurance & Compliance</option>
                      <option value="INTERNET_TELECOM">Internet & Telematics</option>
                      <option value="EQUIPMENT">Equipment & Spares</option>
                      <option value="OTHER">Other Operating Outlay</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)] uppercase block mb-1">
                      Amount (INR) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 1500.00"
                      value={expenseFormData.amount}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                      required
                      className="w-full theme-input text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Date & Document Ref */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)] uppercase block mb-1">
                      Expense Date *
                    </label>
                    <input
                      type="date"
                      value={expenseFormData.expenseDate}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, expenseDate: e.target.value })}
                      required
                      className="w-full theme-input text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)] uppercase block mb-1">
                      Invoice / Document Ref
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INV-TNEB-OCT26"
                      value={expenseFormData.documentReference}
                      onChange={(e) => setExpenseFormData({ ...expenseFormData, documentReference: e.target.value })}
                      className="w-full theme-input text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold text-[var(--text-primary)] uppercase block mb-1">
                    Description & Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide details regarding this expenditure..."
                    value={expenseFormData.description}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, description: e.target.value })}
                    className="w-full theme-input text-xs"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  disabled={savingExpense}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="px-5 py-2 rounded-xl bg-[var(--accent-primary)] hover:opacity-90 text-white font-bold text-xs shadow-md cursor-pointer transition flex items-center gap-1.5"
                >
                  {savingExpense ? "Saving..." : editingExpense ? "Update Expense" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
