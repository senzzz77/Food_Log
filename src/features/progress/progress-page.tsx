import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart as EChartsLineChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "lucide-react";
import { Navigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { getTrends } from "@/services/progress-service";
import { useAppStore } from "@/stores/app-store";
import { useProfileStore } from "@/stores/profile-store";

type Trends = { weights: Array<{ date: string; weightKg: number }>; calories: Array<{ date: string; calories: number }> };
echarts.use([BarChart, CanvasRenderer, GridComponent, EChartsLineChart, TooltipComponent]);

export function ProgressPage() {
  const token = useAppStore((state) => state.authToken);
  const profileId = useAppStore((state) => state.activeProfileId);
  const profile = useProfileStore((state) => state.profiles.find((item) => item.id === profileId));
  const [trends, setTrends] = useState<Trends>({ weights: [], calories: [] });
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!token || !profileId) return;
    let active = true;
    void getTrends(token, profileId).then((data) => { if (active) setTrends(data); }).catch((error: unknown) => { if (active) setMessage(error instanceof Error ? error.message : "无法读取进度数据。"); });
    return () => { active = false; };
  }, [profileId, token]);
  if (!profileId || !profile) return <Navigate to="/profiles" replace />;
  return <div className="mx-auto max-w-6xl"><PageHeader eyebrow={profile.displayName} title="进度" description="体重与摄入热量会在这里留下安静、连续的变化轨迹。" /><section className="panel rounded-md p-5 sm:p-7"><div className="mb-6 flex items-center gap-2"><span className="inline-flex size-8 items-center justify-center rounded-full bg-[#e5f1df] text-[#557e51] dark:bg-[#2d432e] dark:text-[#c9e2c4]"><LineChart size={16} /></span><div><h2 className="font-bold">近 90 天趋势</h2><p className="subtle-text mt-0.5 text-xs">绿色曲线为体重，暖色柱为每日摄入热量。</p></div></div><TrendChart trends={trends} /></section>{message && <p className="mt-5 border-l-2 border-[#5f7d6d] bg-[#eff6ef] px-3 py-2 text-sm text-[#315d47] dark:bg-[#203024] dark:text-[#bfdbbf]">{message}</p>}</div>;
}

function TrendChart({ trends }: { trends: Trends }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const dates = Array.from(new Set([...trends.weights.map((item) => item.date), ...trends.calories.map((item) => item.date)])).sort();
    const weightByDate = new Map(trends.weights.map((item) => [item.date, item.weightKg]));
    const calorieByDate = new Map(trends.calories.map((item) => [item.date, item.calories]));
    chart.setOption({ tooltip: { trigger: "axis" }, grid: { left: 44, right: 44, top: 24, bottom: 32 }, xAxis: { type: "category", data: dates, boundaryGap: false, axisLine: { lineStyle: { color: "#b8cbb6" } } }, yAxis: [{ type: "value", name: "kg", splitLine: { lineStyle: { color: "#edf2e9" } } }, { type: "value", name: "kcal", splitLine: { show: false } }], series: [{ name: "体重", type: "line", smooth: true, data: dates.map((date) => weightByDate.get(date) ?? null), symbolSize: 7, lineStyle: { color: "#5d9560", width: 2 }, itemStyle: { color: "#5d9560" } }, { name: "摄入热量", type: "bar", yAxisIndex: 1, data: dates.map((date) => calorieByDate.get(date) ?? null), itemStyle: { color: "#d28b63" }, barMaxWidth: 22 }] });
    const observer = new ResizeObserver(() => chart.resize()); observer.observe(ref.current);
    return () => { observer.disconnect(); chart.dispose(); };
  }, [trends]);
  return <div ref={ref} className="h-80 w-full" />;
}
