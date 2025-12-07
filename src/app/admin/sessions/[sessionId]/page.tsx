"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
const TYPE_CONFIG: Record<string, { 
  bg: string; 
  text: string; 
  border: string; 
  dot: string; 
  label: string; 
  icon: string;
  isImportant: boolean;
}> = {
  visit: { 
    bg: "bg-blue-500/20", 
    text: "text-blue-400", 
    border: "border-blue-500/40", 
    dot: "bg-blue-500", 
    label: "Visite", 
    icon: "👁️",
    isImportant: false,
  },
  intent: { 
    bg: "bg-purple-500/20", 
    text: "text-purple-400", 
    border: "border-purple-500/40", 
    dot: "bg-purple-500", 
    label: "Intention", 
    icon: "💭",
    isImportant: false,
  },
  form: { 
    bg: "bg-amber-500/20", 
    text: "text-amber-400", 
    border: "border-amber-500/40", 
    dot: "bg-amber-500", 
    label: "Formulaire", 
    icon: "📝",
    isImportant: true,
  },
  checkout: { 
    bg: "bg-indigo-500/20", 
    text: "text-indigo-400", 
    border: "border-indigo-500/40", 
    dot: "bg-indigo-500", 
    label: "Checkout", 
    icon: "🛒",
    isImportant: true,
  },
  payment: { 
    bg: "bg-emerald-500/20", 
    text: "text-emerald-400", 
    border: "border-emerald-500/40", 
    dot: "bg-emerald-500", 
    label: "Paiement", 
    icon: "💳",
    isImportant: true,
  },
  pdf: { 
    bg: "bg-pink-500/20", 
    text: "text-pink-400", 
    border: "border-pink-500/40", 
    dot: "bg-pink-500", 
    label: "PDF", 
    icon: "📄",
    isImportant: true,
  },
  error: { 
    bg: "bg-red-500/20", 
    text: "text-red-400", 
    border: "border-red-500/40", 
    dot: "bg-red-500", 
    label: "Erreur", 
    icon: "⚠️",
    isImportant: true,
  },
};

// Helper functions
function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || { 
    bg: "bg-slate-500/20", 
    text: "text-slate-400", 
    border: "border-slate-500/40", 
    dot: "bg-slate-500", 
    label: type.toUpperCase(), 
    icon: "📌",
    isImportant: false,
  };
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
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function getPayloadSummary(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload);
  if (keys.length === 0) return "";
  
  // Try to extract meaningful summary
  if (payload.personA && payload.personB) {
    return `${payload.personA} × ${payload.personB}`;
  }
  if (payload.path) {
    return String(payload.path);
  }
  if (payload.email) {
    return String(payload.email);
  }
  if (payload.amount) {
    return `${payload.amount}€`;
  }
  
  return `${keys.length} champ${keys.length > 1 ? "s" : ""}`;
}

