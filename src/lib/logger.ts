import { promises as fs } from "fs";
import path from "path";
import { logEmitter } from "./logEmitter";
import { sendTrafficSpikeAlert } from "./notifyTelegram";
import { UTMData } from "./session";
import { markAnalysisAsStale, loadIAAnalysis } from "./iaAnalysis";

const LOGS_FILE_PATH = path.join(process.cwd(), "data", "logs.json");

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
  // Session tracking fields
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  // UTM tracking fields
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
 * Ensures the data directory and logs.json file exist.
 */
async function ensureLogsFile(): Promise<void> {
  const dataDir = path.dirname(LOGS_FILE_PATH);
  
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }

  try {
    await fs.access(LOGS_FILE_PATH);
  } catch {
    await fs.writeFile(LOGS_FILE_PATH, JSON.stringify([], null, 2), "utf-8");
  }
}

/**
 * Generates a unique ID for each log entry.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Mark the IA analysis as stale and log the action.
 * Called when metric-affecting events are logged.
 */
async function markIAAnalysisAsStale(): Promise<void> {
  try {
    await markAnalysisAsStale();
    console.log("[IA] Analysis marked as stale");
  } catch (error) {
    console.log("[IA] Could not mark analysis as stale:", error instanceof Error ? error.message : "Unknown error");
  }
}

/**
 * Trigger IA recompute if cooldown has passed.
 * This is called automatically when metrics change.
 */
