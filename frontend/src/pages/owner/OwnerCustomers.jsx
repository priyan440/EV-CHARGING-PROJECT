import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  RefreshCw,
  Car,
  Zap,
  DollarSign,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  User,
  X,
} from "lucide-react";
import { getOwnerCustomers } from "../../services/ownerService";

export default function OwnerCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await getOwnerCustomers();
      setCustomers(data);
    } catch (err) {
      console.error(err);
      showToast("Error loading customer database from MySQL");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      c.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in text-[var(--text-primary)]">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-blue-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-blue-400/30 animate-bounce">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 theme-card p-6 rounded-3xl shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3">
            <Users className="w-7 h-7 text-purple-500" />
            Customer Management & EV Profiles
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Registered EV drivers who utilize your network. Track charging session loyalty, energy throughput, and lifetime spending.
          </p>
        </div>

        <button
          onClick={loadCustomers}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-sm font-semibold transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-500" : ""}`} />
          Refresh Customers
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md w-full">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search by customer name, email, vehicle number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Customers Table / Cards */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-[var(--text-muted)] text-sm animate-pulse">Loading customers from MySQL...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-16 theme-card rounded-3xl">
          <Users className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">No Customers Found</h3>
          <p className="text-[var(--text-muted)] text-xs">Customer profiles will populate as sessions are recorded.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((c) => (
            <div
              key={c.customerId || c.customer_id || c.user_id}
              className="theme-card rounded-3xl p-5 hover:border-purple-500/40 transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-xs px-2.5 py-0.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    {c.customerId || c.customer_id}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
                    Last: {c.lastChargingDate ? new Date(c.lastChargingDate).toLocaleDateString() : "Recent"}
                  </span>
                </div>

                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">{c.customerName || c.name || "EV Driver"}</h3>
                <div className="space-y-1 text-xs text-[var(--text-muted)] mb-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <span>{c.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
                    <Car className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span>{c.vehicleModel || "EV Vehicle"} ({c.vehicleNumber || "TN01EV0001"})</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] p-3 rounded-2xl mb-4 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">Sessions</div>
                    <div className="font-bold text-[var(--text-primary)] text-sm">{c.totalSessions || c.sessionCount || 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">Energy</div>
                    <div className="font-bold text-amber-600 dark:text-amber-400 text-sm">{c.totalEnergyKwh || c.energyKwh || 0} kWh</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">Spent</div>
                    <div className="font-bold text-green-600 dark:text-green-400 text-sm">₹{c.totalSpending || c.totalSpent || c.spent || 0}</div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(c)}
                className="w-full py-2 bg-purple-600/10 hover:bg-purple-600 text-purple-600 dark:text-purple-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-purple-500/30 cursor-pointer"
              >
                View Full Profile &rarr;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Customer Profile Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="theme-card rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-5">
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <User className="w-5 h-5 text-purple-500" />
                Customer Profile: {selectedCustomer.customerName || selectedCustomer.name}
              </h2>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] p-4 rounded-2xl">
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Customer ID</div>
                  <div className="font-mono font-bold text-[var(--text-primary)] text-sm">{selectedCustomer.customerId || selectedCustomer.customer_id}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Phone</div>
                  <div className="font-bold text-[var(--text-primary)] text-sm">{selectedCustomer.phone}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Email</div>
                  <div className="font-semibold text-[var(--text-muted)]">{selectedCustomer.email}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Registered Vehicle</div>
                  <div className="font-bold text-purple-600 dark:text-purple-400">{selectedCustomer.vehicleModel}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] p-3 rounded-2xl">
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Total Visits</div>
                  <div className="font-bold text-[var(--text-primary)] text-base">{selectedCustomer.totalSessions || 0}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Energy Delivered</div>
                  <div className="font-bold text-amber-600 dark:text-amber-400 text-base">{selectedCustomer.totalEnergyKwh || 0} kWh</div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] uppercase">Total Revenue</div>
                  <div className="font-bold text-green-600 dark:text-green-400 text-base">₹{selectedCustomer.totalSpending || 0}</div>
                </div>
              </div>

              <div className="p-4 bg-[var(--bg-surface-raised)] rounded-2xl border border-[var(--border-subtle)]">
                <div className="font-bold text-[var(--text-primary)] mb-1">Customer Loyalty Status</div>
                <p className="text-[var(--text-muted)] text-xs">
                  Loyal EV Driver. Customer records and verified transactions stored permanently in MySQL.
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-xl text-xs font-semibold hover:bg-[var(--border-subtle)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
