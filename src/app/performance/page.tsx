"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Brain,
  Activity,
  TrendingUp,
  Flame,
  Target,
  DollarSign,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  Zap,
  AlertCircle,
} from "lucide-react";

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

interface IAAnalysis {
  summary: string;
  funnelAnalysis: string;
  heatmapInsights: string;
  utmInsights: string;
  recommendations: string[];
  roiProjectionText?: string;
  predictions?: string;
}

interface IAStatus {
  hasAnalysis: boolean;
  isStale: boolean;
  lastUpdated?: number;
  analysis: IAAnalysis | null;
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

interface PerformanceResponse {
  ai: IAAnalysis;
  metrics: PerformanceMetrics;
}

// Card Component
function Card({
  title,
  subtitle,
  icon: Icon,
  children,
  className = "",
  isLoading = false,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/5 bg-[#0A1020] p-6 shadow-xl transition-opacity duration-300 ${
        isLoading ? "opacity-50" : "opacity-100"
      } ${className}`}
    >
      <div className="flex items-start gap-3 mb-4">
        {Icon && (
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20">
            <Icon className="w-5 h-5 text-purple-400" />
          </div>
        )}
        <div>
          <h2 className="text-white/90 text-lg font-medium">{title}</h2>
          {subtitle && <p className="text-white/50 text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// Funnel Step Component
function FunnelStep({
  label,
  value,
  percentage,
  color,
  isLast = false,
}: {
  label: string;
  value: number;
  percentage?: number;
  color: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-white/70 text-sm">{label}</span>
          <span className={`text-sm font-semibold ${color}`}>{value.toLocaleString("fr-FR")}</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              color.includes("blue")
                ? "bg-gradient-to-r from-blue-600 to-blue-400"
                : color.includes("amber")
                ? "bg-gradient-to-r from-amber-600 to-amber-400"
                : color.includes("orange")
                ? "bg-gradient-to-r from-orange-600 to-orange-400"
                : "bg-gradient-to-r from-emerald-600 to-emerald-400"
            }`}
            style={{ width: `${percentage ?? 100}%` }}
          />
        </div>
      </div>
      {!isLast && <ArrowRight className="w-4 h-4 text-white/20 flex-shrink-0 mx-2" />}
    </div>
  );
}

