import { useEffect, useRef, useState } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { CalendarClock, MousePointerClick, RotateCcw, Sun, Users } from "lucide-react";
import type { PageStats, StatsDay } from "../../../shared/api-types.js";
import { api, useApi } from "../../api.js";
import { Button } from "../../components/ui/button.js";
import { useConfirm } from "../../components/ui/dialog.js";
import { Segmented } from "../../components/ui/form.js";
import { Stat } from "../../components/ui/misc.js";
import { Card, CardHeader, Skeleton } from "../../components/ui/surface.js";
import { useAction } from "../../components/ui/toast.js";
import { useResolvedTheme } from "../../lib/theme.js";

type Range = 7 | 30 | 90;

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function Chart({ series }: { series: StatsDay[] }) {
  const container = useRef<HTMLDivElement>(null);
  // Redraw when light/dark mode changes so the chart picks up the new colors.
  const mode = useResolvedTheme();

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const [c1, c2, muted, border] = ["--color-chart-1", "--color-chart-2", "--color-muted", "--color-border"].map(cssVar);
    const x = series.map((d) => new Date(`${d.day}T00:00:00`).getTime() / 1000);
    const axis = { stroke: muted, grid: { stroke: border, width: 1 }, ticks: { show: false }, font: "12px system-ui" };
    const showPoints = series.length <= 30;

    const plot = new uPlot(
      {
        width: el.clientWidth,
        height: 260,
        legend: { show: false },
        cursor: { drag: { x: false, y: false }, points: { size: 8 } },
        scales: { y: { range: (_u, _min, max) => [0, Math.max(4, Math.ceil(max * 1.15))] } },
        axes: [
          {
            ...axis,
            grid: { show: false },
            incrs: [86400, 7 * 86400],
            values: (_u, ticks) => ticks.map((t) => new Date(t * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })),
          },
          { ...axis, size: 40, values: (_u, ticks) => ticks.map((t) => (Number.isInteger(t) ? String(t) : "")) },
        ],
        series: [
          {},
          { label: "Clicks", stroke: c1, width: 2, fill: `${c1}22`, points: { show: showPoints, size: 5, fill: c1 } },
          { label: "Unique visitors", stroke: c2, width: 2, points: { show: showPoints, size: 5, fill: c2 } },
        ],
      },
      [x, series.map((d) => d.clicks), series.map((d) => d.uniques)],
      el,
    );
    const resize = new ResizeObserver(() => plot.setSize({ width: el.clientWidth, height: 260 }));
    resize.observe(el);
    return () => {
      resize.disconnect();
      plot.destroy();
    };
  }, [series, mode]);

  return <div ref={container} className="w-full" />;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <span className="size-2.5 rounded-full" style={{ background: `var(${color})` }} />
      {label}
    </span>
  );
}

export function AnalyticsTab({ pageId }: { pageId: number }) {
  const [days, setDays] = useState<Range>(30);
  const stats = useApi<PageStats>(`/pages/${pageId}/stats?days=${days}`);
  const { busy, run } = useAction();
  const confirm = useConfirm();

  const reset = async () => {
    const ok = await confirm({
      title: "Reset all stats?",
      description: "All clicks and daily totals for this page are deleted. This can't be undone.",
      confirmLabel: "Reset stats",
      danger: true,
    });
    if (!ok) return;
    void run(async () => {
      await api("DELETE", `/pages/${pageId}/stats`);
      await stats.reload();
    }, "Stats reset");
  };

  const s = stats.data;
  const inRange = s?.series.reduce((sum, d) => sum + d.clicks, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {s ? (
          <>
            <Stat label="Total clicks" value={s.total.toLocaleString()} icon={<MousePointerClick />} hint="all time" />
            <Stat label="Today" value={s.today.toLocaleString()} icon={<Sun />} hint="clicks" />
            <Stat label="Unique today" value={s.uniquesToday.toLocaleString()} icon={<Users />} hint="visitors" />
            <Stat
              label="Last visit"
              value={<span className="text-lg">{s.lastVisit ? new Date(s.lastVisit).toLocaleDateString() : "—"}</span>}
              icon={<CalendarClock />}
              hint={s.lastVisit ? new Date(s.lastVisit).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "never"}
            />
          </>
        ) : (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        )}
      </div>

      <Card>
        <CardHeader
          title="Clicks per day"
          description={s ? `${inRange.toLocaleString()} clicks in the last ${days} days` : " "}
          actions={
            <Segmented
              ariaLabel="Time range"
              value={days}
              onChange={setDays}
              options={[
                { value: 7, label: "7d" },
                { value: 30, label: "30d" },
                { value: 90, label: "90d" },
              ]}
            />
          }
        />
        <div className="px-3 pt-4 pb-2">{s ? <Chart series={s.series} /> : <Skeleton className="mx-2 h-[260px]" />}</div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
          <div className="flex gap-4">
            <LegendDot color="--color-chart-1" label="Clicks" />
            <LegendDot color="--color-chart-2" label="Unique visitors" />
          </div>
          <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={() => void reset()} loading={busy} className="hover:text-danger">
            Reset stats
          </Button>
        </div>
      </Card>

      <p className="text-xs text-muted">
        Unique visitors are counted per day, without storing IP addresses. Individual clicks are kept for 90 days, daily totals forever.
      </p>
    </div>
  );
}
