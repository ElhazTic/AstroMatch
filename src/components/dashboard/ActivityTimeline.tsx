"use client";

import { useMemo } from "react";

interface UTMData {
  source?: string;
  medium?: string;
  campaign?: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: "visit" | "intent" | "form" | "checkout" | "payment" | "pdf" | "error" | string;
  message: string;
  payload?: Record<string, unknown>;
  sessionId?: string;
  utm?: UTMData;
}

interface ActivityTimelineProps {
  logs: LogEntry[];
}

interface HourlyActivity {
  hour: number;
  displayHour: string;
  visits: number;
  forms: number;
  payments: number;
  checkouts: number;
  dominantSource: string | null;
  sourceCounts: Record<string, number>;
  hasActivity: boolean;
}

/**
 * ActivityTimeline - Displays activity grouped by hour over the last 24h
 */
export default function ActivityTimeline({ logs }: ActivityTimelineProps) {
  // Process logs into hourly buckets for the last 24 hours
  const hourlyData = useMemo(() => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Filter logs from the last 24 hours
    const recentLogs = logs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= twentyFourHoursAgo && logDate <= now;
    });

    // Create hour buckets (last 24 hours in order)
    const hourBuckets: Map<string, HourlyActivity> = new Map();
    
    // Initialize 24 hour buckets
    for (let i = 23; i >= 0; i--) {
      const bucketDate = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourKey = bucketDate.toLocaleString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }).replace(":", "h").slice(0, 3) + "h";
      
      const fullHour = bucketDate.getHours();
      const dateKey = `${bucketDate.toDateString()}-${fullHour}`;
      
      hourBuckets.set(dateKey, {
        hour: fullHour,
        displayHour: hourKey,
        visits: 0,
        forms: 0,
        payments: 0,
        checkouts: 0,
        dominantSource: null,
        sourceCounts: {},
        hasActivity: false,
      });
    }

    // Populate buckets with log data
    recentLogs.forEach((log) => {
      const logDate = new Date(log.timestamp);
      const fullHour = logDate.getHours();
      const dateKey = `${logDate.toDateString()}-${fullHour}`;
      
      const bucket = hourBuckets.get(dateKey);
      if (!bucket) return;

      bucket.hasActivity = true;

      // Count by type
      if (log.type === "visit") bucket.visits++;
      if (log.type === "form") bucket.forms++;
      if (log.type === "checkout") bucket.checkouts++;
      if (log.type === "payment") bucket.payments++;

      // Track UTM sources
      if (log.utm?.source && log.utm.source !== "direct") {
        const source = log.utm.source;
        bucket.sourceCounts[source] = (bucket.sourceCounts[source] || 0) + 1;
      }
    });

    // Calculate dominant source for each bucket
    hourBuckets.forEach((bucket) => {
      const sources = Object.entries(bucket.sourceCounts);
      if (sources.length > 0) {
        const [dominantSource] = sources.sort((a, b) => b[1] - a[1])[0];
        bucket.dominantSource = dominantSource;
      }
    });

    return Array.from(hourBuckets.values());
  }, [logs]);

  // Check if there's any activity at all
  const hasAnyActivity = hourlyData.some((h) => h.hasActivity);

  if (!hasAnyActivity) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-slate-500">
        <div className="text-2xl mb-2">📭</div>
        <p className="text-sm">Aucune activité ces dernières 24h</p>
      </div>
    );
  }

  // Filter to only hours with activity for display
  const activeHours = hourlyData.filter((h) => h.hasActivity);

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
      {activeHours.map((hourData, index) => (
        <div
          key={`${hourData.displayHour}-${index}`}
          className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
        >
          {/* Hour */}
          <span className="text-xs font-mono text-slate-400 w-10 flex-shrink-0">
            {hourData.displayHour}
          </span>

          {/* Activity indicators */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Visits */}
            {hourData.visits > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-blue-400">{hourData.visits}</span>
                <span className="text-slate-500 hidden sm:inline">visite{hourData.visits > 1 ? "s" : ""}</span>
              </span>
            )}

            {/* Forms */}
            {hourData.forms > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-amber-400">{hourData.forms}</span>
                <span className="text-slate-500 hidden sm:inline">form{hourData.forms > 1 ? "s" : ""}</span>
              </span>
            )}

            {/* Checkouts */}
            {hourData.checkouts > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span className="text-orange-400">{hourData.checkouts}</span>
                <span className="text-slate-500 hidden sm:inline">checkout{hourData.checkouts > 1 ? "s" : ""}</span>
              </span>
            )}

            {/* Payments */}
            {hourData.payments > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-emerald-400">{hourData.payments}</span>
                <span className="text-slate-500 hidden sm:inline">paiement{hourData.payments > 1 ? "s" : ""}</span>
              </span>
            )}
          </div>

          {/* UTM Source badge */}
          {hourData.dominantSource && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/25 flex-shrink-0 truncate max-w-20">
              {hourData.dominantSource}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}



