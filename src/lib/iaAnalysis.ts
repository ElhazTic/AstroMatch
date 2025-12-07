import { prisma } from "./prisma";

export interface IAAnalysis {
  summary: string;
  funnelAnalysis: string;
  heatmapInsights: string;
  utmInsights: string;
  recommendations: string[];
  roiProjectionText: string;
}

export interface IAAnalysisStorage {
  lastUpdated: number;
  isStale: boolean;
  analysis: IAAnalysis;
  metricsSnapshot?: {
    totalVisits: number;
    uniqueVisitors: number;
    totalForms: number;
    totalCheckouts: number;
    totalPayments: number;
  };
}

/**
 * Load the current IA analysis from database cache
 */
export async function loadIAAnalysis(): Promise<IAAnalysisStorage | null> {
  try {
    const cached = await prisma.metricsCache.findUnique({
      where: { key: "ia_analysis" },
    });

    if (!cached) {
      return null;
    }

    return cached.value as unknown as IAAnalysisStorage;
  } catch {
    return null;
  }
}

/**
 * Save the IA analysis to database cache
 */
export async function saveIAAnalysis(storage: IAAnalysisStorage): Promise<void> {
  await prisma.metricsCache.upsert({
    where: { key: "ia_analysis" },
    update: {
      value: storage as unknown as object,
      updatedAt: new Date(),
    },
    create: {
      key: "ia_analysis",
      value: storage as unknown as object,
      updatedAt: new Date(),
    },
  });
}

/**
 * Mark the IA analysis as stale
 */
export async function markAnalysisAsStale(): Promise<void> {
  const current = await loadIAAnalysis();
  if (current) {
    current.isStale = true;
    await saveIAAnalysis(current);
  }
}
