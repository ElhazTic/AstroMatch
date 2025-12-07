import { prisma } from "./prisma";
import { logEmitter } from "./logEmitter";
import { sendTrafficSpikeAlert } from "./notifyTelegram";
import { UTMData } from "./session";
import type { Prisma } from "@prisma/client";
type DBEvent = Prisma.EventGetPayload<true>;

// Traffic spike detection configuration
const TRAFFIC_SPIKE_INTERVAL_SECONDS = 20;
const TRAFFIC_SPIKE_THRESHOLD = 10;

// Cooldown to avoid spamming alerts (5 minutes)
let lastTrafficAlertTime = 0;
const TRAFFIC_ALERT_COOLDOWN_MS = 5 * 60 * 1000;

// IA recompute cooldown (10 minutes)
const IA_RECOMPUTE_COOLDOWN_MS = 10 * 60 * 1000;
let lastIARecomputeTime = 0;

// Types that trigger IA analysis updates
const METRIC_AFFECTING_TYPES = ["visit", "form", "checkout", "payment"];

export interface LogEntry {
  id: string;
  timestamp: string;
  type: "visit" | "form" | "intent" | "checkout" | "payment" | "pdf" | "error" | string;
  message: string;
  payload?: Record<string, unknown>;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  utm?: UTMData;
}

/**
 * Session context to be passed to appendLog
 */
export interface SessionContext {
  sessionId: string;
  userAgent: string;
  ipAddress: string;
  utm?: UTMData;
}

/**
 * Generates a unique ID for each log entry (compatible with old format)
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Mark the IA analysis as stale in the database cache
 */
async function markIAAnalysisAsStale(): Promise<void> {
  try {
    await prisma.metricsCache.upsert({
      where: { key: "ia_analysis" },
      update: {
        value: {
          isStale: true,
        },
        updatedAt: new Date(),
      },
      create: {
        key: "ia_analysis",
        value: { isStale: true },
        updatedAt: new Date(),
      },
    });
    console.log("[IA] Analysis marked as stale");
  } catch (error) {
    console.log("[IA] Could not mark analysis as stale:", error instanceof Error ? error.message : "Unknown error");
  }
}

/**
 * Trigger IA recompute if cooldown has passed.
 */
async function triggerIARecomputeIfNeeded(): Promise<void> {
  const now = Date.now();
  
  if (now - lastIARecomputeTime < IA_RECOMPUTE_COOLDOWN_MS) {
    return;
  }

  try {
    const cached = await prisma.metricsCache.findUnique({
      where: { key: "ia_analysis" },
    });
    
    const value = cached?.value as { isStale?: boolean } | null;
    
    if (value?.isStale) {
      console.log("[IA] Triggering auto recompute...");
      lastIARecomputeTime = now;
      
      const baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : process.env.NEXTAUTH_URL || "http://localhost:3000";
      
      fetch(`${baseUrl}/api/performance/recompute?auto=1`, {
        method: "POST",
      }).catch((err) => {
        console.error("[IA] Auto recompute fetch failed:", err);
      });
    }
  } catch {
    // Silently ignore
  }
}

/**
 * Checks for traffic spikes and sends alerts if threshold is exceeded.
 */
async function checkTrafficSpike(currentTimestamp: Date): Promise<void> {
  const now = currentTimestamp.getTime();
  
  if (now - lastTrafficAlertTime < TRAFFIC_ALERT_COOLDOWN_MS) {
    return;
  }

  try {
    const intervalStart = new Date(now - (TRAFFIC_SPIKE_INTERVAL_SECONDS * 1000));
    
    const recentVisits = await prisma.event.count({
      where: {
        type: "visit",
        timestamp: { gte: intervalStart },
      },
    });

    if (recentVisits >= TRAFFIC_SPIKE_THRESHOLD) {
      const fiveMinAgo = new Date(now - (5 * 60 * 1000));
      const visitsLast5min = await prisma.event.count({
        where: {
          type: "visit",
          timestamp: { gte: fiveMinAgo },
        },
      });

      console.log(`[TRAFFIC SPIKE] ${recentVisits} visitors in ${TRAFFIC_SPIKE_INTERVAL_SECONDS}s!`);
      await sendTrafficSpikeAlert(
        recentVisits,
        TRAFFIC_SPIKE_INTERVAL_SECONDS,
        visitsLast5min
      );
      
      lastTrafficAlertTime = now;
    }
  } catch (err) {
    console.error("[TRAFFIC SPIKE] Error checking traffic spike:", err);
  }
}

/**
 * Checks if a form log already exists for the given session ID.
 */
export async function hasFormForSession(sessionId: string): Promise<boolean> {
  const count = await prisma.event.count({
    where: {
      type: "form",
      sessionId: sessionId,
    },
  });
  return count > 0;
}

/**
 * Updates or creates a user session in the database
 */
async function upsertSession(sessionContext: SessionContext): Promise<void> {
  try {
    await prisma.userSession.upsert({
      where: { sessionId: sessionContext.sessionId },
      update: {
        lastSeen: new Date(),
        userAgent: sessionContext.userAgent || undefined,
        ip: sessionContext.ipAddress || undefined,
        utmSource: sessionContext.utm?.source || undefined,
        utmCampaign: sessionContext.utm?.campaign || undefined,
      },
      create: {
        sessionId: sessionContext.sessionId,
        createdAt: new Date(),
        lastSeen: new Date(),
        userAgent: sessionContext.userAgent || undefined,
        ip: sessionContext.ipAddress || undefined,
        utmSource: sessionContext.utm?.source || undefined,
        utmCampaign: sessionContext.utm?.campaign || undefined,
      },
    });
  } catch (err) {
    console.error("[SESSION] Failed to upsert session:", err);
  }
}

