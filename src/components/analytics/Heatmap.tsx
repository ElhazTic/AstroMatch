"use client";

import { useState, useMemo } from "react";

interface HeatmapPoint {
  hour: number;
  visits: number;
  forms: number;
  payments: number;
}

interface HeatmapProps {
  data: HeatmapPoint[];
}

type MetricKey = "visits" | "forms" | "payments";

interface MetricConfig {
  key: MetricKey;
  label: string;
  labelShort: string;
  colors: string[];
  dotColor: string;
}

// Metric configurations with gradient colors (from dim to intense)
const METRICS: MetricConfig[] = [
  {
    key: "visits",
    label: "Visites",
    labelShort: "Vis.",
    colors: [
      "bg-slate-800/40",
      "bg-blue-950/60",
      "bg-blue-900/70",
      "bg-blue-700/80",
      "bg-blue-500/90",
      "bg-blue-400",
    ],
    dotColor: "bg-blue-400",
  },
  {
    key: "forms",
    label: "Formulaires",
    labelShort: "Forms",
    colors: [
      "bg-slate-800/40",
      "bg-amber-950/60",
      "bg-amber-900/70",
      "bg-amber-700/80",
      "bg-amber-500/90",
      "bg-amber-400",
    ],
    dotColor: "bg-amber-400",
  },
  {
    key: "payments",
    label: "Paiements",
    labelShort: "Paiem.",
    colors: [
      "bg-slate-800/40",
      "bg-emerald-950/60",
      "bg-emerald-900/70",
      "bg-emerald-700/80",
      "bg-emerald-500/90",
      "bg-emerald-400",
    ],
    dotColor: "bg-emerald-400",
  },
];

/**
 * Calculate intensity level (0-5) based on value and max
 */
function getIntensityLevel(value: number, max: number): number {
  if (value === 0 || max === 0) return 0;
  const ratio = value / max;
  if (ratio <= 0.1) return 1;
  if (ratio <= 0.25) return 2;
  if (ratio <= 0.5) return 3;
  if (ratio <= 0.75) return 4;
  return 5;
}

/**
 * Format hour for display (e.g., "0h", "12h", "23h")
 */
function formatHour(hour: number): string {
  return `${hour}h`;
}

/**
 * Compact HeatmapCell component with smaller tooltip
 */
function HeatmapCell({
  hour,
  value,
  colorClass,
  allValues,
}: {
  hour: number;
  value: number;
  colorClass: string;
  allValues: { visits: number; forms: number; payments: number };
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`
          w-3 h-3 sm:w-4 sm:h-4
          rounded-sm cursor-pointer
          transition-all duration-150
          border border-slate-700/30
          hover:border-slate-500 hover:scale-125 hover:z-10
          ${colorClass}
        `}
      >
        {value > 0 && (
          <div className="absolute inset-0 rounded bg-gradient-to-br from-white/5 to-transparent" />
        )}
      </div>

      {/* Compact Tooltip - positioned below to avoid overflow */}
      {showTooltip && (
        <div
          className="
            absolute z-[100] top-full left-1/2 -translate-x-1/2 mt-1.5
            bg-slate-800 border border-slate-600 rounded-md
            px-2 py-1.5 shadow-xl shadow-black/40
            whitespace-nowrap
            pointer-events-none
          "
        >
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-600" />
          <div className="text-slate-300 text-[10px] font-medium mb-0.5">
            {formatHour(hour)}–{formatHour((hour + 1) % 24)}
          </div>
          <div className="flex gap-2 text-[10px]">
            <span className="text-blue-400">{allValues.visits}v</span>
            <span className="text-amber-400">{allValues.forms}f</span>
            <span className="text-emerald-400">{allValues.payments}p</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Heatmap component
 * Displays 24 columns (hours) and 3 rows (metrics)
 */
export default function Heatmap({ data }: HeatmapProps) {
  // Ensure we have all 24 hours (fill missing hours with zeros)
  const normalizedData = useMemo(() => {
    const hourMap = new Map<number, HeatmapPoint>();
    data.forEach((point) => hourMap.set(point.hour, point));

    return Array.from({ length: 24 }, (_, hour) => {
      const existing = hourMap.get(hour);
      return existing || { hour, visits: 0, forms: 0, payments: 0 };
    });
  }, [data]);

  // Calculate max values for each metric (for intensity scaling)
  const maxValues = useMemo(() => {
    const maxVisits = Math.max(...normalizedData.map((p) => p.visits), 1);
    const maxForms = Math.max(...normalizedData.map((p) => p.forms), 1);
    const maxPayments = Math.max(...normalizedData.map((p) => p.payments), 1);
    return { visits: maxVisits, forms: maxForms, payments: maxPayments };
  }, [normalizedData]);

  // Calculate totals
  const totals = useMemo(() => {
    return normalizedData.reduce(
      (acc, point) => ({
        visits: acc.visits + point.visits,
        forms: acc.forms + point.forms,
        payments: acc.payments + point.payments,
      }),
      { visits: 0, forms: 0, payments: 0 }
    );
  }, [normalizedData]);

  const hasData = totals.visits > 0 || totals.forms > 0 || totals.payments > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-500">
        <div className="text-2xl mb-2">🕐</div>
        <p className="text-sm">Pas encore de données</p>
      </div>
    );
  }

  return (
    <div className="overflow-visible pb-10">
      <div className="w-full">
        {/* Hour labels row - aligned with cells */}
        <div className="flex items-center mb-0.5">
          {/* Empty space for row labels */}
          <div className="w-12 sm:w-14 flex-shrink-0" />
          {/* Hour labels matching cell widths */}
          <div className="flex gap-px">
            {normalizedData.map((point) => (
              <div
                key={`hour-${point.hour}`}
                className="w-3 sm:w-4 text-center text-[7px] sm:text-[8px] text-slate-500 font-mono"
              >
                {point.hour % 6 === 0 ? `${point.hour}` : ""}
              </div>
            ))}
          </div>
        </div>

        {/* Metric rows - compact spacing */}
        <div className="space-y-0.5">
          {METRICS.map((metric) => (
            <div key={metric.key} className="flex items-center">
              {/* Row label - compact */}
              <div className="w-12 sm:w-14 flex items-center gap-1 pr-1 flex-shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full ${metric.dotColor} flex-shrink-0`} />
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate">
                  {metric.labelShort}
                </span>
              </div>

              {/* Cells - compact */}
              <div className="flex gap-px">
                {normalizedData.map((point) => {
                  const value = point[metric.key];
                  const max = maxValues[metric.key];
                  const intensityLevel = getIntensityLevel(value, max);
                  const colorClass = metric.colors[intensityLevel];

                  return (
                    <HeatmapCell
                      key={`${metric.key}-${point.hour}`}
                      hour={point.hour}
                      value={value}
                      colorClass={colorClass}
                      allValues={{
                        visits: point.visits,
                        forms: point.forms,
                        payments: point.payments,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Minimal legend */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/40">
          <div className="flex items-center gap-2">
            {METRICS.map((metric) => (
              <div key={metric.key} className="flex items-center gap-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${metric.dotColor}`} />
                <span className="text-[8px] text-slate-500">{metric.labelShort}</span>
              </div>
            ))}
          </div>
          <span className="text-[8px] text-slate-600">
            {totals.visits}v·{totals.forms}f·{totals.payments}p
          </span>
        </div>
      </div>
    </div>
  );
}