// Hot Hours Component
function HotHoursBadges({ hours, heatmap }: { hours: number[]; heatmap: HeatmapPoint[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {hours.map((hour) => {
        const data = heatmap.find((h) => h.hour === hour);
        return (
          <div
            key={hour}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center gap-2"
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-orange-300 text-sm font-medium">
              {hour.toString().padStart(2, "0")}h
            </span>
            {data && (
              <span className="text-white/40 text-xs">
                ({data.visits} visites)
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// IA Status Badge Component
function IAStatusBadge({
  isStale,
  isRecomputing,
  lastUpdated,
  onRefresh,
}: {
  isStale: boolean;
  isRecomputing: boolean;
  lastUpdated?: number;
  onRefresh: () => void;
}) {
  const formatLastUpdated = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isRecomputing) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
        <span className="text-blue-300 text-sm font-medium">Analyse en cours…</span>
      </div>
    );
  }

  if (isStale) {
    return (
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
      >
        <AlertCircle className="w-4 h-4 text-amber-400" />
        <span className="text-amber-300 text-sm font-medium">
          Analyse IA obsolète – cliquez pour actualiser
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-emerald-300 text-sm font-medium">Analyse IA à jour</span>
        {lastUpdated && (
          <span className="text-emerald-400/60 text-xs">
            ({formatLastUpdated(lastUpdated)})
          </span>
        )}
      </div>
      <button
        onClick={onRefresh}
        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        title="Rafraîchir l'analyse IA"
      >
        <RefreshCw className="w-4 h-4 text-white/60" />
      </button>
    </div>
  );
}

// Main Performance Page
export default function PerformancePage() {
  const [data, setData] = useState<PerformanceResponse | null>(null);
  const [iaStatus, setIAStatus] = useState<IAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [budgetInput, setBudgetInput] = useState<string>("");
  const [budgetPrediction, setBudgetPrediction] = useState<string | null>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);

  // Fetch IA analysis status
  const fetchIAStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/performance/recompute");
      if (res.ok) {
        const status = await res.json();
        setIAStatus(status);
        return status;
      }
    } catch (err) {
      console.error("Failed to fetch IA status:", err);
    }
    return null;
  }, []);

  // Trigger IA recompute
  const triggerRecompute = useCallback(async (manual: boolean = true) => {
    setIsRecomputing(true);
    try {
      const res = await fetch(`/api/performance/recompute?manual=${manual ? "1" : "0"}`, {
        method: "POST",
      });
      
      if (res.ok) {
        const result = await res.json();
        if (result.analysis) {
          setIAStatus({
            hasAnalysis: true,
            isStale: false,
            lastUpdated: Date.now(),
            analysis: result.analysis,
          });
          
          // Update the main data with new analysis
          if (data) {
            setData({
              ...data,
              ai: result.analysis,
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to recompute IA:", err);
    } finally {
      setIsRecomputing(false);
    }
  }, [data]);

  // Fetch performance data (metrics only, IA from status)
  const fetchData = useCallback(async () => {
    try {
      // Fetch metrics and current AI analysis in parallel
      const [perfRes, iaStatusResult] = await Promise.all([
        fetch("/api/ai/performance"),
        fetchIAStatus(),
      ]);

      if (!perfRes.ok) {
        throw new Error(`Erreur ${perfRes.status}`);
      }

      const result: PerformanceResponse = await perfRes.json();
      
      // If we have a cached IA analysis, use it
      if (iaStatusResult?.analysis) {
        result.ai = {
          ...result.ai,
          ...iaStatusResult.analysis,
        };
      }

      setData(result);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error("Failed to fetch performance data:", err);
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [fetchIAStatus]);

  // Fetch budget prediction
  const fetchBudgetPrediction = async (budget: number) => {
    setLoadingPrediction(true);
    try {
      const res = await fetch(`/api/ai/performance?budget=${budget}`);
      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`);
      }
      const result: PerformanceResponse = await res.json();
      setBudgetPrediction(result.ai.predictions || result.ai.roiProjectionText || null);
    } catch (err) {
      console.error("Failed to fetch prediction:", err);
      setBudgetPrediction("Erreur lors du calcul des prédictions.");
    } finally {
      setLoadingPrediction(false);
    }
  };

  // Handle budget submit
  const handleBudgetSubmit = () => {
    const budget = parseFloat(budgetInput);
    if (!isNaN(budget) && budget > 0) {
      fetchBudgetPrediction(budget);
    }
  };

  // Disable auto-live
  const handleDisableAutoLive = () => {
    localStorage.setItem("performanceAutoDisabled", "true");
  };

  // Initial fetch and auto-refresh every 30s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    
    // Also check IA status every 30s
    const iaInterval = setInterval(fetchIAStatus, 30000);
    
    return () => {
      clearInterval(interval);
      clearInterval(iaInterval);
    };
  }, [fetchData, fetchIAStatus]);

  // Calculate funnel percentages
  const getFunnelPercentage = (value: number, baseValue: number) => {
    if (baseValue === 0) return 0;
    return Math.min(100, Math.round((value / baseValue) * 100));
  };

  // Get current IA analysis from status or data
  const currentIA = iaStatus?.analysis || data?.ai;
  const isStale = iaStatus?.isStale ?? true;

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#030712] via-[#0A1020] to-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            <Brain className="w-6 h-6 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-white/60 text-sm">Chargement des données...</p>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#030712] via-[#0A1020] to-[#030712] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 text-lg">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
          >
            Réessayer
          </button>
        </div>
      </main>
    );
  }

  const metrics = data?.metrics;
  const ai = currentIA;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#030712] via-[#0A1020] to-[#030712]">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  Analyse IA des performances
                </h1>
                <p className="text-white/50 text-sm mt-2">
                  Analyse intelligente basée sur votre trafic, votre funnel et vos campagnes.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Refresh indicator */}
                <div className="flex items-center gap-2 text-white/40 text-xs">
                  <RefreshCw className="w-3.5 h-3.5" />
                  {lastUpdate && (
                    <span>
                      {lastUpdate.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                {/* Disable auto-live button */}
                <button
                  onClick={handleDisableAutoLive}
                  className="text-xs text-white/40 hover:text-white/80 transition-colors"
                >
                  Désactiver l&apos;auto-live
                </button>
              </div>
            </div>
            
            {/* IA Status Badge */}
            <div className="flex items-center justify-between">
              <IAStatusBadge
                isStale={isStale}
                isRecomputing={isRecomputing}
                lastUpdated={iaStatus?.lastUpdated}
                onRefresh={() => triggerRecompute(true)}
              />
              
              {/* Manual Refresh Button */}
              <button
                onClick={() => triggerRecompute(true)}
                disabled={isRecomputing}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isRecomputing ? "animate-spin" : ""}`} />
                <span>Rafraîchir l&apos;analyse IA</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Section B - Résumé IA */}
        <Card
          title="Résumé IA"
          subtitle="Vue générale basée sur vos données réelles"
          icon={Brain}
          isLoading={isRecomputing}
        >
          <p className="text-white/70 text-sm leading-relaxed">
            {ai?.summary || "Aucune analyse disponible."}
          </p>
        </Card>

        {/* Section C - Funnel Analysis */}
        <Card
          title="Analyse du Funnel"
          subtitle="Visualisation du parcours utilisateur"
          icon={Activity}
          isLoading={isRecomputing}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual Funnel */}
            <div className="space-y-4">
              <FunnelStep
                label="Visites"
                value={metrics?.totalVisits || 0}
                percentage={100}
                color="text-blue-400"
              />
              <FunnelStep
                label="Formulaires"
                value={metrics?.totalForms || 0}
                percentage={getFunnelPercentage(metrics?.totalForms || 0, metrics?.totalVisits || 1)}
                color="text-amber-400"
              />
              <FunnelStep
                label="Checkouts"
                value={metrics?.totalCheckouts || 0}
                percentage={getFunnelPercentage(metrics?.totalCheckouts || 0, metrics?.totalVisits || 1)}
                color="text-orange-400"
              />
              <FunnelStep
                label="Paiements"
                value={metrics?.totalPayments || 0}
                percentage={getFunnelPercentage(metrics?.totalPayments || 0, metrics?.totalVisits || 1)}
                color="text-emerald-400"
                isLast
              />

              {/* Conversion Ratios */}
              <div className="pt-4 border-t border-white/5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-white/5">
                    <div className="text-xs text-white/40">Visit → Form</div>
                    <div className="text-sm font-semibold text-blue-400">
                      {((metrics?.funnelRatios?.visitToForm || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <div className="text-xs text-white/40">Form → Checkout</div>
                    <div className="text-sm font-semibold text-amber-400">
                      {((metrics?.funnelRatios?.formToCheckout || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <div className="text-xs text-white/40">Checkout → Pay</div>
                    <div className="text-sm font-semibold text-emerald-400">
                      {((metrics?.funnelRatios?.checkoutToPayment || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* IA Commentary */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-white/80 text-sm font-medium">Analyse IA du Funnel</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed">
                {ai?.funnelAnalysis || "Analyse en cours..."}
              </p>
            </div>
          </div>
        </Card>

        {/* Section D - Heures chaudes */}
        <Card
          title="Heures Chaudes"
          subtitle="Pics d'activité détectés"
          icon={Flame}
          isLoading={isRecomputing}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hot Hours List */}
            <div>
              <p className="text-white/50 text-xs mb-3 uppercase tracking-wide">
                Heures avec le plus d&apos;activité
              </p>
              {metrics?.hotHours && metrics.hotHours.length > 0 ? (
                <HotHoursBadges hours={metrics.hotHours} heatmap={metrics.heatmap || []} />
              ) : (
                <p className="text-white/40 text-sm">Aucune donnée disponible</p>
              )}
            </div>

            {/* IA Insights */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-orange-400" />
                <span className="text-white/80 text-sm font-medium">Insights Heatmap</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed">
                {ai?.heatmapInsights || "Analyse en cours..."}
              </p>
            </div>
          </div>
        </Card>

        {/* Section E - UTM Analysis */}
        <Card
          title="Analyse UTM & Campagnes"
          subtitle="Performance par source de trafic"
          icon={TrendingUp}
          isLoading={isRecomputing}
        >
          {/* UTM Table */}
          {metrics?.utmData && metrics.utmData.length > 0 ? (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/40 text-xs uppercase tracking-wide border-b border-slate-800">
                    <th className="text-left py-3 px-2">Source</th>
                    <th className="text-left py-3 px-2">Campagne</th>
                    <th className="text-right py-3 px-2">Visiteurs</th>
                    <th className="text-right py-3 px-2">Forms</th>
                    <th className="text-right py-3 px-2">Checkouts</th>
                    <th className="text-right py-3 px-2">Paiements</th>
                    <th className="text-right py-3 px-2">CA</th>
                    <th className="text-right py-3 px-2">Conv.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {metrics.utmData.slice(0, 10).map((utm, index) => (
                    <tr key={`${utm.source}-${utm.campaign}-${index}`} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {utm.source}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-white/70">
                        {utm.campaign === "none" ? "—" : utm.campaign}
                      </td>
                      <td className="py-3 px-2 text-right text-white/80 font-mono">{utm.visits}</td>
                      <td className="py-3 px-2 text-right text-amber-400 font-mono">{utm.forms}</td>
                      <td className="py-3 px-2 text-right text-orange-400 font-mono">{utm.checkouts}</td>
                      <td className="py-3 px-2 text-right text-emerald-400 font-mono">{utm.payments}</td>
                      <td className="py-3 px-2 text-right text-emerald-400 font-mono font-semibold">
                        {utm.revenue.toFixed(2)}€
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            utm.conversionRate >= 5
                              ? "bg-emerald-500/20 text-emerald-400"
                              : utm.conversionRate >= 1
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-slate-700 text-slate-400"
                          }`}
                        >
                          {utm.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-white/40 text-sm mb-4">Aucune donnée UTM disponible</p>
          )}

          {/* IA UTM Insights */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/5">
            <p className="text-white/60 text-sm leading-relaxed">
              {ai?.utmInsights || "Analyse en cours..."}
            </p>
          </div>
        </Card>

        {/* Section F - Recommandations IA */}
        <Card
          title="Recommandations IA"
          subtitle="Actions concrètes à mettre en place"
          icon={CheckCircle}
          isLoading={isRecomputing}
        >
          {ai?.recommendations && ai.recommendations.length > 0 ? (
            <ul className="space-y-3">
              {ai.recommendations.map((rec, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span className="text-white/80 text-sm leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-white/40 text-sm">Aucune recommandation disponible.</p>
          )}
        </Card>

        {/* Section G - Budget & ROI Projection */}
        <Card
          title="Projection Budget & ROI"
          subtitle="Simulez l'impact de vos dépenses publicitaires"
          icon={DollarSign}
          isLoading={isRecomputing}
        >
          <div className="space-y-4">
            {/* Budget Input */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-white/50 text-xs mb-2 block">Budget TikTok (€)</label>
                <input
                  type="number"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="Ex: 500"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleBudgetSubmit}
                  disabled={loadingPrediction || !budgetInput}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingPrediction ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Calcul...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      Calculer
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Prediction Result */}
            {budgetPrediction && (
              <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-xl p-4 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-purple-400" />
                  <span className="text-white/80 text-sm font-medium">Prédictions IA</span>
                </div>
                <p className="text-white/70 text-sm leading-relaxed">{budgetPrediction}</p>
              </div>
            )}

            {/* Default prediction from initial analysis */}
            {!budgetPrediction && (ai?.roiProjectionText || ai?.predictions) && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <p className="text-white/60 text-sm leading-relaxed">
                  {ai?.roiProjectionText || ai?.predictions}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Section H - Auto-live Indicator */}
        <div className="text-center py-4">
          <p className="text-white/30 text-xs flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Auto-live activé. Actualisation toutes les 30s.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-8">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-white/30 text-xs">
          <p>AstroMatch Performance AI · Analyse en temps réel</p>
        </div>
      </footer>
    </main>
  );
}
