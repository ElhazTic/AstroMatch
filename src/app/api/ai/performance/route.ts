import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOpenAIClient } from "@/lib/openai";

export const dynamic = "force-dynamic";

// Price per payment
const PRICE_PER_PAYMENT = 4.9;

// Interfaces
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
  dropOffPoints: string[];
  anomalies: string[];
}

interface AIAnalysis {
  summary: string;
  funnelAnalysis: string;
  heatmapInsights: string;
  utmInsights: string;
  recommendations: string[];
  predictions: string;
}

/**
 * Compute all metrics from database
 */
async function computeMetrics(): Promise<PerformanceMetrics> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Get all counts in parallel
  const [
    totalVisits,
    uniqueVisitorsList,
    uniqueFormsList,
    totalCheckouts,
    totalPayments,
    heatmapEvents,
    marketingEvents,
    errorCount,
    recentVisitSessions,
    recentFormSessions,
  ] = await Promise.all([
    prisma.event.count({ where: { type: "visit" } }),
    prisma.event.findMany({
      where: { type: "visit", sessionId: { not: null } },
      select: { sessionId: true },
    }).then((results) => {
      const uniqueSessions = new Set(results.map(r => r.sessionId).filter((id): id is string => id !== null));
      return Array.from(uniqueSessions).map(sessionId => ({ sessionId }));
    }),
    prisma.event.findMany({
      where: { type: "form", sessionId: { not: null } },
      select: { sessionId: true },
    }).then((results) => {
      const uniqueSessions = new Set(results.map(r => r.sessionId).filter((id): id is string => id !== null));
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
    prisma.event.count({ where: { type: "error" } }),
    prisma.event.findMany({
      where: { 
        type: "visit", 
        sessionId: { not: null },
        timestamp: { gte: oneDayAgo } 
      },
      select: { sessionId: true },
    }).then((results) => {
      const uniqueSessions = new Set(results.map(r => r.sessionId).filter((id): id is string => id !== null));
      return Array.from(uniqueSessions).map(sessionId => ({ sessionId }));
    }),
    prisma.event.findMany({
      where: { 
        type: "form", 
        sessionId: { not: null },
        timestamp: { gte: oneDayAgo } 
      },
      select: { sessionId: true },
    }).then((results) => {
      const uniqueSessions = new Set(results.map(r => r.sessionId).filter((id): id is string => id !== null));
      return Array.from(uniqueSessions).map(sessionId => ({ sessionId }));
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

  // Detect drop-off points
  const dropOffPoints: string[] = [];
  if (funnelRatios.visitToForm < 0.1) {
    dropOffPoints.push("Fort abandon entre la visite et le formulaire (< 10%)");
  }
  if (funnelRatios.formToCheckout < 0.3) {
    dropOffPoints.push("Perte significative entre formulaire et checkout (< 30%)");
  }
  if (funnelRatios.checkoutToPayment < 0.5) {
    dropOffPoints.push("Abandon au checkout (< 50% de conversion)");
  }

  // Detect anomalies
  const anomalies: string[] = [];
  const avgVisitsPerHour = heatmap.reduce((sum, h) => sum + h.visits, 0) / heatmap.filter((h) => h.visits > 0).length || 1;
  const highTrafficHours = heatmap.filter((h) => h.visits > avgVisitsPerHour * 3);
  if (highTrafficHours.length > 0) {
    anomalies.push(`Pics de trafic anormaux détectés à ${highTrafficHours.map((h) => `${h.hour}h`).join(", ")}`);
  }
  if (errorCount > 10) {
    anomalies.push(`${errorCount} erreurs détectées dans les logs`);
  }

  // Check bounce rate
  const visitSessionsSet = new Set(recentVisitSessions.map((s: { sessionId: string | null }) => s.sessionId));
  const formSessionsSet = new Set(recentFormSessions.map((s: { sessionId: string | null }) => s.sessionId));
  const bounceRate = visitSessionsSet.size > 0 ? (visitSessionsSet.size - formSessionsSet.size) / visitSessionsSet.size : 0;
  if (bounceRate > 0.9) {
    anomalies.push(`Taux de rebond très élevé (${Math.round(bounceRate * 100)}%)`);
  }

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
    dropOffPoints,
    anomalies,
  };
}

/**
 * Build AI prompt and get analysis
 */
async function getAIAnalysis(
  metrics: PerformanceMetrics,
  budget?: number
): Promise<AIAnalysis> {
  const openai = getOpenAIClient();

  const metricsJson = JSON.stringify(
    {
      totalVisits: metrics.totalVisits,
      uniqueVisitors: metrics.uniqueVisitors,
      totalForms: metrics.totalForms,
      totalCheckouts: metrics.totalCheckouts,
      totalPayments: metrics.totalPayments,
      revenueTotal: metrics.revenueTotal,
      conversionRate: metrics.conversionRate,
      funnelRatios: metrics.funnelRatios,
      hotHours: metrics.hotHours,
      topUTMSources: metrics.utmData.slice(0, 5),
      dropOffPoints: metrics.dropOffPoints,
      anomalies: metrics.anomalies,
      budget: budget || null,
    },
    null,
    2
  );

  const systemPrompt = `Tu es AstroMatch Analytics AI, un expert en analyse de performance e-commerce et marketing digital.
Tu analyses les données de performance d'AstroMatch, une application de compatibilité astrologique.
Prix du produit: ${PRICE_PER_PAYMENT}€ par analyse.

Ton style:
- Concis et professionnel
- Orienté action et résultats
- Données chiffrées précises
- Recommandations concrètes`;

  const userPrompt = `Analyse les données suivantes (JSON):

${metricsJson}

Produis obligatoirement un JSON strict avec cette structure:
{
  "summary": "Résumé en 3 phrases maximum de la performance globale",
  "funnelAnalysis": "Analyse détaillée du funnel: où se situent les pertes principales et pourquoi",
  "heatmapInsights": "Analyse des heures chaudes: quand optimiser les campagnes et pourquoi",
  "utmInsights": "Analyse des sources UTM: quelles campagnes performent le mieux et recommandations",
  "recommendations": ["Action 1 concrète", "Action 2 concrète", "Action 3 concrète", "Action 4 concrète"],
  "predictions": "${budget ? `Avec un budget TikTok de ${budget}€, estimation du ROI, CPA et ROAS basés sur les données actuelles` : "Prédictions générales basées sur les tendances actuelles"}"
}

Règles:
- Le résumé fait maximum 3 phrases
- L'analyse du funnel explique précisément où et pourquoi les utilisateurs abandonnent
- Les insights UTM pointent les campagnes les plus efficaces avec des métriques
- Les recommandations sont concrètes, actionnables et spécifiques
- Les prédictions expliquent l'impact potentiel sur conversions et revenus avec des chiffres`;

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

    const analysis = JSON.parse(cleanContent.trim()) as AIAnalysis;

    if (!Array.isArray(analysis.recommendations)) {
      analysis.recommendations = [];
    }

    return analysis;
  } catch (error) {
    console.error("OpenAI API error:", error);
    return {
      summary: "Analyse temporairement indisponible. Les données montrent une activité normale avec des opportunités d'optimisation.",
      funnelAnalysis: "Le funnel présente des opportunités d'amélioration à chaque étape. Surveillez les points de friction principaux.",
      heatmapInsights: "Les heures de pointe identifiées peuvent guider vos campagnes publicitaires pour maximiser l'impact.",
      utmInsights: "Analysez les sources de trafic performantes pour réallouer le budget marketing efficacement.",
      recommendations: [
        "Optimisez le formulaire pour augmenter les conversions",
        "Testez différentes heures de publication",
        "Suivez les campagnes UTM performantes",
        "Réduisez le temps de chargement des pages",
      ],
      predictions: "Prédictions détaillées disponibles après analyse complète des données.",
    };
  }
}

/**
 * GET /api/ai/performance
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const budgetParam = searchParams.get("budget");
    const budget = budgetParam ? parseFloat(budgetParam) : undefined;

    const metrics = await computeMetrics();
    const ai = await getAIAnalysis(metrics, budget);

    return NextResponse.json({
      ai,
      metrics,
    });
  } catch (error) {
    console.error("Error in GET /api/ai/performance:", error);
    return NextResponse.json(
      { error: "Failed to generate performance analysis" },
      { status: 500 }
    );
  }
}
