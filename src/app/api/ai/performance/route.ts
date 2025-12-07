import { NextRequest, NextResponse } from "next/server";
import { readLogs, LogEntry } from "@/lib/logger";
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
 * Count unique visitors based on sessionId
 */
function countUniqueVisitors(logs: LogEntry[]): number {
  const uniqueSessions = new Set<string>();
  let visitsWithoutSession = 0;

  for (const log of logs) {
    if (log.type === "visit") {
      if (log.sessionId) {
        uniqueSessions.add(log.sessionId);
      } else {
        visitsWithoutSession++;
      }
    }
  }

  return uniqueSessions.size + visitsWithoutSession;
}

/**
 * Count unique forms per session
 */
function countUniqueForms(logs: LogEntry[]): number {
  const sessionsWithForm = new Set<string>();
  let formsWithoutSession = 0;

  for (const log of logs) {
    if (log.type === "form") {
      if (log.sessionId) {
        sessionsWithForm.add(log.sessionId);
      } else {
        formsWithoutSession++;
      }
    }
  }

  return sessionsWithForm.size + formsWithoutSession;
}

/**
 * Compute heatmap by hour of day (0-23)
 */
function computeHeatmap(logs: LogEntry[]): HeatmapPoint[] {
  const buckets: Array<{
    visits: number;
    forms: number;
    payments: number;
    formSessions: Set<string>;
  }> = [];

  for (let h = 0; h < 24; h++) {
    buckets[h] = { visits: 0, forms: 0, payments: 0, formSessions: new Set() };
  }

  // Filter last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  for (const log of logs) {
    const logDate = new Date(log.timestamp);
    if (logDate < sevenDaysAgo) continue;

    const hourOfDay = logDate.getHours();

    if (log.type === "visit") {
      buckets[hourOfDay].visits++;
    }
    if (log.type === "form") {
      if (log.sessionId) {
        buckets[hourOfDay].formSessions.add(log.sessionId);
      } else {
        buckets[hourOfDay].forms++;
      }
    }
    if (log.type === "payment") {
      buckets[hourOfDay].payments++;
    }
  }

  return buckets.map((bucket, hour) => ({
    hour,
    visits: bucket.visits,
    forms: bucket.formSessions.size + bucket.forms,
    payments: bucket.payments,
    revenue: Math.round(bucket.payments * PRICE_PER_PAYMENT * 100) / 100,
  }));
}

/**
 * Get hot hours (top 5 by visits)
 */
function getHotHours(heatmap: HeatmapPoint[]): number[] {
  return [...heatmap]
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5)
    .filter((h) => h.visits > 0)
    .map((h) => h.hour);
}

/**
 * Compute UTM data aggregation
 */
