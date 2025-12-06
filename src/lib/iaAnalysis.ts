import { promises as fs } from "fs";
import path from "path";

const IA_ANALYSIS_PATH = path.join(process.cwd(), "data", "ia-analysis.json");

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
 * Ensures the data directory exists
 */
async function ensureDataDir(): Promise<void> {
  const dataDir = path.join(process.cwd(), "data");
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

/**
 * Load the current IA analysis from storage
 */
export async function loadIAAnalysis(): Promise<IAAnalysisStorage | null> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(IA_ANALYSIS_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Save the IA analysis to storage
 */
export async function saveIAAnalysis(storage: IAAnalysisStorage): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(IA_ANALYSIS_PATH, JSON.stringify(storage, null, 2), "utf-8");
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

