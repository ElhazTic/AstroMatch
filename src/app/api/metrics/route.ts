import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { maskEmailsInObject } from "@/lib/maskEmail";

export const dynamic = "force-dynamic";

// Cache TTL in milliseconds (30 seconds)
const CACHE_TTL_MS = 30 * 1000;

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

interface LogEntry {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  payload?: Record<string, unknown>;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  };
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

const PRICE_PER_PAYMENT = 4.9;

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
 * Calculate metrics from database
 */
async function calculateMetrics(): Promise<MetricsResponse> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // KPIs - Calculate from all events
  const [
    totalVisits,
    uniqueVisitors,
    totalForms,
    totalCheckouts,
    totalPayments,
    recentEvents,
    heatmapEvents,
    marketingEvents,
    latestEvents,
  ] = await Promise.all([
    // Total visits
    prisma.event.count({ where: { type: "visit" } }),
    
    // Unique visitors (distinct sessionIds for visits)
    prisma.event.findMany({
      where: { type: "visit", sessionId: { not: null } },
      select: { sessionId: true },
      distinct: ["sessionId"],
    }).then(results => results.length),
    
    // Unique forms per session
    prisma.event.findMany({
      where: { type: "form", sessionId: { not: null } },
      select: { sessionId: true },
      distinct: ["sessionId"],
    }).then(results => results.length),
    
    // Total checkouts
    prisma.event.count({ where: { type: "checkout" } }),
    
    // Total payments
    prisma.event.count({ where: { type: "payment" } }),
    
    // Recent events for timeseries (24h)
    prisma.event.findMany({
      where: { timestamp: { gte: twentyFourHoursAgo } },
      select: { type: true, timestamp: true, sessionId: true },
    }),
    
    // Events for heatmap (7 days)
    prisma.event.findMany({
      where: { timestamp: { gte: sevenDaysAgo } },
      select: { type: true, timestamp: true, sessionId: true },
    }),
    
    // Events for marketing (30 days)
    prisma.event.findMany({
      where: { timestamp: { gte: thirtyDaysAgo } },
      select: {
        type: true,
        sessionId: true,
        utmSource: true,
        utmCampaign: true,
      },
    }),
    
    // Latest 50 events
    prisma.event.findMany({
      orderBy: { timestamp: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        message: true,
        timestamp: true,
        sessionId: true,
        userAgent: true,
        ip: true,
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        utmContent: true,
        utmTerm: true,
        metadata: true,
      },
    }),
  ]);

  // Add forms without sessionId (legacy)
  const formsWithoutSession = await prisma.event.count({
    where: { type: "form", sessionId: null },
  });
  const adjustedTotalForms = totalForms + formsWithoutSession;

  // Calculate conversion rate
  const conversionRate = uniqueVisitors > 0 
    ? Math.round((totalPayments / uniqueVisitors) * 10000) / 100 
    : 0;
  
  const revenueTotal = Math.round(totalPayments * PRICE_PER_PAYMENT * 100) / 100;

  const kpis: KPIs = {
    totalVisits,
    uniqueVisitors,
    totalForms: adjustedTotalForms,
    totalCheckouts,
    totalPayments,
    conversionRate,
    revenueTotal,
  };

  // Build timeseries
  const hourSlots = generateHourSlots(24);
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

  for (const event of recentEvents) {
    const logHour = truncateToHour(event.timestamp);
    
    if (hourlyData[logHour]) {
      if (event.type === "visit") hourlyData[logHour].visits++;
      if (event.type === "form") {
        if (event.sessionId) {
          hourlyData[logHour].formSessions.add(event.sessionId);
        } else {
          hourlyData[logHour].forms++;
        }
      }
      if (event.type === "checkout") hourlyData[logHour].checkouts++;
      if (event.type === "payment") hourlyData[logHour].payments++;
    }
  }

  const points: TimeseriesPoint[] = hourSlots.map((hour) => ({
    hour,
    visits: hourlyData[hour].visits,
    forms: hourlyData[hour].formSessions.size + hourlyData[hour].forms,
    checkouts: hourlyData[hour].checkouts,
    payments: hourlyData[hour].payments,
    revenue: Math.round(hourlyData[hour].payments * PRICE_PER_PAYMENT * 100) / 100,
  }));

  // Build heatmap (24 hours)
  const heatmapBuckets: Array<{
    visits: number;
    forms: number;
    payments: number;
    formSessions: Set<string>;
  }> = [];
  
  for (let h = 0; h < 24; h++) {
    heatmapBuckets[h] = { visits: 0, forms: 0, payments: 0, formSessions: new Set() };
  }

  for (const event of heatmapEvents) {
    const hourOfDay = event.timestamp.getHours();
    
    if (event.type === "visit") heatmapBuckets[hourOfDay].visits++;
    if (event.type === "form") {
      if (event.sessionId) {
        heatmapBuckets[hourOfDay].formSessions.add(event.sessionId);
      } else {
        heatmapBuckets[hourOfDay].forms++;
      }
    }
    if (event.type === "payment") heatmapBuckets[hourOfDay].payments++;
  }

  const heatmapPoints: HeatmapPoint[] = heatmapBuckets.map((bucket, hour) => ({
    hour,
    visits: bucket.visits,
    forms: bucket.formSessions.size + bucket.forms,
    payments: bucket.payments,
    revenue: Math.round(bucket.payments * PRICE_PER_PAYMENT * 100) / 100,
  }));

  // Build marketing data
  const sessionUTMMap: Map<string, { source: string; campaign: string }> = new Map();
  const sessionMetrics: Map<string, { hasVisit: boolean; hasForm: boolean; hasPayment: boolean }> = new Map();

  for (const event of marketingEvents) {
    if (!event.sessionId) continue;

    if (!sessionUTMMap.has(event.sessionId)) {
      const source = event.utmSource || "direct";
      const campaign = event.utmCampaign || "none";
      sessionUTMMap.set(event.sessionId, { source, campaign });
    }

    if (!sessionMetrics.has(event.sessionId)) {
      sessionMetrics.set(event.sessionId, { hasVisit: false, hasForm: false, hasPayment: false });
    }
    const metrics = sessionMetrics.get(event.sessionId)!;

    if (event.type === "visit") metrics.hasVisit = true;
    if (event.type === "form") metrics.hasForm = true;
    if (event.type === "payment") metrics.hasPayment = true;
  }

  const sourceCampaignAgg: Map<string, MarketingSourceCampaign> = new Map();

  sessionUTMMap.forEach((utm, sessionId) => {
    const key = `${utm.source}::${utm.campaign}`;
    const metrics = sessionMetrics.get(sessionId);
    
    if (!metrics) return;

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
      agg.revenue = Math.round((agg.payments * PRICE_PER_PAYMENT) * 100) / 100;
    }
  });

  const marketingBySourceCampaign: MarketingSourceCampaign[] = Array.from(sourceCampaignAgg.values())
    .map((agg) => ({
      ...agg,
      conversionRate: agg.visits > 0 
        ? Math.round((agg.payments / agg.visits) * 10000) / 100 
        : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.payments - a.payments);

  // Transform latest events to LogEntry format
  const latestLogs: LogEntry[] = latestEvents.map((event) => ({
    id: event.id.toString(),
    timestamp: event.timestamp.toISOString(),
    type: event.type,
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

  return {
    kpis,
    timeseries: { points },
    heatmap: { byHourOfDay: heatmapPoints },
    marketing: { bySourceCampaign: marketingBySourceCampaign },
    latestLogs: latestLogs.map((log) => maskEmailsInObject(log) as LogEntry),
  };
}

/**
 * GET /api/metrics
 * Returns computed KPIs, timeseries data, heatmap, marketing data, and latest logs.
 * Uses caching with 30-second TTL.
 */
export async function GET() {
  try {
    // Check cache
    const cached = await prisma.metricsCache.findUnique({
      where: { key: "metrics_response" },
    });

    if (cached) {
      const cachedData = cached.value as unknown as { response: MetricsResponse; timestamp: number };
      const age = Date.now() - cachedData.timestamp;
      
      if (age < CACHE_TTL_MS) {
        // Return cached response
        return NextResponse.json(cachedData.response);
      }
    }

    // Calculate fresh metrics
    const response = await calculateMetrics();

    // Update cache
    await prisma.metricsCache.upsert({
      where: { key: "metrics_response" },
      update: {
        value: { response, timestamp: Date.now() } as unknown as object,
        updatedAt: new Date(),
      },
      create: {
        key: "metrics_response",
        value: { response, timestamp: Date.now() } as unknown as object,
        updatedAt: new Date(),
      },
    });

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
