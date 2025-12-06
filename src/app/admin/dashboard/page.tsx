"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import Heatmap from "@/components/analytics/Heatmap";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";

// Types
interface UTMData {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: "visit" | "intent" | "form" | "checkout" | "payment" | "pdf" | "error" | string;
  message: string;
  payload?: Record<string, unknown>;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  utm?: UTMData;
}

interface KPIs {
  totalVisits: number;
  uniqueVisitors: number;
  totalForms: number;
  totalCheckouts: number;
  totalPayments: number;
  conversionRate: number;
  revenueTotal: number;
}

interface TimeseriesPoint {
  hour: string;
  visits: number;
  forms: number;
  checkouts: number;
  payments: number;
  revenue: number;
}

interface HeatmapPoint {
  hour: number;
  visits: number;
  forms: number;
  payments: number;
  revenue: number;
}

interface MarketingSourceCampaign {
  source: string;
  campaign: string;
  visits: number;
  forms: number;
  payments: number;
  revenue: number;
  conversionRate: number;
}

interface MetricsResponse {
  kpis: KPIs;
  timeseries: {
    points: TimeseriesPoint[];
  };
  heatmap: {
    byHourOfDay: HeatmapPoint[];
  };
  marketing: {
    bySourceCampaign: MarketingSourceCampaign[];
  };
  latestLogs: LogEntry[];
}

// Constants
const PRICE_PER_PAYMENT = 4.9;

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  visit: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/40", dot: "bg-blue-500", label: "Visit" },
  intent: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/40", dot: "bg-purple-500", label: "Intent" },
  form: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40", dot: "bg-amber-500", label: "Form" },
  checkout: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/40", dot: "bg-orange-500", label: "Checkout" },
  payment: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40", dot: "bg-emerald-500", label: "Payment" },
  pdf: { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/40", dot: "bg-pink-500", label: "PDF" },
  error: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/40", dot: "bg-red-500", label: "Error" },
};

