import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Car,
  Calendar,
  DollarSign,
  Zap,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  Clock,
  BatteryCharging,
} from "lucide-react";
import { adminService } from "../../services/adminService";

export default function AdminUsers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailedCustomer, setDetailedCustomer] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Add / Edit Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "password123",
    city: "Chennai",
    address: "",
    state: "Tamil Nadu",
    pincode: "600001",
    vehicleNumber: "TN01EV0001",
    vehicleType: "Electric 4W",
    brand: "Tata Motors",
    model: "Nexon EV Max",
    batteryCapacity: 40.5,
    preferredChargingType: "CCS2",
    status: "ACTIVE",
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const loadCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminService.getCustomers({ status: statusFilter, search: searchTerm });
      if (res?.success && Array.isArray(res.data)) {
        setCustomers(res.data);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      console.error("loadCustomers error:", err);
      setError("Unable to load customers from MySQL database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCustomers();
  };

  const handleOpenView = async (customer) => {
    setSelectedCustomer(customer);
    setShowViewModal(true);
    setLoadingDetails(true);
    try {
      const res = await adminService.getCustomer(customer.id || customer.counterId);
      if (res?.success && res.customer) {
        setDetailedCustomer(res.customer);
      } else {
        setDetailedCustomer(customer);
      }
    } catch (err) {
      setDetailedCustomer(customer);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenEdit = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name || "",
      email: customer.email || "",
      mobile: customer.mobile || customer.phone || "",
      city: customer.city || "Chennai",
      address: customer.address || "",
      state: customer.state || "Tamil Nadu",
      pincode: customer.pincode || "600001",
      vehicleNumber: customer.vehicle?.number || customer.vehicle?.registrationNumber || "",
      vehicleType: customer.vehicle?.type || "Electric 4W",
      brand: customer.vehicle?.brand || "Tata Motors",
      model: customer.vehicle?.model || "Nexon EV",
      batteryCapacity: customer.vehicle?.batteryCapacity || 40.5,
      preferredChargingType: customer.vehicle?.connectorType || "CCS2",
      status: customer.status || "ACTIVE",
    });
    setShowEditModal(true);
  };

  const handleOpenDelete = (customer) => {
    setSelectedCustomer(customer);
    setShowDeleteModal(true);
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert("Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminService.createCustomer(formData);
      if (res?.success) {
        showToast(res.message || `Customer created successfully.`);
        setShowAddModal(false);
        loadCustomers();
      } else {
        alert(res?.message || "Failed to create customer");
      }
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Failed to create customer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await adminService.updateCustomer(selectedCustomer.id, formData);
      if (res?.success) {
        showToast("Customer profile updated successfully.");
        setShowEditModal(false);
        loadCustomers();
      } else {
        alert(res?.message || "Failed to update customer");
      }
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Failed to update customer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (customer) => {
    const newStatus = customer.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await adminService.updateCustomer(customer.id, { status: newStatus });
      showToast(`Customer marked as ${newStatus}`);
      loadCustomers();
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCustomer) return;
    setSubmitting(true);
    try {
      await adminService.deleteCustomer(selectedCustomer.id);
      showToast("Customer account deleted / deactivated successfully.");
      setShowDeleteModal(false);
      loadCustomers();
    } catch (err) {
      alert("Error deleting customer: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered & Paginated
  const filtered = customers.filter((c) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (c.counterId || "").toLowerCase().includes(q) ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.mobile || "").toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.vehicle?.number || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 text-[var(--text-primary)]">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-400/30 animate-bounce">
          <CheckCircle2 size={18} />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="theme-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-mono font-bold border border-blue-500/20">
              USER DIRECTORY • MYSQL
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2.5">
            <Users size={28} className="text-blue-500" /> Customer User Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Real-time MySQL customer database. Inspect Counter IDs, vehicle garage, charging history, and manage permissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setFormData({
                name: "",
                email: "",
                mobile: "",
                password: "password123",
                city: "Chennai",
                address: "",
                state: "Tamil Nadu",
                pincode: "600001",
                vehicleNumber: "TN01EV0001",
                vehicleType: "Electric 4W",
                brand: "Tata Motors",
                model: "Nexon EV Max",
                batteryCapacity: 40.5,
                preferredChargingType: "CCS2",
                status: "ACTIVE",
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Customer</span>
          </button>

          <button
            onClick={loadCustomers}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-blue-500" : ""} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search Counter ID, name, email, vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-xs rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-bold rounded-xl px-3.5 py-2.5 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Users</option>
            <option value="INACTIVE">Inactive / Suspended</option>
          </select>
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="theme-card overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw size={32} className="mx-auto animate-spin text-blue-500" />
            <p className="text-xs text-[var(--text-muted)] font-medium">Loading customers from MySQL...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center space-y-3">
            <AlertTriangle size={36} className="mx-auto text-rose-500" />
            <p className="text-sm font-bold text-rose-500">{error}</p>
            <button
              onClick={loadCustomers}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold cursor-pointer hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users size={36} className="mx-auto text-[var(--text-muted)] opacity-50" />
            <p className="text-sm font-bold text-[var(--text-primary)]">No customers found</p>
            <p className="text-xs text-[var(--text-muted)]">No customer records matching your filter were found in MySQL.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Counter ID</th>
                  <th className="py-3.5 px-4">Name & Email</th>
                  <th className="py-3.5 px-4">Mobile</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Primary Vehicle</th>
                  <th className="py-3.5 px-4">Registration Date</th>
                  <th className="py-3.5 px-4 text-center">Bookings</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-medium">
                {paginated.map((c) => (
                  <tr key={c.counterId || c.id} className="hover:bg-[var(--bg-surface-raised)] transition">
                    <td className="py-4 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {c.counterId || `CUS${String(c.id).padStart(6, "0")}`}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-[var(--text-primary)] block text-sm">{c.name}</span>
                      <span className="text-[var(--text-muted)] text-[11px] flex items-center gap-1">
                        <Mail size={11} /> {c.email}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <Phone size={11} className="text-[var(--text-muted)]" /> {c.mobile || c.phone || "—"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-[var(--text-muted)]" /> {c.city || "Chennai"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {c.vehicle ? (
                        <div>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                            {c.vehicle.number || c.vehicle.registrationNumber}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {c.vehicle.brand} {c.vehicle.model}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)] italic">No vehicle</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-[var(--text-muted)] font-mono text-[11px]">
                      {c.registrationDate ? new Date(c.registrationDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-bold">
                        {c.bookingCount || 0}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(c)}
                        title="Click to toggle status"
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                          c.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {c.status || "ACTIVE"}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenView(c)}
                          title="View Details"
                          className="p-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-blue-500 transition cursor-pointer"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          title="Edit Customer"
                          className="p-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-emerald-500 transition cursor-pointer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(c)}
                          title="Delete / Deactivate Customer"
                          className="p-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-rose-500 transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filtered.length > itemsPerPage && (
          <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} customers
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-[var(--border-subtle)] disabled:opacity-40 cursor-pointer hover:bg-[var(--bg-surface-raised)]"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-bold px-2">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-[var(--border-subtle)] disabled:opacity-40 cursor-pointer hover:bg-[var(--bg-surface-raised)]"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* 1. ADD CUSTOMER MODAL                                */}
      {/* ==================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="theme-card max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h2 className="text-base font-extrabold flex items-center gap-2 text-[var(--text-primary)]">
                <Plus size={18} className="text-blue-500" /> Create New Customer
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
                    placeholder="e.g. Test Customer"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
                    placeholder="testcustomer@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
                    placeholder="9876543210"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)] focus:border-blue-500 focus:outline-none"
                    placeholder="Chennai"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-3">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block">Primary EV Vehicle Details</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">Vehicle Reg Number</label>
                    <input
                      type="text"
                      value={formData.vehicleNumber}
                      onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-[var(--text-primary)]"
                      placeholder="TN00TEST01"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">Vehicle Brand / Model</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)]"
                      placeholder="Tata Nexon EV Max"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-surface-raised)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/25 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving to MySQL..." : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. EDIT CUSTOMER MODAL                               */}
      {/* ==================================================== */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="theme-card max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <h2 className="text-base font-extrabold flex items-center gap-2 text-[var(--text-primary)]">
                <Edit2 size={18} className="text-emerald-500" /> Edit Customer Profile
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Mobile</label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-medium text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Account Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-primary)]"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-surface-raised)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. VIEW CUSTOMER DETAILS MODAL                       */}
      {/* ==================================================== */}
      {showViewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="theme-card max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h2 className="text-base font-extrabold flex items-center gap-2 text-[var(--text-primary)]">
                  <ShieldCheck size={18} className="text-blue-500" /> Customer Profile & History
                </h2>
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold">
                  {detailedCustomer?.counterId || selectedCustomer?.counterId}
                </span>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {loadingDetails ? (
              <div className="py-12 text-center space-y-2">
                <RefreshCw size={24} className="mx-auto animate-spin text-blue-500" />
                <p className="text-xs text-[var(--text-muted)]">Loading full history from MySQL...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Profile Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                    <span className="text-[11px] text-[var(--text-muted)] block">Full Name</span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">{detailedCustomer?.name}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                    <span className="text-[11px] text-[var(--text-muted)] block">Email</span>
                    <span className="text-xs font-bold text-[var(--text-primary)] truncate block">{detailedCustomer?.email}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                    <span className="text-[11px] text-[var(--text-muted)] block">Total Spent</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      ₹{(detailedCustomer?.totalSpent || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
                    <span className="text-[11px] text-[var(--text-muted)] block">Account Status</span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{detailedCustomer?.status || "ACTIVE"}</span>
                  </div>
                </div>

                {/* Vehicles Section */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Car size={15} className="text-blue-500" /> Registered EV Vehicles
                  </span>
                  <div className="space-y-2">
                    {detailedCustomer?.vehicles && detailedCustomer.vehicles.length > 0 ? (
                      detailedCustomer.vehicles.map((v, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 block">
                              {v.registration_number || v.vehicleNumber}
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {v.brand} {v.model} ({v.battery_capacity || 40.5} kWh)
                            </span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-mono font-bold">
                            {v.connector_type || "CCS2"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] italic">No vehicles registered yet.</p>
                    )}
                  </div>
                </div>

                {/* Recent Bookings Section */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Clock size={15} className="text-amber-500" /> Recent Bookings History
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {detailedCustomer?.bookings && detailedCustomer.bookings.length > 0 ? (
                      detailedCustomer.bookings.map((b, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block">{b.bookingId}</span>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {b.stationName} • {b.bookingDate} ({b.startTime?.slice(0, 5)})
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">₹{b.amount}</span>
                            <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">{b.bookingStatus}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] italic">No bookings recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. DELETE CONFIRMATION MODAL                         */}
      {/* ==================================================== */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="theme-card max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center border border-rose-500/20">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-extrabold text-[var(--text-primary)]">Deactivate Customer Account?</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Are you sure you want to deactivate <span className="font-bold text-[var(--text-primary)]">{selectedCustomer?.name}</span> ({selectedCustomer?.counterId})? The customer won't be able to log in, but historical billing records will be safely preserved.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--bg-surface-raised)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/25 cursor-pointer"
              >
                {submitting ? "Deactivating..." : "Yes, Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
