import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOpenAIClient } from "@/lib/openai";
import {
  loadIAAnalysis,
  saveIAAnalysis,
  markAnalysisAsStale,
  IAAnalysis,
  IAAnalysisStorage,
} from "@/lib/iaAnalysis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Constants
const PRICE_PER_PAYMENT = 4.9;
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// Types
interface HeatmapPoint {
  hour: number;
  visits: number;
  forms: number;
  payments: number;
  revenue: number;
}

interface UTMData {
  source: string;
  campaign: string;
  visits: number;
  forms: number;
  checkouts: number;
  payments: number;
  revenue: number;
  conversionRate: number;
}

interface PerformanceMetrics {
  totalVisits: number;
  uniqueVisitors: number;
  totalForms: number;
  totalCheckouts: number;
  totalPayments: number;
  revenueTotal: number;
  conversionRate: number;
  funnelRatios: {
    visitToForm: number;
    formToCheckout: number;
    checkoutToPayment: number;
  };
  heatmap: HeatmapPoint[];
  hotHours: number[];
  utmData: UTMData[];
}

/**
 * Compute all metrics from database
 */
async function computeMetrics(): Promise<PerformanceMetrics> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get all counts in parallel
  const [
    totalVisits,
    uniqueVisitorsList,
    uniqueFormsList,
    totalCheckouts,
    totalPayments,
    heatmapEvents,
    marketingEvents,
  ] = await Promise.all([
    prisma.event.count({ where: { type: "visit" } }),
    prisma.event.findMany({
      where: { type: "visit", sessionId: { not: null } },
      select: { sessionId: true },
    }).then((results: Array<{ sessionId: string | null }>) => {
      const uniqueSessions = new Set(results.map((r: { sessionId: string | null }) => r.sessionId).filter((id): id is string => id !== null));
      return Array.from(uniqueSessions).map(sessionId => ({ sessionId }));
    }),
    prisma.event.findMany({
      where: { type: "form", sessionId: { not: null } },
      select: { sessionId: true },
    }).then((results: Array<{ sessionId: string | null }>) => {
      const uniqueSessions = new Set(results.map((r: { sessionId: string | null }) => r.sessionId).filter((id): id is string => id !== null));
      return Array.from(uniqueSessions).map(sessionId => ({ sessionId }));
    }),
    prisma.event.count({ where: { type: "checkout" } }),
    prisma.event.count({ where: { type: "payment" } }),
    prisma.event.findMany({
      where: { timestamp: { gte: sevenDaysAgo } },
      select: { type: true, timestamp: true, sessionId: true },
    }),
    prisma.event.findMany({
      where: { timestamp: { gte: thirtyDaysAgo } },
      select: {
        type: true,
        sessionId: true,
        utmSource: true,
        utmCampaign: true,
      },
    }),
  ]);

  const uniqueVisitors = uniqueVisitorsList.length;
  const totalForms = uniqueFormsList.length;

  const revenueTotal = Math.round(totalPayments * PRICE_PER_PAYMENT * 100) / 100;
  const conversionRate = uniqueVisitors > 0 
    ? Math.round((totalPayments / uniqueVisitors) * 10000) / 100 
    : 0;

  const funnelRatios = {
    visitToForm: totalVisits > 0 ? totalForms / totalVisits : 0,
    formToCheckout: totalForms > 0 ? totalCheckouts / totalForms : 0,
    checkoutToPayment: totalCheckouts > 0 ? totalPayments / totalCheckouts : 0,
  };

  // Compute heatmap
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

  const heatmap: HeatmapPoint[] = heatmapBuckets.map((bucket, hour) => ({
    hour,
    visits: bucket.visits,
    forms: bucket.formSessions.size + bucket.forms,
    payments: bucket.payments,
    revenue: Math.round(bucket.payments * PRICE_PER_PAYMENT * 100) / 100,
  }));

  // Get hot hours
  const hotHours = [...heatmap]
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5)
    .filter((h) => h.visits > 0)
    .map((h) => h.hour);

  // Compute UTM data
  const sessionUTM: Map<string, { source: string; campaign: string }> = new Map();
  const sessionMetrics: Map<string, { hasVisit: boolean; hasForm: boolean; hasCheckout: boolean; hasPayment: boolean }> = new Map();

  for (const event of marketingEvents) {
    if (!event.sessionId) continue;

    if (!sessionUTM.has(event.sessionId)) {
      sessionUTM.set(event.sessionId, {
        source: event.utmSource || "direct",
        campaign: event.utmCampaign || "none",
      });
    }

    if (!sessionMetrics.has(event.sessionId)) {
      sessionMetrics.set(event.sessionId, { hasVisit: false, hasForm: false, hasCheckout: false, hasPayment: false });
    }

    const metrics = sessionMetrics.get(event.sessionId)!;
    if (event.type === "visit") metrics.hasVisit = true;
    if (event.type === "form") metrics.hasForm = true;
    if (event.type === "checkout") metrics.hasCheckout = true;
    if (event.type === "payment") metrics.hasPayment = true;
  }

  const aggregation: Map<string, UTMData> = new Map();

  sessionUTM.forEach((utm, sessionId) => {
    const key = `${utm.source}::${utm.campaign}`;
    const metrics = sessionMetrics.get(sessionId);
    if (!metrics) return;

    if (!aggregation.has(key)) {
      aggregation.set(key, {
        source: utm.source,
        campaign: utm.campaign,
        visits: 0,
        forms: 0,
        checkouts: 0,
        payments: 0,
        revenue: 0,
        conversionRate: 0,
      });
    }

    const agg = aggregation.get(key)!;
    if (metrics.hasVisit) agg.visits++;
    if (metrics.hasForm) agg.forms++;
    if (metrics.hasCheckout) agg.checkouts++;
    if (metrics.hasPayment) {
      agg.payments++;
      agg.revenue = Math.round(agg.payments * PRICE_PER_PAYMENT * 100) / 100;
    }
  });

  const utmData = Array.from(aggregation.values())
    .map((agg) => ({
      ...agg,
      conversionRate: agg.visits > 0 ? Math.round((agg.payments / agg.visits) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.payments - a.payments);

  return {
    totalVisits,
    uniqueVisitors,
    totalForms,
    totalCheckouts,
    totalPayments,
    revenueTotal,
    conversionRate,
    funnelRatios,
    heatmap,
    hotHours,
    utmData,
  };
}

/**
 * Check if metrics have changed compared to snapshot
 */
function metricsHaveChanged(
  current: PerformanceMetrics,
  snapshot: IAAnalysisStorage["metricsSnapshot"]
): boolean {
  if (!snapshot) return true;

  return (
    current.totalVisits !== snapshot.totalVisits ||
    current.uniqueVisitors !== snapshot.uniqueVisitors ||
    current.totalForms !== snapshot.totalForms ||
    current.totalCheckouts !== snapshot.totalCheckouts ||
    current.totalPayments !== snapshot.totalPayments
  );
}

/**
 * Call OpenAI to generate IA analysis
 */
async function generateIAAnalysis(metrics: PerformanceMetrics): Promise<IAAnalysis> {
  const openai = getOpenAIClient();

  const systemPrompt = `You are AstroMatch IA Analyst. Provide a clear, helpful, high-level performance analysis of the current traffic, conversions, funnel steps, heatmap, and UTM campaigns.
Do not mention being an AI.  
Always write in clean French, concise, structured and insightful.`;

  const userContent = JSON.stringify(
    {
      metrics: {
        totalVisits: metrics.totalVisits,
        uniqueVisitors: metrics.uniqueVisitors,
        totalForms: metrics.totalForms,
        totalCheckouts: metrics.totalCheckouts,
        totalPayments: metrics.totalPayments,
        revenueTotal: metrics.revenueTotal,
        conversionRate: metrics.conversionRate,
        funnelRatios: metrics.funnelRatios,
        hotHours: metrics.hotHours,
        utmData: metrics.utmData.slice(0, 10),
        heatmapSummary: metrics.heatmap.filter((h) => h.visits > 0).slice(0, 10),
      },
    },
    null,
    2
  );

  const userPrompt = `Analyse ces données de performance et produis un JSON avec cette structure exacte:

${userContent}

Réponds UNIQUEMENT avec ce JSON:
{
  "summary": "string - Résumé global en 3 phrases max",
  "funnelAnalysis": "string - Analyse détaillée du funnel et des points de friction",
  "heatmapInsights": "string - Insights sur les heures chaudes et recommandations de timing",
  "utmInsights": "string - Analyse des sources UTM et campagnes performantes",
  "recommendations": ["string", "string", "string", "string"] - 4 recommandations concrètes,
  "roiProjectionText": "string - Projections ROI basées sur les tendances actuelles"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    let cleanContent = content.trim();
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.slice(7);
    }
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith("```")) {
      cleanContent = cleanContent.slice(0, -3);
    }

    const analysis = JSON.parse(cleanContent.trim()) as IAAnalysis;

    if (!Array.isArray(analysis.recommendations)) {
      analysis.recommendations = [];
    }

    return analysis;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return {
      summary: "Analyse temporairement indisponible. Les données montrent une activité normale.",
      funnelAnalysis: "Le funnel présente des opportunités d'amélioration à chaque étape.",
      heatmapInsights: "Les heures de pointe identifiées peuvent guider vos campagnes publicitaires.",
      utmInsights: "Analysez les sources de trafic performantes pour optimiser le budget marketing.",
      recommendations: [
        "Optimisez le formulaire pour augmenter les conversions",
        "Testez différentes heures de publication",
        "Suivez les campagnes UTM performantes",
        "Réduisez le temps de chargement des pages",
      ],
      roiProjectionText: "Prédictions détaillées disponibles après analyse complète des données.",
    };
  }
}

