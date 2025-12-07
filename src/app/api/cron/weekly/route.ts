import { NextRequest, NextResponse } from "next/server";
import { readLogs, LogEntry } from "@/lib/logger";
import { sendWeeklySummary } from "@/lib/notifyTelegram";

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
 * GET /api/cron/weekly
 * 
 * Called every Sunday at 23:59 via Vercel Cron.
 * Computes weekly stats and sends a Telegram summary.
 * 
 * Note:
 * - "intent" type is NOT counted (it's just interest shown on landing page)
 * - Forms are deduplicated per session
 * 
 * Vercel Cron schedule: "59 23 * * 0"
 */
export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron (optional security check)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[CRON/weekly] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[CRON/weekly] Computing weekly statistics...");
    
    const logs = await readLogs();
    
    // Calculate the start of the week (Monday 00:00)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    // Filter logs for this week
    const weekLogs = logs.filter((log) => {
      return new Date(log.timestamp) >= weekStart;
    });

    // Compute weekly stats
    // Note: "intent" is intentionally excluded from all metrics
    const visits = weekLogs.filter((log) => log.type === "visit").length;
    const forms = countUniqueFormsPerSession(weekLogs); // Deduplicated forms
    const payments = weekLogs.filter((log) => log.type === "payment").length;
    const revenue = payments * PRICE_PER_REPORT;

    // Calculate average conversion rate
    const conversionBase = forms > 0 ? forms : visits;
    const conversion = conversionBase > 0 
      ? (payments / conversionBase) * 100 
      : 0;

    // Find the best day (highest revenue)
    const { bestDay, bestDayRevenue } = findBestDay(weekLogs, weekStart);

    console.log(`[CRON/weekly] Stats: visits=${visits}, forms=${forms}, payments=${payments}, revenue=${revenue}€, bestDay=${bestDay}`);

    // Send Telegram summary
    await sendWeeklySummary({
      visits,
      forms,
      payments,
      revenue,
      conversion,
      bestDay,
      bestDayRevenue,
    });

    return NextResponse.json({
      success: true,
      stats: {
        visits,
        forms,
        payments,
        revenue,
        conversion: Number(conversion.toFixed(1)),
        bestDay,
        bestDayRevenue,
      },
    });
  } catch (error) {
    console.error("[CRON/weekly] Error:", error);
    
    // Return default values instead of error
    return NextResponse.json({
      success: true,
      stats: {
        visits: 0,
        forms: 0,
        payments: 0,
        revenue: 0,
        conversion: 0,
        bestDay: "Aucune donnée disponible",
        bestDayRevenue: 0,
      },
      message: "No data available or error computing stats",
    });
  }
}

/**
 * Finds the best performing day of the week by revenue.
 */
function findBestDay(
  logs: LogEntry[],
  weekStart: Date
): { bestDay: string; bestDayRevenue: number } {
  const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const revenueByDay: Record<string, number> = {};

  // Initialize all days of the week
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const dayKey = day.toISOString().split("T")[0];
    revenueByDay[dayKey] = 0;
  }

  // Count payments per day
  const paymentLogs = logs.filter((log) => log.type === "payment");
  
  for (const log of paymentLogs) {
    const dayKey = new Date(log.timestamp).toISOString().split("T")[0];
    if (revenueByDay[dayKey] !== undefined) {
      revenueByDay[dayKey] += PRICE_PER_REPORT;
    }
  }

  // Find the best day
  let bestDayKey = "";
  let bestDayRevenue = 0;

  for (const [dayKey, revenue] of Object.entries(revenueByDay)) {
    if (revenue > bestDayRevenue) {
      bestDayRevenue = revenue;
      bestDayKey = dayKey;
    }
  }

  // Format the best day
  if (bestDayKey && bestDayRevenue > 0) {
    const bestDate = new Date(bestDayKey);
    const dayName = dayNames[bestDate.getDay()];
    const dayNum = bestDate.getDate();
    const monthName = bestDate.toLocaleDateString("fr-FR", { month: "long" });
    return {
      bestDay: `${dayName} ${dayNum} ${monthName}`,
      bestDayRevenue,
    };
  }

  return {
    bestDay: "Aucun paiement cette semaine",
    bestDayRevenue: 0,
  };
}
