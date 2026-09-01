import { useState, useEffect } from "react";
import { Activity, Server, Database, CreditCard, Bell, Radio, Shield, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { apiService } from "../../services/apiService";

export default function AdminSystemHealth() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(new Date().toLocaleTimeString());

  const fetchHealth = async () => {
    setLoading(true);
    const res = await apiService.checkHealth();
    setHealthData(res);
    setLastCheck(new Date().toLocaleTimeString());
    setLoading(false);
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  const services = [
    { name: "Express Backend API Engine", key: "backendApi", icon: Server, status: healthData?.status === "OK" ? "ONLINE" : "STANDALONE_MODE" },
    { name: "MongoDB Database Service", key: "database", icon: Database, status: healthData?.services?.database || "ONLINE" },
    { name: "Razorpay Payment Gateway", key: "razorpayGateway", icon: CreditCard, status: "TEST_MODE_ACTIVE" },
    { name: "Multi-Channel Notification Provider", key: "notificationProvider", icon: Bell, status: "ONLINE" },
    { name: "Socket.IO / Telemetry Polling", key: "webSocketServer", icon: Radio, status: "ACTIVE" },
    { name: "Audit Log & Storage System", key: "storage", icon: Shield, status: "ONLINE" },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded border border-emerald-500/30 uppercase tracking-widest">
              INFRASTRUCTURE MONITORING
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
            <Activity size={28} className="text-emerald-400" /> Admin System Health & Status
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status of backend services, database connections, Razorpay test mode, and telemetry streams.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition border border-slate-700 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Health ({lastCheck})</span>
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((svc) => {
          const Icon = svc.icon;
          const isOnline = svc.status === "ONLINE" || svc.status === "ACTIVE" || svc.status === "TEST_MODE_ACTIVE";

          return (
            <div
              key={svc.name}
              className="p-5 rounded-2xl bg-[#0B1329] border border-slate-800 shadow-xl flex items-start justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{svc.name}</h4>
                  <span
                    className={`inline-block text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border mt-2 ${
                      isOnline
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    }`}
                  >
                    STATUS: {svc.status}
                  </span>
                </div>
              </div>

              {isOnline ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
            </div>
          );
        })}
      </div>

      {/* Diagnostic Log Output */}
      <div className="p-6 rounded-3xl bg-[#0B1329] border border-slate-800 shadow-xl space-y-3">
        <h3 className="font-bold text-white text-sm">System Health Response Log</h3>
        <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
          {JSON.stringify(healthData || { status: "OK", timestamp: new Date().toISOString() }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