/**
 * POST /api/performance/recompute
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isManual = searchParams.get("manual") === "1";
    const isAuto = searchParams.get("auto") === "1";

    const currentAnalysis = await loadIAAnalysis();
    const currentMetrics = await computeMetrics();

    // Check cooldown for auto triggers
    if (isAuto && currentAnalysis) {
      const timeSinceLastUpdate = Date.now() - currentAnalysis.lastUpdated;
      if (timeSinceLastUpdate < COOLDOWN_MS) {
        await markAnalysisAsStale();
        return NextResponse.json({
          status: "cooldown",
          updated: false,
          analysis: currentAnalysis.analysis,
          isStale: true,
          cooldownRemaining: Math.ceil((COOLDOWN_MS - timeSinceLastUpdate) / 1000),
        });
      }
    }

    const hasChanges = metricsHaveChanged(currentMetrics, currentAnalysis?.metricsSnapshot);
    const shouldRecompute = !currentAnalysis || isManual || hasChanges;

    if (!shouldRecompute && currentAnalysis) {
      return NextResponse.json({
        status: "unchanged",
        updated: false,
        analysis: currentAnalysis.analysis,
        isStale: false,
      });
    }

    console.log("[IA RECOMPUTE] Generating new analysis...");
    const newAnalysis = await generateIAAnalysis(currentMetrics);

    const storage: IAAnalysisStorage = {
      lastUpdated: Date.now(),
      isStale: false,
      analysis: newAnalysis,
      metricsSnapshot: {
        totalVisits: currentMetrics.totalVisits,
        uniqueVisitors: currentMetrics.uniqueVisitors,
        totalForms: currentMetrics.totalForms,
        totalCheckouts: currentMetrics.totalCheckouts,
        totalPayments: currentMetrics.totalPayments,
      },
    };

    await saveIAAnalysis(storage);
    console.log("[IA RECOMPUTE] Analysis saved successfully");

    return NextResponse.json({
      status: "success",
      updated: true,
      analysis: newAnalysis,
      isStale: false,
      metrics: currentMetrics,
    });
  } catch (error) {
    console.error("Error in POST /api/performance/recompute:", error);
    
    return NextResponse.json({
      status: "error",
      updated: false,
      analysis: {
        summary: "Analyse temporairement indisponible. Aucune donnée à analyser.",
        funnelAnalysis: "Données insuffisantes pour analyser le funnel.",
        heatmapInsights: "Collectez plus de données pour obtenir des insights.",
        utmInsights: "Aucune donnée marketing disponible.",
        recommendations: [
          "Commencez à collecter du trafic",
          "Configurez vos campagnes UTM",
          "Attendez quelques visites pour obtenir des insights",
          "Vérifiez que le tracking est bien configuré",
        ],
        roiProjectionText: "Prédictions disponibles après collecte de données.",
      },
      isStale: true,
    });
  }
}

/**
 * GET /api/performance/recompute
 */
export async function GET() {
  try {
    const currentAnalysis = await loadIAAnalysis();

    if (!currentAnalysis) {
      return NextResponse.json({
        status: "no_analysis",
        hasAnalysis: false,
        isStale: true,
        analysis: null,
      });
    }

    return NextResponse.json({
      status: "success",
      hasAnalysis: true,
      isStale: currentAnalysis.isStale,
      lastUpdated: currentAnalysis.lastUpdated,
      analysis: currentAnalysis.analysis,
    });
  } catch (error) {
    console.error("Error in GET /api/performance/recompute:", error);
    return NextResponse.json(
      { error: "Failed to get analysis status", status: "error" },
      { status: 500 }
    );
  }
}