async function triggerIARecomputeIfNeeded(): Promise<void> {
  const now = Date.now();
  
  // Check cooldown
  if (now - lastIARecomputeTime < IA_RECOMPUTE_COOLDOWN_MS) {
    return;
  }

  try {
    // Read current analysis to check if it's stale
    const analysis = await loadIAAnalysis();
    
    if (analysis?.isStale) {
      // Trigger auto recompute via internal fetch
      console.log("[IA] Triggering auto recompute...");
      lastIARecomputeTime = now;
      
      // Use dynamic import to avoid circular dependencies
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
    // Silently ignore - file might not exist
  }
}

/**
 * Checks for traffic spikes and sends alerts if threshold is exceeded.
 */
async function checkTrafficSpike(logs: LogEntry[], currentTimestamp: Date): Promise<void> {
  const now = currentTimestamp.getTime();
  
  // Check cooldown
  if (now - lastTrafficAlertTime < TRAFFIC_ALERT_COOLDOWN_MS) {
    return;
  }

  // Count visits in the last X seconds
  const intervalStart = now - (TRAFFIC_SPIKE_INTERVAL_SECONDS * 1000);
  const recentVisits = logs.filter((log) => {
    if (log.type !== "visit") return false;
    const logTime = new Date(log.timestamp).getTime();
    return logTime >= intervalStart;
  });

  if (recentVisits.length >= TRAFFIC_SPIKE_THRESHOLD) {
    // Count visitors in last 5 minutes for additional context
    const fiveMinAgo = now - (5 * 60 * 1000);
    const visitsLast5min = logs.filter((log) => {
      if (log.type !== "visit") return false;
      const logTime = new Date(log.timestamp).getTime();
      return logTime >= fiveMinAgo;
    }).length;

    // Send alert
    console.log(`[TRAFFIC SPIKE] ${recentVisits.length} visitors in ${TRAFFIC_SPIKE_INTERVAL_SECONDS}s!`);
    await sendTrafficSpikeAlert(
      recentVisits.length,
      TRAFFIC_SPIKE_INTERVAL_SECONDS,
      visitsLast5min
    );
    
    lastTrafficAlertTime = now;
  }
}

/**
 * Checks if a form log already exists for the given session ID.
 * Used to prevent duplicate form submissions.
 * 
 * @param sessionId - The session ID to check
 * @returns True if a form already exists for this session
 */
export async function hasFormForSession(sessionId: string): Promise<boolean> {
  const logs = await readLogs();
  return logs.some((log) => log.type === "form" && log.sessionId === sessionId);
}

/**
 * Appends a new log entry to the logs file and notifies SSE clients.
 * Also checks for traffic spikes on "visit" events.
 * 
 * @param event - The log event data
 * @param sessionContext - Optional session context (sessionId, userAgent, ipAddress, utm)
 */
export async function appendLog(
  event: Omit<LogEntry, "id" | "timestamp">,
  sessionContext?: SessionContext
): Promise<LogEntry> {
  await ensureLogsFile();

  const currentTimestamp = new Date();
  const logEntry: LogEntry = {
    id: generateId(),
    timestamp: currentTimestamp.toISOString(),
    type: event.type,
    message: event.message,
    ...(event.payload && { payload: event.payload }),
    // Include session context if provided
    ...(sessionContext?.sessionId && { sessionId: sessionContext.sessionId }),
    ...(sessionContext?.userAgent && { userAgent: sessionContext.userAgent }),
    ...(sessionContext?.ipAddress && { ipAddress: sessionContext.ipAddress }),
    // Include UTM data if provided
    ...(sessionContext?.utm && { utm: sessionContext.utm }),
  };

  try {
    const data = await fs.readFile(LOGS_FILE_PATH, "utf-8");
    const logs: LogEntry[] = JSON.parse(data);
    
    logs.push(logEntry);
    
    // Keep only last 1000 logs to prevent file from growing too large
    const trimmedLogs = logs.slice(-1000);
    
    await fs.writeFile(LOGS_FILE_PATH, JSON.stringify(trimmedLogs, null, 2), "utf-8");
    
    // Emit event for SSE clients
    logEmitter.emit("log", logEntry);
    
    // Enhanced logging with session info
    const sessionInfo = sessionContext?.sessionId 
      ? ` [${sessionContext.sessionId.slice(0, 8)}...]` 
      : "";
    console.log(`[LOG] ${logEntry.type}${sessionInfo}: ${logEntry.message}`);

    // Check for traffic spike on visit events
    if (event.type === "visit") {
      // Run asynchronously to not block the response
      checkTrafficSpike(trimmedLogs, currentTimestamp).catch((err) => {
        console.error("[TRAFFIC SPIKE] Error checking traffic spike:", err);
      });
    }

    // Mark IA analysis as stale for metric-affecting events
    if (METRIC_AFFECTING_TYPES.includes(event.type)) {
      // Run asynchronously to not block the response
      markIAAnalysisAsStale().then(() => {
        // Check if we should trigger auto recompute
        triggerIARecomputeIfNeeded().catch((err) => {
          console.error("[IA] Error triggering recompute:", err);
        });
      }).catch((err) => {
        console.error("[IA] Error marking analysis as stale:", err);
      });
    }
    
    return logEntry;
  } catch (error) {
    console.error("Failed to append log:", error);
    throw error;
  }
}

/**
 * Reads all logs from the logs file.
 * Returns empty array if file doesn't exist or is malformed.
 */
export async function readLogs(): Promise<LogEntry[]> {
  try {
    // Try to ensure the file exists first
    await ensureLogsFile();
  } catch {
    // If we can't create the file (e.g., read-only filesystem on Vercel),
    // just try to read it anyway
    console.log("[LOG] Could not ensure logs file exists, attempting read anyway");
  }

  let raw = "";
  try {
    raw = await fs.readFile(LOGS_FILE_PATH, "utf-8");
  } catch {
    // File doesn't exist or can't be read
    console.log("[LOG] Logs file not found or unreadable, returning empty array");
    return [];
  }

  // Handle empty file
  if (!raw || raw.trim() === "") {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    // Ensure we return an array
    if (!Array.isArray(parsed)) {
      console.warn("[LOG] Logs file did not contain an array, returning empty array");
      return [];
    }
    return parsed;
  } catch (parseError) {
    console.error("[LOG] Failed to parse logs JSON:", parseError);
    return [];
  }
}

/**
 * Helper function to log from frontend via API.
 * Call this in server-side code or use the /api/log endpoint from client.
 * 
 * @deprecated Use appendLog with sessionContext instead for new implementations
 */
export async function logEvent(
  type: LogEntry["type"],
  message: string,
  payload?: Record<string, unknown>
): Promise<LogEntry> {
  return appendLog({ type, message, payload });
}
