"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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

// Constants
const LOGS_PER_PAGE = 50;

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  visit: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/40", dot: "bg-blue-500", label: "Visit" },
  intent: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/40", dot: "bg-purple-500", label: "Intent" },
  form: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40", dot: "bg-amber-500", label: "Form" },
  checkout: { bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/40", dot: "bg-indigo-500", label: "Checkout" },
  payment: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40", dot: "bg-emerald-500", label: "Payment" },
  pdf: { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/40", dot: "bg-pink-500", label: "PDF" },
  error: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/40", dot: "bg-red-500", label: "Error" },
};

const LOG_TYPES = ["all", "visit", "intent", "form", "checkout", "payment", "pdf", "error"];

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

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Drawer Component
function Drawer({ 
  isOpen, 
  onClose, 
  log 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  log: LogEntry | null;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!log?.payload) return;
    await navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !log) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-slate-900 border-l border-slate-700 z-50 shadow-2xl animate-slide-in">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getTypeStyle(log.type).bg} ${getTypeStyle(log.type).text} border ${getTypeStyle(log.type).border}`}>
                {getTypeStyle(log.type).label}
              </span>
              <span className="text-slate-400 text-sm font-mono">
                {formatTime(log.timestamp)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Log Info */}
            <div className="space-y-4 mb-6">
              <div>
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Message</h4>
                <p className="text-slate-200">{log.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Date</h4>
                  <p className="text-slate-300 text-sm">{formatDate(log.timestamp)}</p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Heure</h4>
                  <p className="text-slate-300 text-sm font-mono">{formatTime(log.timestamp)}</p>
                </div>
              </div>

              {log.sessionId && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Session ID</h4>
                  <Link 
                    href={`/admin/sessions/${log.sessionId}`}
                    className="text-blue-400 hover:text-blue-300 text-sm font-mono transition-colors underline decoration-blue-400/30 hover:decoration-blue-300"
                  >
                    {log.sessionId}
                  </Link>
                </div>
              )}

              {log.ipAddress && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Adresse IP</h4>
                  <p className="text-slate-300 text-sm font-mono">{log.ipAddress}</p>
                </div>
              )}

              {log.userAgent && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">User Agent</h4>
                  <p className="text-slate-400 text-xs font-mono break-all">{log.userAgent}</p>
                </div>
              )}
            </div>

            {/* UTM Section */}
            {log.utm && (log.utm.source || log.utm.medium || log.utm.campaign || log.utm.content || log.utm.term) && (
              <div className="mb-6">
                <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">UTM Tracking</h4>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {log.utm.source && (
                      <div>
                        <span className="text-xs text-slate-500">Source</span>
                        <p className="text-purple-300 text-sm font-medium">{log.utm.source}</p>
                      </div>
                    )}
                    {log.utm.campaign && (
                      <div>
                        <span className="text-xs text-slate-500">Campagne</span>
                        <p className="text-purple-300 text-sm font-medium">{log.utm.campaign}</p>
                      </div>
                    )}
                    {log.utm.medium && (
                      <div>
                        <span className="text-xs text-slate-500">Medium</span>
                        <p className="text-purple-300 text-sm font-medium">{log.utm.medium}</p>
                      </div>
                    )}
                    {log.utm.content && (
                      <div>
                        <span className="text-xs text-slate-500">Content</span>
                        <p className="text-purple-300 text-sm font-medium">{log.utm.content}</p>
                      </div>
                    )}
                    {log.utm.term && (
                      <div>
                        <span className="text-xs text-slate-500">Term</span>
                        <p className="text-purple-300 text-sm font-medium">{log.utm.term}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Payload */}
            {log.payload && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Payload</h4>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
                  >
                    {copied ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-emerald-400">Copié!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-950 rounded-xl border border-slate-700 p-4 overflow-x-auto">
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Raw Log */}
            <div className="mt-6">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Log Brut</h4>
              <div className="bg-slate-950 rounded-xl border border-slate-700 p-4 overflow-x-auto">
                <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">
                  {JSON.stringify(log, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Main Component
function AdminLogsPage() {
  const searchParams = useSearchParams();
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  
  // Filters - initialize from URL params
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [utmSourceFilter, setUtmSourceFilter] = useState("");
  const [utmCampaignFilter, setUtmCampaignFilter] = useState("");
  
  // Initialize filters from URL params
  useEffect(() => {
    const type = searchParams.get("type");
    const session = searchParams.get("session");
    const search = searchParams.get("search");
    const date = searchParams.get("date");
    const utmSource = searchParams.get("utm_source");
    const utmCampaign = searchParams.get("utm_campaign");
    
    if (type && LOG_TYPES.includes(type)) {
      setTypeFilter(type);
    }
    if (session) {
      setSessionFilter(session);
    }
    if (search) {
      setSearchQuery(search);
    }
    if (date) {
      setDateFilter(date);
    }
    if (utmSource) {
      setUtmSourceFilter(utmSource);
    }
    if (utmCampaign) {
      setUtmCampaignFilter(utmCampaign);
    }
  }, [searchParams]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // Drawer
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch initial logs
  useEffect(() => {
    fetch("/api/log")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLogs(data.reverse());
        } else {
          // Handle case where data is not an array (empty or error)
          setLogs([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch logs:", err);
        setLogs([]);
        setLoading(false);
      });
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
        
        if (data.type === "heartbeat" || data.type === "connected") {
          return;
        }

        const log = data as LogEntry;
        setLogs((prev) => [log, ...prev].slice(0, 1000));
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
  }, []);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Type filter
      if (typeFilter !== "all" && log.type !== typeFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesMessage = log.message.toLowerCase().includes(query);
        const matchesType = log.type.toLowerCase().includes(query);
        const matchesPayload = log.payload ? JSON.stringify(log.payload).toLowerCase().includes(query) : false;
        if (!matchesMessage && !matchesType && !matchesPayload) {
          return false;
        }
      }

      // Date filter
      if (dateFilter) {
        const logDate = formatDateInput(new Date(log.timestamp));
        if (logDate !== dateFilter) {
          return false;
        }
      }

      // Session filter
      if (sessionFilter) {
        if (!log.sessionId?.toLowerCase().includes(sessionFilter.toLowerCase())) {
          return false;
        }
      }

      // UTM Source filter
      if (utmSourceFilter) {
        const source = log.utm?.source || "direct";
        if (!source.toLowerCase().includes(utmSourceFilter.toLowerCase())) {
          return false;
        }
      }

      // UTM Campaign filter
      if (utmCampaignFilter) {
        const campaign = log.utm?.campaign || "";
        if (!campaign.toLowerCase().includes(utmCampaignFilter.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [logs, typeFilter, searchQuery, dateFilter, sessionFilter, utmSourceFilter, utmCampaignFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / LOGS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * LOGS_PER_PAGE,
    currentPage * LOGS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, searchQuery, dateFilter, sessionFilter, utmSourceFilter, utmCampaignFilter]);

  // Open drawer
  const handleOpenDrawer = (log: LogEntry) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  // Stats
  const stats = {
    total: logs.length,
    visit: logs.filter((l) => l.type === "visit").length,
    intent: logs.filter((l) => l.type === "intent").length,
    form: logs.filter((l) => l.type === "form").length,
    checkout: logs.filter((l) => l.type === "checkout").length,
    payment: logs.filter((l) => l.type === "payment").length,
    pdf: logs.filter((l) => l.type === "pdf").length,
    error: logs.filter((l) => l.type === "error").length,
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        log={selectedLog}
      />

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <span className="text-2xl">📋</span>
                Journal des événements
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Analyse et suivi détaillé de l&apos;activité utilisateur
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

              {/* Back to Dashboard */}
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:bg-slate-700/50 hover:border-slate-600 transition-all"
              >
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Filters Bar */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all appearance-none cursor-pointer"
              >
                {LOG_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type === "all" ? "Tous les types" : `${type.charAt(0).toUpperCase() + type.slice(1)} (${stats[type as keyof typeof stats] || 0})`}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
              />
            </div>

            {/* Session Filter */}
            <div className="relative">
              <input
                type="text"
                placeholder="Session ID..."
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all font-mono text-sm"
              />
            </div>
          </div>

          {/* UTM Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* UTM Source Filter */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-purple-400 text-xs">UTM</span>
              </div>
              <input
                type="text"
                placeholder="utm_source (tiktok, google...)"
                value={utmSourceFilter}
                onChange={(e) => setUtmSourceFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-2.5 bg-slate-800/50 border border-purple-500/30 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all text-sm"
              />
            </div>

            {/* UTM Campaign Filter */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-purple-400 text-xs">📣</span>
              </div>
              <input
                type="text"
                placeholder="utm_campaign..."
                value={utmCampaignFilter}
                onChange={(e) => setUtmCampaignFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-purple-500/30 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all text-sm"
              />
            </div>
          </div>

          {/* Active Filters Summary */}
          {(searchQuery || typeFilter !== "all" || dateFilter || sessionFilter || utmSourceFilter || utmCampaignFilter) && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 text-xs">Filtres actifs:</span>
              {searchQuery && (
                <span className="px-2 py-1 bg-slate-800 rounded-lg text-xs text-slate-300 flex items-center gap-1">
                  Recherche: &quot;{searchQuery}&quot;
                  <button onClick={() => setSearchQuery("")} className="text-slate-500 hover:text-white">×</button>
                </span>
              )}
              {typeFilter !== "all" && (
                <span className="px-2 py-1 bg-slate-800 rounded-lg text-xs text-slate-300 flex items-center gap-1">
                  Type: {typeFilter}
                  <button onClick={() => setTypeFilter("all")} className="text-slate-500 hover:text-white">×</button>
                </span>
              )}
              {dateFilter && (
                <span className="px-2 py-1 bg-slate-800 rounded-lg text-xs text-slate-300 flex items-center gap-1">
                  Date: {dateFilter}
                  <button onClick={() => setDateFilter("")} className="text-slate-500 hover:text-white">×</button>
                </span>
              )}
              {sessionFilter && (
                <span className="px-2 py-1 bg-slate-800 rounded-lg text-xs text-slate-300 flex items-center gap-1">
                  Session: {sessionFilter.slice(0, 8)}...
                  <button onClick={() => setSessionFilter("")} className="text-slate-500 hover:text-white">×</button>
                </span>
              )}
              {utmSourceFilter && (
                <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg text-xs text-purple-300 flex items-center gap-1">
                  Source: {utmSourceFilter}
                  <button onClick={() => setUtmSourceFilter("")} className="text-purple-400 hover:text-white">×</button>
                </span>
              )}
              {utmCampaignFilter && (
                <span className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-lg text-xs text-purple-300 flex items-center gap-1">
                  Campagne: {utmCampaignFilter}
                  <button onClick={() => setUtmCampaignFilter("")} className="text-purple-400 hover:text-white">×</button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setDateFilter("");
                  setSessionFilter("");
                  setUtmSourceFilter("");
                  setUtmCampaignFilter("");
                }}
                className="text-xs text-red-400 hover:text-red-300 ml-2"
              >
                Effacer tout
              </button>
            </div>
          )}
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-400 text-sm">
            {filteredLogs.length} résultat{filteredLogs.length !== 1 ? "s" : ""}
            {filteredLogs.length !== logs.length && ` (sur ${logs.length} total)`}
          </p>
          {totalPages > 1 && (
            <p className="text-slate-500 text-sm">
              Page {currentPage} sur {totalPages}
            </p>
          )}
        </div>

        {/* Logs Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-800/50 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            <div className="col-span-2">Type</div>
            <div className="col-span-4">Message</div>
            <div className="col-span-2">UTM</div>
            <div className="col-span-1">Heure</div>
            <div className="col-span-2">Session</div>
            <div className="col-span-1 text-center">Détails</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-800/50">
            {loading ? (
              <div className="px-6 py-16 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full mx-auto mb-4" />
                <p className="text-slate-400">Chargement des logs...</p>
              </div>
            ) : paginatedLogs.length === 0 ? (
              <div className="px-6 py-16 text-center text-slate-500">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-lg font-medium">Aucun log trouvé</p>
                <p className="text-sm mt-2">
                  {logs.length === 0 
                    ? "Les nouveaux événements apparaîtront ici en temps réel."
                    : "Essayez de modifier vos filtres."}
                </p>
              </div>
            ) : (
              paginatedLogs.map((log, index) => {
                const style = getTypeStyle(log.type);
                const isNew = index === 0 && currentPage === 1;

                return (
                  <div
                    key={log.id}
                    className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors ${
                      isNew ? "bg-emerald-500/5" : ""
                    }`}
                  >
                    {/* Type Badge */}
                    <div className="col-span-2 flex items-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text} border ${style.border}`}>
                        {style.label}
                      </span>
                    </div>

                    {/* Message */}
                    <div className="col-span-4 flex items-center">
                      <span className="text-slate-200 text-sm truncate">
                        {log.message}
                      </span>
                    </div>

                    {/* UTM Badge */}
                    <div className="col-span-2 flex items-center">
                      {log.utm?.source ? (
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/25 truncate max-w-full"
                          title={`Source: ${log.utm.source}${log.utm.campaign ? ` / Campagne: ${log.utm.campaign}` : ''}`}
                        >
                          {log.utm.source}
                          {log.utm.campaign && log.utm.campaign !== 'none' && (
                            <span className="text-purple-400 ml-1">/ {log.utm.campaign}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[10px]">direct</span>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="col-span-1 flex flex-col justify-center">
                      <span className="text-slate-300 text-xs font-mono">
                        {formatTime(log.timestamp)}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>

                    {/* Session ID */}
                    <div className="col-span-2 flex items-center">
                      {log.sessionId ? (
                        <Link
                          href={`/admin/sessions/${log.sessionId}`}
                          className="text-blue-400 hover:text-blue-300 text-xs font-mono bg-slate-800/50 px-2 py-1 rounded-lg transition-colors truncate max-w-full"
                          title={log.sessionId}
                        >
                          {log.sessionId.slice(0, 8)}...
                        </Link>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </div>

                    {/* Expand Button */}
                    <div className="col-span-1 flex items-center justify-center">
                      <button
                        onClick={() => handleOpenDrawer(log)}
                        className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                        title="Voir les détails"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-700 flex items-center justify-between">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                ← Précédent
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                        currentPage === pageNum
                          ? "bg-blue-500 text-white"
                          : "bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Suivant →
              </button>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:bg-slate-700/50 hover:border-slate-600 transition-all"
          >
            📊 Dashboard
          </Link>
          <Link
            href="/landing"
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:bg-slate-700/50 hover:border-slate-600 transition-all"
          >
            🏠 Landing page
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:bg-slate-700/50 hover:border-slate-600 transition-all"
          >
            🔮 Page principale
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-slate-500 text-xs">
          <p>AstroMatch — Journal des événements · Données en temps réel</p>
        </div>
      </footer>

      {/* Animations */}
      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </main>
  );
}

// Loading component
function LoadingLogs() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-2 border-slate-600 border-t-blue-500 rounded-full mx-auto mb-4" />
        <p className="text-slate-400">Chargement...</p>
      </div>
    </main>
  );
}

// Export with Suspense wrapper
export default function AdminLogsPageWrapper() {
  return (
    <Suspense fallback={<LoadingLogs />}>
      <AdminLogsPage />
    </Suspense>
  );
}
