import { NextResponse } from "next/server";
import { readLogs, LogEntry } from "@/lib/logger";

export const dynamic = "force-dynamic";

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
  hour: number; // 0-23
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

/**
 * Truncates a date to the start of its hour.
 */
function truncateToHour(date: Date): string {
  const truncated = new Date(date);
  truncated.setMinutes(0, 0, 0);
  return truncated.toISOString();
}

/**
 * Generates an array of hour strings for the last N hours.
 */
function generateHourSlots(hours: number): string[] {
  const slots: string[] = [];
  const now = new Date();
  
  for (let i = hours - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 60 * 60 * 1000);
    slots.push(truncateToHour(date));
  }
  
  return slots;
}

/**
 * Counts unique forms per session to ensure accurate KPIs.
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
 * Counts unique visitors based on distinct sessionIds among visit logs.
 */
function countUniqueVisitors(logs: LogEntry[]): number {
  const uniqueSessions = new Set<string>();
  
  for (const log of logs) {
    if (log.type === "visit" && log.sessionId) {
      uniqueSessions.add(log.sessionId);
    }
  }
  
  // Also count visits without sessionId (legacy logs)
  const visitsWithoutSession = logs.filter(
    (log) => log.type === "visit" && !log.sessionId
  ).length;
  
  return uniqueSessions.size + visitsWithoutSession;
}

/**
 * GET /api/metrics
 * Returns computed KPIs, timeseries data, and latest logs.
 * 
 * Important:
 * - "intent" type is NOT counted in KPIs (it's just interest, not a conversion)
 * - Only "form" type counts for form submissions
 * - Forms are deduplicated per session
 */