/**
 * Appends a new log entry to the database and notifies SSE clients.
 * Also checks for traffic spikes on "visit" events.
 */
export async function appendLog(
  event: Omit<LogEntry, "id" | "timestamp">,
  sessionContext?: SessionContext
): Promise<LogEntry> {
  const currentTimestamp = new Date();
  const logId = generateId();
  
  const logEntry: LogEntry = {
    id: logId,
    timestamp: currentTimestamp.toISOString(),
    type: event.type,
    message: event.message,
    ...(event.payload && { payload: event.payload }),
    ...(sessionContext?.sessionId && { sessionId: sessionContext.sessionId }),
    ...(sessionContext?.userAgent && { userAgent: sessionContext.userAgent }),
    ...(sessionContext?.ipAddress && { ipAddress: sessionContext.ipAddress }),
    ...(sessionContext?.utm && { utm: sessionContext.utm }),
  };

  // Enhanced logging with session info
  const sessionInfo = sessionContext?.sessionId 
    ? ` [${sessionContext.sessionId.slice(0, 8)}...]` 
    : "";
  console.log(`[LOG] ${logEntry.type}${sessionInfo}: ${logEntry.message}`);

  // Always emit event for SSE clients (immediate feedback)
  logEmitter.emit("log", logEntry);

  // Persist to database
  try {
    await prisma.event.create({
      data: {
        type: event.type,
        message: event.message,
        sessionId: sessionContext?.sessionId,
        timestamp: currentTimestamp,
        ip: sessionContext?.ipAddress,
        userAgent: sessionContext?.userAgent,
        utmSource: sessionContext?.utm?.source,
        utmMedium: sessionContext?.utm?.medium,
        utmCampaign: sessionContext?.utm?.campaign,
        utmContent: sessionContext?.utm?.content,
        utmTerm: sessionContext?.utm?.term,
        metadata: event.payload ? (event.payload as object) : undefined,
      },
    });

    // Update session if context provided
    if (sessionContext) {
      upsertSession(sessionContext).catch((err) => {
        console.error("[SESSION] Upsert failed:", err);
      });
    }
  } catch (dbError) {
    console.error("[LOG] Could not persist log to database:", dbError);
  }

  // Check for traffic spike on visit events
  if (event.type === "visit") {
    checkTrafficSpike(currentTimestamp).catch((err) => {
      console.error("[TRAFFIC SPIKE] Error checking traffic spike:", err);
    });
  }

  // Mark IA analysis as stale for metric-affecting events
  if (METRIC_AFFECTING_TYPES.includes(event.type)) {
    markIAAnalysisAsStale().then(() => {
      triggerIARecomputeIfNeeded().catch((err) => {
        console.error("[IA] Error triggering recompute:", err);
      });
    }).catch((err) => {
      console.error("[IA] Error marking analysis as stale:", err);
    });
  }
  
  return logEntry;
}

/**
 * Reads logs from the database.
 * Returns the most recent logs (up to limit).
 */
export async function readLogs(limit: number = 1000): Promise<LogEntry[]> {
  try {
    const events = await prisma.event.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return events.map((event: DBEvent) => ({
      id: event.id.toString(),
      timestamp: event.timestamp.toISOString(),
      type: event.type as LogEntry["type"],
      message: event.message || "",
      payload: event.metadata as Record<string, unknown> | undefined,
      sessionId: event.sessionId || undefined,
      userAgent: event.userAgent || undefined,
      ipAddress: event.ip || undefined,
      utm: (event.utmSource || event.utmMedium || event.utmCampaign || event.utmContent || event.utmTerm)
        ? {
            source: event.utmSource || undefined,
            medium: event.utmMedium || undefined,
            campaign: event.utmCampaign || undefined,
            content: event.utmContent || undefined,
            term: event.utmTerm || undefined,
          }
        : undefined,
    })).reverse();
    
  } catch (error) {
    console.error("[LOG] Failed to read logs from database:", error);
    return [];
  }
}

/**
 * Reads the latest N events (most recent first)
 */
export async function readLatestEvents(limit: number = 200): Promise<LogEntry[]> {
  try {
    const events = await prisma.event.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return events.map((event: DBEvent) => ({
      id: event.id.toString(),
      timestamp: event.timestamp.toISOString(),
      type: event.type as LogEntry["type"],
      message: event.message || "",
      payload: event.metadata as Record<string, unknown> | undefined,
      sessionId: event.sessionId || undefined,
      userAgent: event.userAgent || undefined,
      ipAddress: event.ip || undefined,
      utm: (event.utmSource || event.utmMedium || event.utmCampaign || event.utmContent || event.utmTerm)
        ? {
            source: event.utmSource || undefined,
            medium: event.utmMedium || undefined,
            campaign: event.utmCampaign || undefined,
            content: event.utmContent || undefined,
            term: event.utmTerm || undefined,
          }
        : undefined,
    }));
  } catch (error) {
    console.error("[LOG] Failed to read latest events from database:", error);
    return [];
  }
}

/**
 * Resets all logs by deleting all events from the database.
 */
export async function resetLogs(): Promise<void> {
  try {
    await prisma.event.deleteMany({});
    console.log("[LOG] All logs have been reset");
  } catch (error) {
    console.error("[LOG] Failed to reset logs:", error);
    throw error;
  }
}

/**
 * Helper function to log from frontend via API.
 * @deprecated Use appendLog with sessionContext instead for new implementations
 */
export async function logEvent(
  type: LogEntry["type"],
  message: string,
  payload?: Record<string, unknown>
): Promise<LogEntry> {
  return appendLog({ type, message, payload });
}