function computeUTMData(logs: LogEntry[]): UTMData[] {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Filter last 30 days
  const recentLogs = logs.filter((log) => new Date(log.timestamp) >= thirtyDaysAgo);

  // Map sessions to their UTM (first touch)
  const sessionUTM: Map<string, { source: string; campaign: string }> = new Map();
  const sessionMetrics: Map<
    string,
    { hasVisit: boolean; hasForm: boolean; hasCheckout: boolean; hasPayment: boolean }
  > = new Map();

  for (const log of recentLogs) {
    if (!log.sessionId) continue;

    // Track UTM for session (first occurrence wins)
    if (!sessionUTM.has(log.sessionId)) {
      sessionUTM.set(log.sessionId, {
        source: log.utm?.source || "direct",
        campaign: log.utm?.campaign || "none",
      });
    }

    // Track session metrics
    if (!sessionMetrics.has(log.sessionId)) {
      sessionMetrics.set(log.sessionId, {
        hasVisit: false,
        hasForm: false,
        hasCheckout: false,
        hasPayment: false,
      });
    }

    const metrics = sessionMetrics.get(log.sessionId)!;
    if (log.type === "visit") metrics.hasVisit = true;
    if (log.type === "form") metrics.hasForm = true;
    if (log.type === "checkout") metrics.hasCheckout = true;
    if (log.type === "payment") metrics.hasPayment = true;
  }

  // Aggregate by source/campaign
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

  // Calculate conversion rates and sort by revenue
  return Array.from(aggregation.values())
    .map((agg) => ({
      ...agg,
      conversionRate: agg.visits > 0 ? Math.round((agg.payments / agg.visits) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.payments - a.payments);
}

/**
 * Detect funnel drop-off points
 */
function detectDropOffPoints(metrics: {
  totalVisits: number;
  totalForms: number;
  totalCheckouts: number;
  totalPayments: number;
}): string[] {
  const dropOffs: string[] = [];

  const visitToFormRate = metrics.totalVisits > 0 ? metrics.totalForms / metrics.totalVisits : 0;
  const formToCheckoutRate = metrics.totalForms > 0 ? metrics.totalCheckouts / metrics.totalForms : 0;
  const checkoutToPaymentRate =
    metrics.totalCheckouts > 0 ? metrics.totalPayments / metrics.totalCheckouts : 0;

  if (visitToFormRate < 0.1) {
    dropOffs.push("Fort abandon entre la visite et le formulaire (< 10%)");
  }
  if (formToCheckoutRate < 0.3) {
    dropOffs.push("Perte significative entre formulaire et checkout (< 30%)");
  }
  if (checkoutToPaymentRate < 0.5) {
    dropOffs.push("Abandon au checkout (< 50% de conversion)");
  }

  return dropOffs;
}

/**
 * Detect anomalies (lightweight version)
 */
function detectAnomalies(logs: LogEntry[], heatmap: HeatmapPoint[]): string[] {
  const anomalies: string[] = [];

  // Check for unusual activity spikes
  const avgVisitsPerHour =
    heatmap.reduce((sum, h) => sum + h.visits, 0) / heatmap.filter((h) => h.visits > 0).length || 1;
  const highTrafficHours = heatmap.filter((h) => h.visits > avgVisitsPerHour * 3);

  if (highTrafficHours.length > 0) {
    anomalies.push(
      `Pics de trafic anormaux détectés à ${highTrafficHours.map((h) => `${h.hour}h`).join(", ")}`
    );
  }

  // Check for errors
  const errorCount = logs.filter((log) => log.type === "error").length;
  if (errorCount > 10) {
    anomalies.push(`${errorCount} erreurs détectées dans les logs`);
  }

  // Check for sessions with visit but no form (high bounce)
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentLogs = logs.filter((log) => new Date(log.timestamp) >= oneDayAgo);

  const visitSessions = new Set<string>();
  const formSessions = new Set<string>();

  for (const log of recentLogs) {
    if (!log.sessionId) continue;
    if (log.type === "visit") visitSessions.add(log.sessionId);
    if (log.type === "form") formSessions.add(log.sessionId);
  }

  const bounceRate =
    visitSessions.size > 0 ? (visitSessions.size - formSessions.size) / visitSessions.size : 0;
  if (bounceRate > 0.9) {
    anomalies.push(`Taux de rebond très élevé (${Math.round(bounceRate * 100)}%)`);
  }

  return anomalies;
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

    // Clean and parse response
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

    // Ensure recommendations is an array
    if (!Array.isArray(analysis.recommendations)) {
      analysis.recommendations = [];
    }

    return analysis;
  } catch (error) {
    console.error("OpenAI API error:", error);
    // Return fallback analysis
    return {
      summary:
        "Analyse temporairement indisponible. Les données montrent une activité normale avec des opportunités d'optimisation.",
      funnelAnalysis:
        "Le funnel présente des opportunités d'amélioration à chaque étape. Surveillez les points de friction principaux.",
      heatmapInsights:
        "Les heures de pointe identifiées peuvent guider vos campagnes publicitaires pour maximiser l'impact.",
      utmInsights:
        "Analysez les sources de trafic performantes pour réallouer le budget marketing efficacement.",
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
    // Get budget parameter if provided
    const { searchParams } = new URL(request.url);
    const budgetParam = searchParams.get("budget");
    const budget = budgetParam ? parseFloat(budgetParam) : undefined;

    // Load logs
    const logs = await readLogs();

    // Compute basic metrics
    const totalVisits = logs.filter((log) => log.type === "visit").length;
    const uniqueVisitors = countUniqueVisitors(logs);
    const totalForms = countUniqueForms(logs);
    const totalCheckouts = logs.filter((log) => log.type === "checkout").length;
    const totalPayments = logs.filter((log) => log.type === "payment").length;
    const revenueTotal = Math.round(totalPayments * PRICE_PER_PAYMENT * 100) / 100;
    const conversionRate =
      uniqueVisitors > 0 ? Math.round((totalPayments / uniqueVisitors) * 10000) / 100 : 0;

    // Compute funnel ratios
    const funnelRatios = {
      visitToForm: totalVisits > 0 ? totalForms / totalVisits : 0,
      formToCheckout: totalForms > 0 ? totalCheckouts / totalForms : 0,
      checkoutToPayment: totalCheckouts > 0 ? totalPayments / totalCheckouts : 0,
    };

    // Compute heatmap and hot hours
    const heatmap = computeHeatmap(logs);
    const hotHours = getHotHours(heatmap);

    // Compute UTM data
    const utmData = computeUTMData(logs);

    // Detect drop-off points
    const dropOffPoints = detectDropOffPoints({
      totalVisits,
      totalForms,
      totalCheckouts,
      totalPayments,
    });

    // Detect anomalies
    const anomalies = detectAnomalies(logs, heatmap);

    // Build metrics object
    const metrics: PerformanceMetrics = {
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

    // Get AI analysis
    const ai = await getAIAnalysis(metrics, budget);

    // Return combined response
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