export async function GET() {
  try {
    const logs = await readLogs();
    
    // Compute global KPIs
    // Note: "intent" is intentionally excluded from all metrics
    const totalVisits = logs.filter((log) => log.type === "visit").length;
    const uniqueVisitors = countUniqueVisitors(logs);
    const totalForms = countUniqueFormsPerSession(logs); // Deduplicated forms
    const totalCheckouts = logs.filter((log) => log.type === "checkout").length;
    const totalPayments = logs.filter((log) => log.type === "payment").length;
    
    // Conversion rate based on unique visitors for more accurate metrics
    const conversionRate = uniqueVisitors > 0 
      ? Math.round((totalPayments / uniqueVisitors) * 10000) / 100 
      : 0;
    
    const revenueTotal = Math.round(totalPayments * 4.9 * 100) / 100;

    const kpis: KPIs = {
      totalVisits,
      uniqueVisitors,
      totalForms,
      totalCheckouts,
      totalPayments,
      conversionRate,
      revenueTotal,
    };

    // Compute time-based metrics (last 24 hours)
    const hourSlots = generateHourSlots(24);
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Filter logs from last 24 hours
    const recentLogs = logs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= twentyFourHoursAgo;
    });

    // Group by hour - track unique form sessions per hour for accurate counts
    const hourlyData: Record<string, { 
      visits: number; 
      forms: number; 
      checkouts: number; 
      payments: number;
      formSessions: Set<string>;
    }> = {};
    
    for (const slot of hourSlots) {
      hourlyData[slot] = { 
        visits: 0, 
        forms: 0, 
        checkouts: 0, 
        payments: 0,
        formSessions: new Set()
      };
    }

    for (const log of recentLogs) {
      const logHour = truncateToHour(new Date(log.timestamp));
      
      if (hourlyData[logHour]) {
        // Count visits
        if (log.type === "visit") {
          hourlyData[logHour].visits++;
        }
        
        // Count forms (deduplicated per session within each hour)
        if (log.type === "form") {
          if (log.sessionId) {
            hourlyData[logHour].formSessions.add(log.sessionId);
          } else {
            // Legacy form without session - count it
            hourlyData[logHour].forms++;
          }
        }
        
        // Count checkouts
        if (log.type === "checkout") {
          hourlyData[logHour].checkouts++;
        }
        
        // Count payments
        if (log.type === "payment") {
          hourlyData[logHour].payments++;
        }
        
        // Note: "intent" is NOT counted in timeseries (not a funnel stage)
      }
    }

    // Build timeseries points
    const points: TimeseriesPoint[] = hourSlots.map((hour) => ({
      hour,
      visits: hourlyData[hour].visits,
      // Forms = unique sessions + legacy forms without session
      forms: hourlyData[hour].formSessions.size + hourlyData[hour].forms,
      checkouts: hourlyData[hour].checkouts,
      payments: hourlyData[hour].payments,
      revenue: Math.round(hourlyData[hour].payments * 4.9 * 100) / 100,
    }));

    // ============================================
    // HEATMAP: Aggregate by HOUR OF DAY (0-23)
    // This is DIFFERENT from timeseries which shows specific timestamps.
    // Heatmap shows: "How many visits happened at 14h across ALL 7 days?"
    // ============================================
    
    // Step 1: Initialize buckets for each hour of day (0-23)
    // Each bucket will accumulate data from ALL logs that happened at that hour
    const heatmapBuckets: Array<{
      visits: number;
      forms: number;
      payments: number;
      formSessions: Set<string>;
    }> = [];
    
    for (let h = 0; h < 24; h++) {
      heatmapBuckets[h] = { 
        visits: 0, 
        forms: 0, 
        payments: 0, 
        formSessions: new Set() 
      };
    }

    // Step 2: Filter logs from last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const heatmapLogs = logs.filter((log) => new Date(log.timestamp) >= sevenDaysAgo);

    // Step 3: Aggregate each log into its hour-of-day bucket
    for (const log of heatmapLogs) {
      const logDate = new Date(log.timestamp);
      // Extract ONLY the hour (0-23), ignoring the date
      const hourOfDay = logDate.getHours();

      if (log.type === "visit") {
        heatmapBuckets[hourOfDay].visits++;
      }
      if (log.type === "form") {
        if (log.sessionId) {
          heatmapBuckets[hourOfDay].formSessions.add(log.sessionId);
        } else {
          heatmapBuckets[hourOfDay].forms++;
        }
      }
      if (log.type === "payment") {
        heatmapBuckets[hourOfDay].payments++;
      }
    }

    // Step 4: Build the final heatmap array (always 24 elements, one per hour)
    const heatmapPoints: HeatmapPoint[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const bucket = heatmapBuckets[hour];
      heatmapPoints.push({
        hour, // 0, 1, 2, ... 23
        visits: bucket.visits,
        forms: bucket.formSessions.size + bucket.forms,
        payments: bucket.payments,
        revenue: Math.round(bucket.payments * 4.9 * 100) / 100,
      });
    }

    // ============================================
    // MARKETING: Aggregate by UTM source/campaign
    // ============================================
    // Last 30 days for marketing analytics
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const marketingLogs = logs.filter((log) => new Date(log.timestamp) >= thirtyDaysAgo);

    // Group sessions by their UTM
    const sessionUTMMap: Map<string, { source: string; campaign: string }> = new Map();
    const sessionMetrics: Map<string, { hasVisit: boolean; hasForm: boolean; hasPayment: boolean }> = new Map();

    for (const log of marketingLogs) {
      if (!log.sessionId) continue;

      // Track UTM for session (first occurrence wins - first touch)
      if (!sessionUTMMap.has(log.sessionId)) {
        const source = log.utm?.source || "direct";
        const campaign = log.utm?.campaign || "none";
        sessionUTMMap.set(log.sessionId, { source, campaign });
      }

      // Track session metrics
      if (!sessionMetrics.has(log.sessionId)) {
        sessionMetrics.set(log.sessionId, { hasVisit: false, hasForm: false, hasPayment: false });
      }
      const metrics = sessionMetrics.get(log.sessionId)!;

      if (log.type === "visit") metrics.hasVisit = true;
      if (log.type === "form") metrics.hasForm = true;
      if (log.type === "payment") metrics.hasPayment = true;
    }

    // Aggregate by source/campaign
    const sourceCampaignAgg: Map<string, MarketingSourceCampaign> = new Map();

    sessionUTMMap.forEach((utm, sessionId) => {
      const key = `${utm.source}::${utm.campaign}`;
      const metrics = sessionMetrics.get(sessionId);
      
      if (!metrics) return; // Use return in forEach instead of continue

      if (!sourceCampaignAgg.has(key)) {
        sourceCampaignAgg.set(key, {
          source: utm.source,
          campaign: utm.campaign,
          visits: 0,
          forms: 0,
          payments: 0,
          revenue: 0,
          conversionRate: 0,
        });
      }

      const agg = sourceCampaignAgg.get(key)!;
      if (metrics.hasVisit) agg.visits++;
      if (metrics.hasForm) agg.forms++;
      if (metrics.hasPayment) {
        agg.payments++;
        agg.revenue = Math.round((agg.payments * 4.9) * 100) / 100;
      }
    });

    // Calculate conversion rates and sort by revenue desc
    const marketingBySourceCampaign: MarketingSourceCampaign[] = Array.from(sourceCampaignAgg.values())
      .map((agg) => ({
        ...agg,
        conversionRate: agg.visits > 0 
          ? Math.round((agg.payments / agg.visits) * 10000) / 100 
          : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.payments - a.payments);

    // Get latest 50 logs (most recent first)
    // Include all types (including intent) for the live feed
    const latestLogs = [...logs].reverse().slice(0, 50);

    const response: MetricsResponse = {
      kpis,
      timeseries: { points },
      heatmap: {
        byHourOfDay: heatmapPoints,
      },
      marketing: {
        bySourceCampaign: marketingBySourceCampaign,
      },
      latestLogs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in GET /api/metrics:", error);
    
    // Return default values instead of error to prevent frontend crashes
    const defaultResponse: MetricsResponse = {
      kpis: {
        totalVisits: 0,
        uniqueVisitors: 0,
        totalForms: 0,
        totalCheckouts: 0,
        totalPayments: 0,
        conversionRate: 0,
        revenueTotal: 0,
      },
      timeseries: { points: [] },
      heatmap: { byHourOfDay: [] },
      marketing: { bySourceCampaign: [] },
      latestLogs: [],
    };
    
    return NextResponse.json(defaultResponse);
  }
}
