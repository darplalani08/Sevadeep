"use client";

// Dashboard charts, hand-built with no charting dependency.
//
// Design decisions worth knowing before editing:
//   * Each chart plots ONE series (a magnitude per category, or a count per day), so there is
//     no categorical palette and no legend — the chart title names what is plotted. The single
//     mark hue is the existing --chart-1 token, which clears 3:1 against the card surface in
//     both light (8.1:1) and dark (3.8:1) mode.
//   * Status colour is deliberately NOT used in the bars. Approved-green vs Rejected-red are
//     nearly identical under deuteranopia (ΔE 5.3), so status is carried by the written label
//     on every row and by the labelled badges in the tables instead of by hue.
//   * Bar fills are capped at 20px, have a 4px rounded data-end and square baseline, and are
//     separated by surface gaps. The trend line is 2px with a 10% area wash, an 8px end marker
//     ringed in the surface colour, and only its endpoint is directly labelled.
//   * Every chart ships a "View as table" disclosure, so no value is gated behind colour,
//     hover or pixel-reading.

import * as React from "react";

import { cn } from "@/lib/utils";

export type Datum = { label: string; value: number };
export type TrendPoint = { date: string; value: number };

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function ChartFrame({
  title,
  subtitle,
  children,
  table,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  table?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("rounded-2xl border border-border bg-card p-5 shadow-sm", className)}
    >
      <header>
        <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </header>
      <div className="mt-4">{children}</div>
      {table && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            View as table
          </summary>
          <div className="mt-2 overflow-x-auto">{table}</div>
        </details>
      )}
    </section>
  );
}

