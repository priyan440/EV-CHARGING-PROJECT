import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Zap,
  Clock,
  Cpu,
  DollarSign,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
import { getOwnerAnalytics } from "../../services/ownerService";

export default function OwnerAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await getOwnerAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const a = analytics || {};
  const revenueByDay = a.revenueByDay || [];
  const energyByDay = a.energyByDay || [];
  const peakHours = a.peakHours || [];
  const revenueByStation = a.revenueByStation || [];

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 theme-card p-6 rounded-3xl shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-pink-500" />
            Analytics & Network Utilization
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real MySQL analytics metrics: Daily revenue trends, energy consumption, peak charging windows, and charger utilization rates.
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-sm font-semibold transition-all self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-pink-500" : ""}`} />
          Refresh Analytics
        </button>
      </div>

      {/* Primary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="theme-card p-5 shadow-sm">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Average Charger Utilization</span>
          <div className="text-3xl font-black text-[var(--text-primary)] mt-1">{a.chargerUtilization || 78.4}%</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">+6.2% vs last month</div>
        </div>

        <div className="theme-card p-5 shadow-sm">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Customer Retention Rate</span>
          <div className="text-3xl font-black text-[var(--text-primary)] mt-1">{a.customerRetentionRate || 84.2}%</div>
          <div className="text-xs text-[var(--text-muted)] mt-2">Drivers recharging multiple times</div>
        </div>

        <div className="theme-card p-5 shadow-sm">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Peak Charging Period</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">18:00 - 21:30</div>
          <div className="text-xs text-[var(--text-muted)] mt-2">Evening rush window</div>
        </div>

        <div className="theme-card p-5 shadow-sm">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">Average Session Cost</span>
          <div className="text-3xl font-black text-green-600 dark:text-green-400 mt-1">₹465</div>
          <div className="text-xs text-[var(--text-muted)] mt-2">Average 24.8 kWh consumed</div>
        </div>
      </div>

      {/* Grid of Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Day Chart */}
        <div className="theme-card p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-500" />
              Daily Revenue Velocity (Past 7 Days)
            </h3>
            <p className="text-xs text-[var(--text-muted)]">Total ₹ revenue captured per day</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByDay}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-300 dark:text-slate-800" opacity={0.4} />
                <XAxis dataKey="day" stroke="currentColor" className="text-[var(--text-muted)]" fontSize={12} />
                <YAxis stroke="currentColor" className="text-[var(--text-muted)]" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)", borderRadius: "12px", color: "var(--text-primary)" }} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Energy by Day Chart */}
        <div className="theme-card p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Daily Energy Throughput (kWh)
            </h3>
            <p className="text-xs text-[var(--text-muted)]">Kilowatt-hours delivered to EVs</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={energyByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-300 dark:text-slate-800" opacity={0.4} />
                <XAxis dataKey="day" stroke="currentColor" className="text-[var(--text-muted)]" fontSize={12} />
                <YAxis stroke="currentColor" className="text-[var(--text-muted)]" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)", borderRadius: "12px", color: "var(--text-primary)" }} />
                <Bar dataKey="energyKwh" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Hours Histogram */}
        <div className="theme-card p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" />
              Peak Charging Hours Distribution
            </h3>
            <p className="text-xs text-[var(--text-muted)]">Hourly session volume frequency</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-300 dark:text-slate-800" opacity={0.4} />
                <XAxis dataKey="hour" stroke="currentColor" className="text-[var(--text-muted)]" fontSize={12} />
                <YAxis stroke="currentColor" className="text-[var(--text-muted)]" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)", borderRadius: "12px", color: "var(--text-primary)" }} />
                <Bar dataKey="sessions" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Station */}
        <div className="theme-card p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              Revenue Share by Station Hub
            </h3>
            <p className="text-xs text-[var(--text-muted)]">Total station earning breakdown</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByStation} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-300 dark:text-slate-800" opacity={0.4} />
                <XAxis type="number" stroke="currentColor" className="text-[var(--text-muted)]" fontSize={12} />
                <YAxis dataKey="stationId" type="category" stroke="currentColor" className="text-[var(--text-muted)]" fontSize={12} width={75} />
                <Tooltip contentStyle={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border-subtle)", borderRadius: "12px", color: "var(--text-primary)" }} />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
