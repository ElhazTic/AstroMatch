import { NextRequest, NextResponse } from "next/server";
import { readLogs, LogEntry } from "@/lib/logger";
import { sendDailySummary, getTodayMidnight } from "@/lib/notifyTelegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRICE_PER_REPORT = 4.90;

/**
 * Counts unique forms per session for accurate stats.
 * Only counts one form per sessionId.
 */
function countUniqueFormsPerSession(logs: LogEntry[]): number {
  const sessionWithForm = new Set<string>();
  
  for (const log of logs) {
    if (log.type === "form" && log.sessionId) {
      sessionWithForm.add(log.sessionId);
    }
  }
  
  // Also count forms without sessionId (legacy logs)
  const formsWithoutSession = logs.filter(
    (log) => log.type === "form" && !log.sessionId
  ).length;
  
  return sessionWithForm.size + formsWithoutSession;
}

/**
 * GET /api/cron/daily
 * 
 * Called every day at 23:59 via Vercel Cron.
 * Computes daily stats and sends a Telegram summary.
 * 
 * Note:
 * - "intent" type is NOT counted (it's just interest shown on landing page)
 * - Forms are deduplicated per session
 * 
 * Vercel Cron schedule: "59 23 * * *"
 */
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron (optional security check)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[CRON/daily] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[CRON/daily] Computing daily statistics...");
    
    const logs = await readLogs();
    const todayMidnight = getTodayMidnight();

    // Filter logs for today
    const todayLogs = logs.filter((log) => {
      return new Date(log.timestamp) >= todayMidnight;
    });

    // Compute stats
    // Note: "intent" is intentionally excluded from all metrics
    const visits = todayLogs.filter((log) => log.type === "visit").length;
    const forms = countUniqueFormsPerSession(todayLogs); // Deduplicated forms
    const payments = todayLogs.filter((log) => log.type === "payment").length;
    const revenue = payments * PRICE_PER_REPORT;

    // Calculate conversion rate (forms that converted to payments)
    // If no forms, use visits as the denominator
    const conversionBase = forms > 0 ? forms : visits;
    const conversion = conversionBase > 0 
      ? (payments / conversionBase) * 100 
      : 0;

    console.log(`[CRON/daily] Stats: visits=${visits}, forms=${forms}, payments=${payments}, revenue=${revenue}€`);

    // Send Telegram summary
    await sendDailySummary({
      visits,
      forms,
      payments,
      revenue,
      conversion,
    });

    return NextResponse.json({
      success: true,
      stats: {
        visits,
        forms,
        payments,
        revenue,
        conversion: Number(conversion.toFixed(1)),
      },
    });
  } catch (error) {
    console.error("[CRON/daily] Error:", error);
    
    // Return default values instead of error
    return NextResponse.json({
      success: true,
      stats: {
        visits: 0,
        forms: 0,
        payments: 0,
        revenue: 0,
        conversion: 0,
      },
      message: "No data available or error computing stats",
    });
  }
}