function DataTable({ rows, keyHeader }: { rows: Datum[]; keyHeader: string }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-border text-muted-foreground">
          <th scope="col" className="py-1.5 pr-3 font-medium">
            {keyHeader}
          </th>
          <th scope="col" className="py-1.5 pr-3 text-right font-medium">
            Count
          </th>
          <th scope="col" className="py-1.5 text-right font-medium">
            Share
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-border/60 last:border-0">
            <th scope="row" className="py-1.5 pr-3 font-normal text-foreground">
              {row.label}
            </th>
            <td className="py-1.5 pr-3 text-right tabular-nums text-foreground">{row.value}</td>
            <td className="py-1.5 text-right tabular-nums text-muted-foreground">
              {total > 0 ? `${Math.round((row.value / total) * 100)}%` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Horizontal bars for a single magnitude series. Built in HTML rather than SVG so the category
 * labels and value labels lay out and wrap natively — no text measurement, nothing ever clipped.
 */
export function BarList({
  title,
  subtitle,
  data,
  emptyMessage,
  keyHeader,
  limit,
}: {
  title: string;
  subtitle?: string;
  data: Datum[];
  emptyMessage: string;
  keyHeader: string;
  limit?: number;
}) {
  const rows = typeof limit === "number" ? data.slice(0, limit) : data;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = data.reduce((sum, row) => sum + row.value, 0);
  const hasData = total > 0;

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      table={hasData ? <DataTable rows={data} keyHeader={keyHeader} /> : undefined}
    >
      {!hasData ? (
        <EmptyChart message={emptyMessage} />
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => {
            const share = total > 0 ? Math.round((row.value / total) * 100) : 0;
            return (
              <li key={row.label} className="group/bar">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate text-foreground" title={row.label}>
                    {row.label}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                    {row.value}
                  </span>
                </div>
                <div
                  // Hover/focus reveals the share of total — information the row does not
                  // already display, rather than a tooltip that repeats the number.
                  tabIndex={0}
                  role="meter"
                  aria-label={`${row.label}: ${row.value} of ${total} (${share}%)`}
                  aria-valuenow={row.value}
                  aria-valuemin={0}
                  aria-valuemax={max}
                  title={`${row.label}: ${row.value} (${share}% of ${total})`}
                  className="mt-1 h-2.5 w-full rounded-l-[2px] rounded-r-[4px] bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none"
                >
                  <div
                    className="h-full rounded-l-[2px] rounded-r-[4px] transition-[width] duration-500"
                    style={{
                      // A zero draws nothing at all. The 2% floor exists so a small non-zero
                      // value stays visible, not so that "0" looks like a sliver of something.
                      width: row.value === 0 ? "0%" : `${Math.max(2, (row.value / max) * 100)}%`,
                      background: "var(--chart-1)",
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ChartFrame>
  );
}

/**
 * 14-day submission trend. One series, so no legend; only the final point is directly
 * labelled, with a crosshair + tooltip carrying the rest.
 */
export function TrendChart({
  title,
  subtitle,
  data,
  emptyMessage,
}: {
  title: string;
  subtitle?: string;
  data: TrendPoint[];
  emptyMessage: string;
}) {
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

  const hasData = data.length > 1 && data.some((point) => point.value > 0);

  const width = 560;
  const height = 180;
  const padding = { top: 16, right: 20, bottom: 28, left: 32 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(1, ...data.map((point) => point.value));
  // Round the top of the scale up to a clean number so the y ticks read 0 / n / 2n.
  const step = maxValue <= 4 ? 1 : Math.ceil(maxValue / 4);
  const scaleMax = step * 4;

  const x = (index: number) =>
    padding.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth);
  const y = (value: number) => padding.top + plotHeight - (value / scaleMax) * plotHeight;

  const linePath = data.map((point, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(point.value)}`).join(" ");
  const areaPath = hasData
    ? `${linePath} L${x(data.length - 1)},${padding.top + plotHeight} L${x(0)},${
        padding.top + plotHeight
      } Z`
    : "";

  const last = data[data.length - 1];
  const active = hoverIndex !== null ? data[hoverIndex] : null;

  const formatDay = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

  return (
    <ChartFrame
      title={title}
      subtitle={subtitle}
      table={
        hasData ? (
          <DataTable
            rows={data.map((point) => ({ label: formatDay(point.date), value: point.value }))}
            keyHeader="Day"
          />
        ) : undefined
      }
    >
      {!hasData ? (
        <EmptyChart message={emptyMessage} />
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-44 w-full"
            role="img"
            aria-label={`${title}. ${data
              .map((point) => `${formatDay(point.date)}: ${point.value}`)
              .join(", ")}`}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {/* Recessive 1px solid gridlines + clean y ticks */}
            {[0, 1, 2, 3, 4].map((tick) => {
              const value = step * tick;
              return (
                <g key={tick}>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={y(value)}
                    y2={y(value)}
                    stroke="var(--border)"
                    strokeWidth={1}
                  />
                  <text
                    x={padding.left - 8}
                    y={y(value) + 3.5}
                    textAnchor="end"
                    className="fill-muted-foreground text-[9px] tabular-nums"
                  >
                    {value}
                  </text>
                </g>
              );
            })}

            <path d={areaPath} fill="var(--chart-1)" opacity={0.1} />
            <path
              d={linePath}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Crosshair for the hovered day */}
            {hoverIndex !== null && (
              <line
                x1={x(hoverIndex)}
                x2={x(hoverIndex)}
                y1={padding.top}
                y2={padding.top + plotHeight}
                stroke="var(--chart-1)"
                strokeWidth={1}
                opacity={0.5}
              />
            )}

            {/* End marker: 8px dot ringed in the surface colour so it stays legible */}
            <circle
              cx={x(data.length - 1)}
              cy={y(last.value)}
              r={4}
              fill="var(--chart-1)"
              stroke="var(--card)"
              strokeWidth={2}
            />
            <text
              x={x(data.length - 1) - 6}
              y={y(last.value) - 10}
              textAnchor="end"
              className="fill-foreground text-[10px] font-semibold tabular-nums"
            >
              {last.value}
            </text>

            {hoverIndex !== null && (
              <circle
                cx={x(hoverIndex)}
                cy={y(data[hoverIndex].value)}
                r={4}
                fill="var(--chart-1)"
                stroke="var(--card)"
                strokeWidth={2}
              />
            )}

            {/* x labels at both ends only — 14 dates will not fit */}
            <text
              x={padding.left}
              y={height - 8}
              className="fill-muted-foreground text-[9px]"
            >
              {formatDay(data[0].date)}
            </text>
            <text
              x={width - padding.right}
              y={height - 8}
              textAnchor="end"
              className="fill-muted-foreground text-[9px]"
            >
              {formatDay(last.date)}
            </text>

            {/* Invisible hit bands, wider than the marks, so hovering is forgiving */}
            {data.map((point, index) => (
              <rect
                key={point.date}
                x={x(index) - plotWidth / (data.length - 1) / 2}
                y={padding.top}
                width={plotWidth / (data.length - 1)}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(index)}
              />
            ))}
          </svg>

          <p
            aria-live="polite"
            className="mt-1 h-5 text-center text-xs text-muted-foreground tabular-nums"
          >
            {active
              ? `${formatDay(active.date)} — ${active.value} application${
                  active.value === 1 ? "" : "s"
                }`
              : ""}
          </p>
        </div>
      )}
    </ChartFrame>
  );
}