// Timeline Event Component
function TimelineEvent({ 
  log, 
  isFirst, 
  isLast,
  isExpanded,
  onToggle,
}: { 
  log: LogEntry; 
  isFirst: boolean; 
  isLast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const config = getTypeConfig(log.type);
  const payloadSummary = log.payload ? getPayloadSummary(log.payload) : "";

  return (
    <div className="relative flex gap-4">
      {/* Timeline Line */}
      <div className="flex flex-col items-center">
        {/* Top line */}
        <div className={`w-0.5 flex-1 ${isFirst ? "bg-transparent" : "bg-slate-700"}`} />
        
        {/* Dot */}
        <div className={`relative z-10 w-10 h-10 rounded-full ${config.bg} border-2 ${config.border} flex items-center justify-center shrink-0 ${config.isImportant ? "ring-2 ring-offset-2 ring-offset-slate-950 ring-slate-700" : ""}`}>
          <span className="text-lg">{config.icon}</span>
        </div>
        
        {/* Bottom line */}
        <div className={`w-0.5 flex-1 ${isLast ? "bg-transparent" : "bg-slate-700"}`} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-8 pt-1">
        <div 
          className={`rounded-xl border ${config.border} ${config.bg} p-4 cursor-pointer transition-all hover:bg-opacity-30 ${config.isImportant ? "shadow-lg" : ""}`}
          onClick={onToggle}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}>
                  {config.label}
                </span>
                {isFirst && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/40">
                    Première visite
                  </span>
                )}
              </div>
              <p className="text-slate-200 text-sm font-medium">
                {log.message}
              </p>
              {payloadSummary && (
                <p className="text-slate-400 text-xs mt-1">
                  {payloadSummary}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-slate-300 text-sm font-mono">
                {formatTime(log.timestamp)}
              </span>
              <div className="flex items-center gap-1 mt-1">
                <svg 
                  className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? "rotate-90" : ""}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Expanded Content */}
          {isExpanded && log.payload && (
            <div className="mt-4 pt-4 border-t border-slate-700/50">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Payload</h4>
              <div className="bg-slate-950/50 rounded-lg p-3 overflow-x-auto">
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                  {JSON.stringify(log.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function SessionTimelinePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // Fetch logs for this session
  useEffect(() => {
    fetch("/api/log")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Filter logs for this session and sort by timestamp ASC
          const sessionLogs = data
            .filter((log: LogEntry) => log.sessionId === sessionId)
            .sort((a: LogEntry, b: LogEntry) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          setLogs(sessionLogs);
        } else {
          // Handle case where data is not an array
          setLogs([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch logs:", err);
        setLogs([]);
        setLoading(false);
      });
  }, [sessionId]);

  // Calculate session stats
  const sessionStats = useMemo(() => {
    if (logs.length === 0) return null;

    const firstLog = logs[0];
    const lastLog = logs[logs.length - 1];
    const duration = new Date(lastLog.timestamp).getTime() - new Date(firstLog.timestamp).getTime();

    const hasForm = logs.some((l) => l.type === "form");
    const hasPayment = logs.some((l) => l.type === "payment");
    const hasPdf = logs.some((l) => l.type === "pdf");
    const hasError = logs.some((l) => l.type === "error");

    // Get user info from first log
    const userAgent = firstLog.userAgent || "Inconnu";
    const ipAddress = firstLog.ipAddress || "Inconnue";

    // Get UTM from first log that has it (first touch attribution)
    const utm = logs.find((l) => l.utm)?.utm;

    // Determine journey status
    let status: "visitor" | "interested" | "converted" | "error" = "visitor";
    if (hasError) status = "error";
    else if (hasPdf) status = "converted";
    else if (hasPayment) status = "converted";
    else if (hasForm) status = "interested";

    return {
      firstTimestamp: firstLog.timestamp,
      lastTimestamp: lastLog.timestamp,
      duration,
      eventCount: logs.length,
      hasForm,
      hasPayment,
      hasPdf,
      hasError,
      userAgent,
      ipAddress,
      status,
      utm,
    };
  }, [logs]);

  // Toggle log expansion
  const toggleExpanded = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  // Status badge config
  const statusConfig = {
    visitor: { bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/40", label: "Visiteur" },
    interested: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/40", label: "Intéressé" },
    converted: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40", label: "Converti" },
    error: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/40", label: "Erreur" },
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <span className="text-2xl">🛤️</span>
                Parcours utilisateur
              </h1>
              <p className="text-slate-400 text-sm mt-1 font-mono">
                Session: {sessionId.slice(0, 8)}...{sessionId.slice(-4)}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Back to Logs */}
              <Link
                href="/admin/logs"
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:bg-slate-700/50 hover:border-slate-600 transition-all"
              >
                ← Logs
              </Link>
              
              {/* Back to Dashboard */}
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:bg-slate-700/50 hover:border-slate-600 transition-all"
              >
                📊 Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full mx-auto mb-4" />
            <p className="text-slate-400">Chargement du parcours...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-slate-300 text-lg font-medium">Session introuvable</p>
            <p className="text-slate-500 text-sm mt-2">
              Aucun événement trouvé pour cette session.
            </p>
            <Link
              href="/admin/logs"
              className="inline-block mt-6 px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:bg-slate-700/50 hover:border-slate-600 transition-all"
            >
              ← Retour aux logs
            </Link>
          </div>
        ) : (
          <>
            {/* UTM Origin Card */}
            {sessionStats?.utm && (sessionStats.utm.source || sessionStats.utm.campaign || sessionStats.utm.medium) && (
              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 backdrop-blur-sm p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📣</span>
                  <h3 className="text-white font-semibold">Origine du trafic</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {sessionStats.utm.source && (
                    <div>
                      <span className="text-xs text-slate-400 uppercase tracking-wide">Source</span>
                      <p className="text-purple-300 font-medium mt-0.5">{sessionStats.utm.source}</p>
                    </div>
                  )}
                  {sessionStats.utm.campaign && (
                    <div>
                      <span className="text-xs text-slate-400 uppercase tracking-wide">Campagne</span>
                      <p className="text-purple-300 font-medium mt-0.5">{sessionStats.utm.campaign}</p>
                    </div>
                  )}
                  {sessionStats.utm.medium && (
                    <div>
                      <span className="text-xs text-slate-400 uppercase tracking-wide">Medium</span>
                      <p className="text-purple-300 font-medium mt-0.5">{sessionStats.utm.medium}</p>
                    </div>
                  )}
                  {sessionStats.utm.content && (
                    <div>
                      <span className="text-xs text-slate-400 uppercase tracking-wide">Content</span>
                      <p className="text-purple-300 font-medium mt-0.5">{sessionStats.utm.content}</p>
                    </div>
                  )}
                  {sessionStats.utm.term && (
                    <div>
                      <span className="text-xs text-slate-400 uppercase tracking-wide">Term</span>
                      <p className="text-purple-300 font-medium mt-0.5">{sessionStats.utm.term}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Session Stats */}
            {sessionStats && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 mb-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Left: Status and Journey */}
                  <div className="flex items-center gap-4">
                    {/* Status Badge */}
                    <div className={`px-4 py-2 rounded-xl ${statusConfig[sessionStats.status].bg} border ${statusConfig[sessionStats.status].border}`}>
                      <span className={`text-lg font-semibold ${statusConfig[sessionStats.status].text}`}>
                        {statusConfig[sessionStats.status].label}
                      </span>
                    </div>

                    {/* Journey Indicators */}
                    <div className="flex items-center gap-2">
                      {sessionStats.hasForm && (
                        <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs border border-amber-500/40">
                          📝 Formulaire
                        </span>
                      )}
                      {sessionStats.hasPayment && (
                        <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs border border-emerald-500/40">
                          💳 Paiement
                        </span>
                      )}
                      {sessionStats.hasPdf && (
                        <span className="px-2 py-1 rounded-lg bg-pink-500/20 text-pink-400 text-xs border border-pink-500/40">
                          📄 PDF
                        </span>
                      )}
                      {sessionStats.hasError && (
                        <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs border border-red-500/40">
                          ⚠️ Erreur
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{sessionStats.eventCount}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide">Événements</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{formatDuration(sessionStats.duration)}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide">Durée</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-mono text-slate-300">{formatTime(sessionStats.firstTimestamp)}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide">Début</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-mono text-slate-300">{formatTime(sessionStats.lastTimestamp)}</div>
                      <div className="text-xs text-slate-400 uppercase tracking-wide">Fin</div>
                    </div>
                  </div>
                </div>

                {/* Session Details */}
                <div className="mt-6 pt-6 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Session ID</h4>
                    <p className="text-slate-300 text-sm font-mono break-all">{sessionId}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Date</h4>
                    <p className="text-slate-300 text-sm">{formatDate(sessionStats.firstTimestamp)}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Adresse IP</h4>
                    <p className="text-slate-300 text-sm font-mono">{sessionStats.ipAddress}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">User Agent</h4>
                    <p className="text-slate-400 text-xs font-mono break-all line-clamp-2" title={sessionStats.userAgent}>
                      {sessionStats.userAgent}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <span>📍</span>
                Timeline des événements
              </h2>

              <div className="relative">
                {logs.map((log, index) => (
                  <TimelineEvent
                    key={log.id}
                    log={log}
                    isFirst={index === 0}
                    isLast={index === logs.length - 1}
                    isExpanded={expandedLogs.has(log.id)}
                    onToggle={() => toggleExpanded(log.id)}
                  />
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <Link
                href="/admin/logs"
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:bg-slate-700/50 hover:border-slate-600 transition-all"
              >
                📋 Tous les logs
              </Link>
              <Link
                href={`/admin/logs?session=${sessionId}`}
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:bg-slate-700/50 hover:border-slate-600 transition-all"
              >
                🔍 Filtrer par session
              </Link>
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 text-slate-300 text-sm hover:bg-slate-700/50 hover:border-slate-600 transition-all"
              >
                📊 Dashboard
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-slate-500 text-xs">
          <p>AstroMatch — Parcours utilisateur</p>
        </div>
      </footer>
    </main>
  );
}