// Helper functions
function getTypeStyle(type: string) {
  return TYPE_COLORS[type] || { bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/40", dot: "bg-slate-500", label: type.toUpperCase() };
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatHour(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateToHour(date: Date): string {
  const truncated = new Date(date);
  truncated.setMinutes(0, 0, 0);
  return truncated.toISOString();
}

// Custom Tooltip for charts
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string | number }) {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
      <p className="text-slate-300 text-xs mb-2">{formatHour(String(label || ""))}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// KPI Card Component
function KPICard({
  title,
  value,
  suffix,
  icon,
  color,
  subtitle,
}: {
  title: string;
  value: number | string;
  suffix?: string;
  icon: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-sm transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-${color}/5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-white">
            {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
            {suffix && <span className="text-lg text-slate-500 ml-1">{suffix}</span>}
          </p>
          {subtitle && (
            <p className="text-slate-500 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

// Main Dashboard Component
export default function AdminDashboard() {
  const [kpis, setKpis] = useState<KPIs>({
    totalVisits: 0,
    uniqueVisitors: 0,
    totalForms: 0,
    totalCheckouts: 0,
    totalPayments: 0,
    conversionRate: 0,
    revenueTotal: 0,
  });
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
  const [marketing, setMarketing] = useState<MarketingSourceCampaign[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [resetting, setResetting] = useState(false);
  // Track unique visitors (seenSessions is used only via setSeenSessions to maintain state)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [seenSessions, setSeenSessions] = useState<Set<string>>(new Set());

  // Reset all logs
  const handleResetLogs = async () => {
    if (!confirm("⚠️ Êtes-vous sûr de vouloir supprimer tous les logs ? Cette action est irréversible.")) {
      return;
    }
    
    setResetting(true);
    try {
      const res = await fetch("/api/log/reset", { method: "DELETE" });
      if (res.ok) {
        // Reset all states
        setLogs([]);
        setKpis({
          totalVisits: 0,
          uniqueVisitors: 0,
          totalForms: 0,
          totalCheckouts: 0,
          totalPayments: 0,
          conversionRate: 0,
          revenueTotal: 0,
        });
        setTimeseries([]);
        setHeatmap([]);
        setMarketing([]);
        setSeenSessions(new Set());
        setLastUpdate(new Date());
      } else {
        alert("Erreur lors de la suppression des logs");
      }
    } catch (err) {
      console.error("Failed to reset logs:", err);
      alert("Erreur lors de la suppression des logs");
    } finally {
      setResetting(false);
    }
  };

  // Update timeseries when a new log arrives
  // Note: "intent" is NOT included in charts - only real funnel stages
  const updateTimeseriesWithLog = useCallback((log: LogEntry) => {
    // Skip intent - it's not a funnel stage
    if (log.type === "intent") return;
    
    const logHour = truncateToHour(new Date(log.timestamp));
    
    setTimeseries((prev) => {
      const updated = [...prev];
      const pointIndex = updated.findIndex((p) => p.hour === logHour);
      
      if (pointIndex !== -1) {
        const point = { ...updated[pointIndex] };
        
        if (log.type === "visit") point.visits++;
        if (log.type === "form") point.forms++;
        if (log.type === "checkout") point.checkouts++;
        if (log.type === "payment") {
          point.payments++;
          point.revenue = Math.round((point.payments * PRICE_PER_PAYMENT) * 100) / 100;
        }
        
        updated[pointIndex] = point;
      } else {
        // Add new hour point if it's a recent hour
        const newPoint: TimeseriesPoint = {
          hour: logHour,
          visits: log.type === "visit" ? 1 : 0,
          forms: log.type === "form" ? 1 : 0,
          checkouts: log.type === "checkout" ? 1 : 0,
          payments: log.type === "payment" ? 1 : 0,
          revenue: log.type === "payment" ? PRICE_PER_PAYMENT : 0,
        };
        updated.push(newPoint);
        updated.sort((a, b) => new Date(a.hour).getTime() - new Date(b.hour).getTime());
      }
      
      return updated;
    });
  }, []);

  // Update KPIs when a new log arrives
  // Note: "intent" is NOT counted in KPIs - only actual funnel stages
  const updateKpisWithLog = useCallback((log: LogEntry) => {
    // Track unique visitors
    let isNewVisitor = false;
    if (log.type === "visit" && log.sessionId) {
      setSeenSessions((prev) => {
        if (!prev.has(log.sessionId!)) {
          isNewVisitor = true;
          const next = new Set(prev);
          next.add(log.sessionId!);
          return next;
        }
        return prev;
      });
    }

    setKpis((prev) => {
      const updated = { ...prev };
      
      if (log.type === "visit") {
        updated.totalVisits++;
        // Only increment unique visitors if this is a new session
        if (isNewVisitor || !log.sessionId) {
          updated.uniqueVisitors++;
        }
      }
      // "intent" is intentionally NOT counted - it's just interest, not a form submission
      if (log.type === "form") updated.totalForms++;
      if (log.type === "checkout") updated.totalCheckouts++;
      if (log.type === "payment") {
        updated.totalPayments++;
        updated.revenueTotal = Math.round((updated.totalPayments * PRICE_PER_PAYMENT) * 100) / 100;
      }
      
      // Recalculate conversion rate based on unique visitors
      updated.conversionRate = updated.uniqueVisitors > 0
        ? Math.round((updated.totalPayments / updated.uniqueVisitors) * 10000) / 100
        : 0;
      
      return updated;
    });
  }, []);

  // Fetch initial metrics
  useEffect(() => {
    fetch("/api/metrics")
      .then((res) => res.json())
      .then((data: MetricsResponse) => {
        setKpis(data.kpis);
        setTimeseries(data.timeseries.points);
        setHeatmap(data.heatmap?.byHourOfDay || []);
        setMarketing(data.marketing?.bySourceCampaign || []);
        setLogs(data.latestLogs);
        
        // Initialize seen sessions from existing logs
        const sessions = new Set<string>();
        data.latestLogs.forEach((log: LogEntry) => {
          if (log.type === "visit" && log.sessionId) {
            sessions.add(log.sessionId);
          }
        });
        setSeenSessions(sessions);
        
        setLastUpdate(new Date());
      })
      .catch((err) => console.error("Failed to fetch metrics:", err));
  }, []);

  // Connect to SSE stream for real-time updates
  useEffect(() => {
    const eventSource = new EventSource("/api/log-stream");

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Skip system messages
        if (data.type === "heartbeat" || data.type === "connected") {
          return;
        }

        const log = data as LogEntry;
        
        // Update logs (add to beginning)
        setLogs((prev) => [log, ...prev].slice(0, 100));
        
        // Update KPIs
        updateKpisWithLog(log);
        
        // Update timeseries
        updateTimeseriesWithLog(log);
        
        // Update last update time
        setLastUpdate(new Date());
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [updateKpisWithLog, updateTimeseriesWithLog]);

  // Auto-live: Open /performance in a new tab once per session
  useEffect(() => {
    if (typeof window === "undefined") return;

    const disabled = localStorage.getItem("performanceAutoDisabled");
    const openedThisSession = sessionStorage.getItem("performanceOpened");

    if (!disabled && !openedThisSession) {
      window.open("/performance", "_blank");
      sessionStorage.setItem("performanceOpened", "true");
    }
  }, []);

  // Calculate cumulative revenue for chart
  const cumulativeRevenueData = timeseries.map((point, index) => {
    const cumulativeRevenue = timeseries
      .slice(0, index + 1)
      .reduce((sum, p) => sum + p.revenue, 0);
    return {
      ...point,
      cumulativeRevenue: Math.round(cumulativeRevenue * 100) / 100,
    };
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <span className="text-2xl">🔮</span>
                AstroMatch — Live Dashboard
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Suivi en temps réel du trafic, des conversions et des revenus
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm ${
                connected 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}>
                <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                {connected ? "En direct" : "Déconnecté"}
              </div>
              
              {/* Last Update */}
              {lastUpdate && (
                <div className="text-slate-500 text-xs hidden md:block">
                  Mis à jour: {formatTime(lastUpdate.toISOString())}
                </div>
              )}

              {/* Performance AI button */}
              <a
                href="/performance"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all text-sm flex items-center gap-2"
              >
                🧠 Performance IA
              </a>

              {/* Reset logs button */}
              <button
                onClick={handleResetLogs}
                disabled={resetting || (logs.length === 0 && kpis.totalVisits === 0)}
                className="px-4 py-2 rounded-full border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {resetting ? "⏳..." : "🗑️ Reset"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Cards */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <KPICard
            title="Visites"
            value={kpis.totalVisits}
            icon="👁️"
            color="slate"
            subtitle="Pages vues"
          />
          <KPICard
            title="Visiteurs uniques"
            value={kpis.uniqueVisitors}
            icon="👥"
            color="blue"
            subtitle="Sessions distinctes"
          />
          <KPICard
            title="Formulaires"
            value={kpis.totalForms}
            icon="📝"
            color="amber"
            subtitle="Remplis"
          />
          <KPICard
            title="Paiements"
            value={kpis.totalPayments}
            icon="💳"
            color="emerald"
            subtitle="Confirmés"
          />
          <KPICard
            title="Conversion"
            value={kpis.conversionRate}
            suffix="%"
            icon="📈"
            color="purple"
            subtitle="Uniques → Paiements"
          />
          <KPICard
            title="Revenu"
            value={kpis.revenueTotal.toFixed(2)}
            suffix="€"
            icon="💰"
            color="emerald"
            subtitle="Total"
          />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Traffic Chart */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span>📊</span> Trafic (24h)
            </h3>
            <div className="h-72">
              {timeseries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeseries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={formatHour}
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: 16 }}
                      formatter={(value) => <span className="text-slate-300 text-xs">{value}</span>}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="visits" 
                      name="Visites"
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="forms" 
                      name="Formulaires"
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="payments" 
                      name="Paiements"
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <div className="text-3xl mb-2">📭</div>
                    <p>Aucune donnée pour le moment</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <span>💰</span> Revenu cumulé (24h)
            </h3>
            <div className="h-72">
              {cumulativeRevenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeRevenueData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis 
                      dataKey="hour" 
                      tickFormatter={formatHour}
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      stroke="#64748b" 
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `${value}€`}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        return (
                          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
                            <p className="text-slate-300 text-xs mb-2">{formatHour(String(label || ""))}</p>
                            <p className="text-emerald-400 text-sm font-semibold">
                              {payload[0].value}€
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cumulativeRevenue" 
                      name="Revenu cumulé"
                      stroke="#10b981" 
                      strokeWidth={2}
                      fill="url(#revenueGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <div className="text-3xl mb-2">💸</div>
                    <p>Aucun revenu enregistré</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Heatmap & Activity Timeline Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Heatmap - Compact */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 overflow-visible">
            <h3 className="text-white/80 text-sm font-medium mb-3 flex items-center gap-2">
              <span>🕐</span> Heatmap horaires (7j)
            </h3>
            <Heatmap data={heatmap} />
          </div>

          {/* Activity Timeline - 24h */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <h3 className="text-white/80 text-sm font-medium mb-3 flex items-center gap-2">
              <span>📊</span> Activité par heure (24h)
            </h3>
            <ActivityTimeline logs={logs} />
          </div>
        </section>

        {/* Marketing / UTM Section */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-800">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span>📣</span> Top campagnes & sources
            </h3>
            <p className="text-slate-500 text-xs mt-1">Analytics marketing par UTM (30 derniers jours)</p>
          </div>
          
          {marketing.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50">
                  <tr className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    <th className="px-6 py-3 text-left">Source</th>
                    <th className="px-6 py-3 text-left">Campagne</th>
                    <th className="px-6 py-3 text-right">Visiteurs</th>
                    <th className="px-6 py-3 text-right">Formulaires</th>
                    <th className="px-6 py-3 text-right">Paiements</th>
                    <th className="px-6 py-3 text-right">CA</th>
                    <th className="px-6 py-3 text-right">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {marketing.slice(0, 10).map((row, index) => (
                    <tr 
                      key={`${row.source}-${row.campaign}-${index}`}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.source === "direct" 
                            ? "bg-slate-700 text-slate-300" 
                            : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        }`}>
                          {row.source}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs ${row.campaign === "none" ? "text-slate-500" : "text-slate-300"}`}>
                          {row.campaign === "none" ? "—" : row.campaign}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right text-slate-300 font-mono">
                        {row.visits}
                      </td>
                      <td className="px-6 py-3 text-right text-amber-400 font-mono">
                        {row.forms}
                      </td>
                      <td className="px-6 py-3 text-right text-emerald-400 font-mono">
                        {row.payments}
                      </td>
                      <td className="px-6 py-3 text-right text-emerald-400 font-mono font-semibold">
                        {row.revenue.toFixed(2)}€
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.conversionRate >= 5 
                            ? "bg-emerald-500/20 text-emerald-400" 
                            : row.conversionRate >= 1 
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-slate-700 text-slate-400"
                        }`}>
                          {row.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-slate-500">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-lg font-medium">Aucune donnée marketing</p>
              <p className="text-sm mt-2">
                Les sessions avec UTM apparaîtront ici automatiquement.
              </p>
            </div>
          )}
        </section>

        {/* Live Feed */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Live Feed
            </h3>
            <span className="text-slate-500 text-xs">
              {logs.length} événements
            </span>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-500">
                <div className="text-4xl mb-4">📭</div>
                <p>Aucun événement pour le moment.</p>
                <p className="text-sm mt-2">Les nouveaux événements apparaîtront ici en temps réel.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {logs.map((log, index) => {
                  const style = getTypeStyle(log.type);
                  const isNew = index === 0;
                  
                  return (
                    <div
                      key={log.id}
                      className={`px-6 py-3 flex items-center gap-4 hover:bg-slate-800/30 transition-colors ${
                        isNew ? "bg-emerald-500/5" : ""
                      }`}
                    >
                      {/* Type Badge */}
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text} ${style.border} border min-w-[80px] justify-center`}>
                        {style.label}
                      </span>
                      
                      {/* Timestamp */}
                      <span className="text-slate-500 text-xs font-mono min-w-[70px]">
                        {formatTime(log.timestamp)}
                      </span>
                      
                      {/* Message */}
                      <span className="text-slate-300 text-sm flex-1 truncate">
                        {log.message}
                      </span>
                      
                      {/* UTM indicator */}
                      {log.utm?.source && (
                        <span 
                          className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 hidden md:inline-block"
                          title={`Source: ${log.utm.source}${log.utm.campaign ? ` / Campagne: ${log.utm.campaign}` : ''}`}
                        >
                          {log.utm.source}{log.utm.campaign && log.utm.campaign !== 'none' ? ` / ${log.utm.campaign}` : ''}
                        </span>
                      )}

                      {/* Session ID indicator */}
                      {log.sessionId && (
                        <a 
                          href={`/admin/sessions/${log.sessionId}`}
                          className="text-slate-500 hover:text-blue-400 text-[10px] font-mono bg-slate-800/50 px-1.5 py-0.5 rounded hidden md:inline-block transition-colors" 
                          title={`Session: ${log.sessionId}`}
                        >
                          {log.sessionId.slice(0, 8)}
                        </a>
                      )}
                      
                      {/* Payload indicator */}
                      {log.payload && (
                        <span className="text-slate-500 text-xs" title={JSON.stringify(log.payload, null, 2)}>
                          📎
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Quick Links */}
        <section className="mt-8 flex flex-wrap gap-4 justify-center">
          <a
            href="/admin/logs"
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:bg-slate-700/50 hover:border-slate-600 transition-all"
          >
            📋 Voir tous les logs
          </a>
          <a
            href="/admin/logs?type=payment"
            className="px-4 py-2 rounded-lg border border-emerald-700/50 bg-emerald-800/20 text-emerald-300 text-sm hover:bg-emerald-700/30 hover:border-emerald-600/50 transition-all"
          >
            💳 Paiements
          </a>
          <a
            href="/landing"
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:bg-slate-700/50 hover:border-slate-600 transition-all"
          >
            🏠 Landing page
          </a>
          <a
            href="/"
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:bg-slate-700/50 hover:border-slate-600 transition-all"
          >
            🔮 Page principale
          </a>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-slate-500 text-xs">
          <p>AstroMatch Admin Dashboard · Données en temps réel</p>
        </div>
      </footer>
    </main>
  );
}

