import { useState, useEffect } from "react";
import {
  Wrench,
  Search,
  Plus,
  Edit2,
  Trash2,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Phone,
  Mail,
  Award,
  Calendar,
  X,
  ShieldCheck,
  Power,
} from "lucide-react";
import { adminService } from "../../services/adminService";
import Toast from "../../components/Toast";

export default function AdminTechnicians() {
  const [technicians, setTechnicians] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [toast, setToast] = useState({ message: "", type: "info" });

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTech, setSelectedTech] = useState(null);

  // Form States
  const [techForm, setTechForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "password123",
    specialization: "DC Ultra-Fast & High Voltage Charger Diagnostics",
    certification: "Level 3 Master EVSE High Voltage Specialist",
    assignedStationId: "",
    status: "ACTIVE",
  });

  const [assignForm, setAssignForm] = useState({
    techId: "",
    techName: "",
    stationId: "",
    taskTitle: "Inspect DC Isolation and Cooling Loop",
    description: "Perform scheduled high-voltage isolation inspection and coolant flow check.",
    priority: "HIGH",
  });

  // Load Technicians & Stations from MySQL
  const loadData = async () => {
    setLoading(true);
    try {
      const [techRes, statRes] = await Promise.all([
        adminService.getTechnicians(),
        adminService.getStations(),
      ]);

      if (techRes?.success && Array.isArray(techRes.data)) {
        setTechnicians(techRes.data);
      }
      if (statRes?.success && Array.isArray(statRes.data)) {
        setStations(statRes.data);
        if (statRes.data.length > 0 && !techForm.assignedStationId) {
          setTechForm((prev) => ({ ...prev, assignedStationId: statRes.data[0].id }));
        }
      }
    } catch (err) {
      console.warn("Failed to load technician data:", err);
      setToast({ message: "Failed to load technicians from MySQL.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Toggle Status (ACTIVE <-> INACTIVE)
  const handleToggleStatus = async (tech) => {
    const nextStatus = tech.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await adminService.updateTechnician(tech.id, { status: nextStatus });
      if (res?.success) {
        setToast({ message: `Technician ${tech.name} marked as ${nextStatus}.`, type: "success" });
        loadData();
      } else {
        setToast({ message: res?.message || "Failed to update status", type: "error" });
      }
    } catch (err) {
      setToast({ message: err.message || "Error updating status", type: "error" });
    }
  };

  // Create Technician
  const handleCreateTech = async (e) => {
    e.preventDefault();
    if (!techForm.name || !techForm.email) {
      setToast({ message: "Name and Email are required.", type: "error" });
      return;
    }

    try {
      const res = await adminService.createTechnician(techForm);
      if (res?.success) {
        setToast({ message: `Technician ${techForm.name} created successfully!`, type: "success" });
        setShowCreateModal(false);
        setTechForm({
          name: "",
          email: "",
          phone: "",
          password: "password123",
          specialization: "DC Ultra-Fast & High Voltage Charger Diagnostics",
          certification: "Level 3 Master EVSE High Voltage Specialist",
          assignedStationId: stations[0]?.id || "",
          status: "ACTIVE",
        });
        loadData();
      } else {
        setToast({ message: res?.message || "Failed to create technician.", type: "error" });
      }
    } catch (err) {
      setToast({ message: err.response?.data?.message || err.message || "Failed to create technician.", type: "error" });
    }
  };

  // Update Technician
  const handleUpdateTech = async (e) => {
    e.preventDefault();
    if (!selectedTech) return;

    try {
      const res = await adminService.updateTechnician(selectedTech.id, techForm);
      if (res?.success) {
        setToast({ message: `Technician ${techForm.name} updated successfully!`, type: "success" });
        setShowEditModal(false);
        setSelectedTech(null);
        loadData();
      } else {
        setToast({ message: res?.message || "Failed to update technician.", type: "error" });
      }
    } catch (err) {
      setToast({ message: err.response?.data?.message || err.message || "Failed to update technician.", type: "error" });
    }
  };

  // Delete Technician
  const handleDeleteTech = async () => {
    if (!selectedTech) return;

    try {
      const res = await adminService.deleteTechnician(selectedTech.id);
      if (res?.success) {
        setToast({ message: `Technician ${selectedTech.name} deactivated/deleted.`, type: "success" });
        setShowDeleteModal(false);
        setSelectedTech(null);
        loadData();
      } else {
        setToast({ message: res?.message || "Failed to delete technician.", type: "error" });
      }
    } catch (err) {
      setToast({ message: err.response?.data?.message || err.message || "Failed to delete technician.", type: "error" });
    }
  };

  // Dispatch Maintenance Work Order / Task
  const handleAssignTask = async (e) => {
    e.preventDefault();
    try {
      const res = await adminService.createMaintenance({
        stationId: assignForm.stationId || stations[0]?.id || 1,
        technicianId: assignForm.techId,
        issueType: assignForm.taskTitle,
        description: assignForm.description,
        priority: assignForm.priority,
        status: "ASSIGNED",
      });

      if (res?.success) {
        setShowAssignModal(false);
        setToast({ message: `Work order dispatched to ${assignForm.techName || "technician"}!`, type: "success" });
        loadData();
      } else {
        setToast({ message: res?.message || "Failed to dispatch work order.", type: "error" });
      }
    } catch (err) {
      setToast({ message: err.response?.data?.message || err.message || "Failed to dispatch work order.", type: "error" });
    }
  };

  // Open Edit Modal
  const openEditModal = (tech) => {
    setSelectedTech(tech);
    setTechForm({
      name: tech.name || "",
      email: tech.email || "",
      phone: tech.phone || "",
      specialization: tech.specialization || "DC Ultra-Fast & High Voltage Charger Diagnostics",
      certification: tech.certification || "Certified EVSE Technician",
      assignedStationId: tech.assignedStationId || stations[0]?.id || "",
      status: tech.status || "ACTIVE",
    });
    setShowEditModal(true);
  };

  // Open Assign Modal
  const openAssignModal = (tech) => {
    setSelectedTech(tech);
    setAssignForm({
      techId: tech.id,
      techName: tech.name,
      stationId: tech.assignedStationId || stations[0]?.id || 1,
      taskTitle: "Inspect DC Isolation and Cooling Loop",
      description: `Dispatched service request to ${tech.name} for high-voltage DC hardware diagnostics.`,
      priority: "HIGH",
    });
    setShowAssignModal(true);
  };

  // Filter Technicians
  const filtered = technicians.filter((t) => {
    if (statusFilter !== "ALL" && (t.status || "ACTIVE").toUpperCase() !== statusFilter) {
      return false;
    }
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (t.name || "").toLowerCase().includes(q) ||
      (t.counterId || t.technicianId || "").toLowerCase().includes(q) ||
      (t.email || "").toLowerCase().includes(q) ||
      (t.phone || "").toLowerCase().includes(q) ||
      (t.specialization || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 animate-fade-in">
      {toast.message && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "info" })} />
      )}

      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold border border-amber-500/20">
              DISPATCH COMMAND
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[var(--text-primary)] flex items-center gap-2.5 font-mono">
            <Wrench size={24} className="text-amber-500" />
            FIELD TECHNICIAN DISPATCH & ASSET MANAGEMENT
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Manage high-voltage certified EV technicians, dispatch maintenance work orders, and assign primary charging stations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl px-3 py-2 text-[var(--text-primary)] font-bold focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search technician..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl pl-8 pr-3 py-2 text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus size={14} /> Add Technician
          </button>
        </div>
      </div>

      {/* Grid of Technicians */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-[var(--text-muted)] flex items-center justify-center gap-2">
          <RefreshCw size={16} className="animate-spin text-amber-500" />
          Loading technicians from MySQL...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
          <Wrench size={32} className="mx-auto text-[var(--text-muted)]" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">No Technicians Found</h3>
          <p className="text-xs text-[var(--text-muted)]">No field technicians matched your search filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((tech) => (
            <div
              key={tech.id}
              className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-4 hover:border-amber-500/40 transition shadow-sm flex flex-col justify-between"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      {tech.counterId || tech.technicianId || `TECH000${tech.id}`}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                        tech.status === "ACTIVE"
                          ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-500 border border-rose-500/30"
                      }`}
                    >
                      {tech.status || "ACTIVE"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(tech)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
                      title="Edit Technician"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(tech)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer"
                      title={tech.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    >
                      <Power size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTech(tech);
                        setShowDeleteModal(true);
                      }}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Delete Technician"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="mt-3">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{tech.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                    <span className="flex items-center gap-1">
                      <Mail size={12} /> {tech.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone size={12} /> {tech.phone || "—"}
                    </span>
                  </div>
                  <p className="text-xs text-amber-500 font-medium mt-1.5 flex items-center gap-1">
                    <Award size={13} /> {tech.specialization || "DC Fast Charger Diagnostics"}
                  </p>
                </div>

                {/* Info Block */}
                <div className="p-3 bg-[var(--bg-surface-raised)] rounded-2xl space-y-1.5 text-xs text-[var(--text-muted)] mt-4">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <Building2 size={12} /> Primary Station:
                    </span>
                    <span className="font-bold text-[var(--text-primary)] truncate max-w-[200px]">
                      {tech.assignedStation || "EV Power Hub Chennai Central"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={12} /> Certification:
                    </span>
                    <span className="font-bold text-emerald-500 truncate max-w-[200px]">
                      {tech.certification || "Level 3 Master EVSE"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> Active Work Orders:
                    </span>
                    <span className="font-mono font-bold text-amber-500">{tech.activeTasks || 0} Tasks</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => openAssignModal(tech)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/10 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Wrench size={13} /> Dispatch Work Order / Task
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Technician */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                <Plus size={18} className="text-amber-500" />
                Add New Field Technician (MySQL)
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTech} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={techForm.name}
                    onChange={(e) => setTechForm({ ...techForm, name: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)]"
                    placeholder="e.g. Dave Wilson"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={techForm.email}
                    onChange={(e) => setTechForm({ ...techForm, email: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)]"
                    placeholder="tech@evcharge.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={techForm.phone}
                    onChange={(e) => setTechForm({ ...techForm, phone: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)]"
                    placeholder="+91 98401 23456"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Primary Station</label>
                  <select
                    value={techForm.assignedStationId}
                    onChange={(e) => setTechForm({ ...techForm, assignedStationId: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)]"
                  >
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.station_name || s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Specialization</label>
                <input
                  type="text"
                  value={techForm.specialization}
                  onChange={(e) => setTechForm({ ...techForm, specialization: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)]"
                  placeholder="DC Ultra-Fast & High Voltage Charger Diagnostics"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Certification & Credentials</label>
                <input
                  type="text"
                  value={techForm.certification}
                  onChange={(e) => setTechForm({ ...techForm, certification: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)]"
                  placeholder="Level 3 Master EVSE High Voltage Specialist & Siemens Certified"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] text-xs font-bold text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Register Technician
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Technician */}
      {showEditModal && selectedTech && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                <Edit2 size={18} className="text-amber-500" />
                Edit Technician ({selectedTech.counterId || selectedTech.technicianId})
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateTech} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={techForm.name}
                    onChange={(e) => setTechForm({ ...techForm, name: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={techForm.email}
                    onChange={(e) => setTechForm({ ...techForm, email: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={techForm.phone}
                    onChange={(e) => setTechForm({ ...techForm, phone: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Status</label>
                  <select
                    value={techForm.status}
                    onChange={(e) => setTechForm({ ...techForm, status: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)]"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Specialization</label>
                <input
                  type="text"
                  value={techForm.specialization}
                  onChange={(e) => setTechForm({ ...techForm, specialization: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Certification</label>
                <input
                  type="text"
                  value={techForm.certification}
                  onChange={(e) => setTechForm({ ...techForm, certification: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] text-xs font-bold text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Dispatch Work Order / Assign Task */}
      {showAssignModal && selectedTech && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 font-mono">
                <Wrench size={18} className="text-amber-500" />
                Dispatch Work Order to {assignForm.techName}
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Work Order / Task Title *</label>
                <input
                  type="text"
                  required
                  value={assignForm.taskTitle}
                  onChange={(e) => setAssignForm({ ...assignForm, taskTitle: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)]"
                  placeholder="e.g. Inspect DC Isolation and Cooling Loop"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Target Station</label>
                  <select
                    value={assignForm.stationId}
                    onChange={(e) => setAssignForm({ ...assignForm, stationId: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)]"
                  >
                    {stations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.station_name || s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Priority</label>
                  <select
                    value={assignForm.priority}
                    onChange={(e) => setAssignForm({ ...assignForm, priority: e.target.value })}
                    className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)] font-bold"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Work Order Description</label>
                <textarea
                  rows={3}
                  value={assignForm.description}
                  onChange={(e) => setAssignForm({ ...assignForm, description: e.target.value })}
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs rounded-xl p-2.5 text-[var(--text-primary)]"
                  placeholder="Provide details on the issue, diagnostic instructions, or required replacement components."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] text-xs font-bold text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Dispatch Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {showDeleteModal && selectedTech && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl animate-fade-in text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Deactivate Technician</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Are you sure you want to deactivate <span className="font-bold text-[var(--text-primary)]">{selectedTech.name}</span> ({selectedTech.counterId || selectedTech.technicianId})?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--bg-surface-raised)] text-xs font-bold text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTech}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                Confirm Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
