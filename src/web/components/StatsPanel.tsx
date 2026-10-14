import { useEffect, useRef, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { PageStats, StatsDay } from "../../shared/api-types.js";
import { api, useApi } from "../api.js";
import { useAction } from "./ui.js";

const RANGES = [7, 30, 90] as const;

function Chart({ series }: { series: StatsDay[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const x = series.map((d) => new Date(`${d.day}T00:00:00`).getTime() / 1000);
    const axis = { stroke: "#9ca3af", grid: { stroke: "#1f2937" }, ticks: { stroke: "#1f2937" } };
    const plot = new uPlot(
      {
        width: el.clientWidth,
        height: 220,
        cursor: { drag: { x: false, y: false } },
        scales: { y: { range: (_u, _min, max) => [0, Math.max(4, Math.ceil(max * 1.1))] } },
        axes: [
          {
            ...axis,
            // One tick per day (or week), labelled with the date only.
            incrs: [86400, 7 * 86400],
            values: (_u, ticks) =>
              ticks.map((t) => new Date(t * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })),
          },
          { ...axis, values: (_u, ticks) => ticks.map((t) => (Number.isInteger(t) ? String(t) : "")) },
        ],
        series: [
          {},
          { label: "Clicks", stroke: "#22c55e", width: 2, fill: "rgba(34,197,94,0.12)", points: { show: series.length <= 30 } },
          { label: "Unique visitors", stroke: "#60a5fa", width: 2, points: { show: series.length <= 30 } },
        ],
      },
      [x, series.map((d) => d.clicks), series.map((d) => d.uniques)],
      el,
    );
    const resize = new ResizeObserver(() => plot.setSize({ width: el.clientWidth, height: 220 }));
    resize.observe(el);
    return () => {
      resize.disconnect();
      plot.destroy();
    };
  }, [series]);

  return <div ref={container} className="w-full" />;
}

export function StatsPanel({ pageId }: { pageId: number }) {
  const [days, setDays] = useState<(typeof RANGES)[number]>(7);
  const stats = useApi<PageStats>(`/pages/${pageId}/stats?days=${days}`);
  const { busy, run } = useAction();

  const reset = () => {
    if (!confirm("Delete all stats for this page?")) return;
    void run(async () => {
      await api("DELETE", `/pages/${pageId}/stats`);
      await stats.reload();
    }, "Stats reset");
  };

  const s = stats.data;
  const tiles = s
    ? [
        ["Total clicks", s.total],
        ["Clicks today", s.today],
        ["Unique visitors today", s.uniquesToday],
        ["Last visit", s.lastVisit ? new Date(s.lastVisit).toLocaleString() : "—"],
      ]
    : [];

  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2>Stats</h2>
        <div className="flex items-center gap-2">
          {RANGES.map((r) => (
            <button key={r} className={`btn py-1 ${r === days ? "" : "btn-secondary"}`} onClick={() => setDays(r)}>
              {r}d
            </button>
          ))}
          <button className="btn btn-danger py-1" onClick={reset} disabled={busy}>
            Reset
          </button>
        </div>
      </div>
      {s && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map(([label, value]) => (
              <div key={label} className="rounded bg-gray-900/60 p-3">
                <div className="text-xs text-gray-400 uppercase">{label}</div>
                <div className="text-lg font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
          <Chart series={s.series} />
          <p className="mt-2 text-xs text-gray-500">
            Unique visitors are counted per day. Individual clicks are kept for 90 days, daily totals forever.
          </p>
        </>
      )}
    </section>
  );
}
